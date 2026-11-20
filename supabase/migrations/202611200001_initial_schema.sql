-- NextGen Avatar: Core Schema Migration (M1)
-- Covers: Profiles, RBAC Team Auth, Presenter Profiles, Dynamic Pricing & Quotes,
-- Orders & Credit Ledger, Chat & R2 Attachments, Video Review Versions, Notifications, Site CMS.

create extension if not exists pgcrypto;

-- 1. Enums
do $$ begin
  create type public.app_locale as enum ('en', 'zh');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'waiting_assets',
    'producing',
    'waiting_confirm',
    'revision',
    'approved',
    'completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.video_version_type as enum ('preview', 'final');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_sender_side as enum ('client', 'studio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method_type as enum ('card', 'apple', 'ach');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.credit_ledger_reason as enum (
    'purchase',
    'delivery_deduct',
    'admin_adjust',
    'refund'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quote_status as enum ('open', 'paid', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attachment_status as enum ('pending', 'ready', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_action as enum ('approved', 'revision_requested');
exception when duplicate_object then null; end $$;

-- Shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 2. User Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  company text not null default '',
  avatar_url text,
  preferred_locale public.app_locale not null default 'en',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3. RBAC Roles, Permissions & Internal Team Members (isolated from clients)
create table if not exists public.team_roles (
  id text primary key,
  name_zh text not null,
  name_en text not null,
  description_zh text not null default '',
  description_en text not null default '',
  locked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists team_roles_set_updated_at on public.team_roles;
create trigger team_roles_set_updated_at
  before update on public.team_roles
  for each row execute function public.set_updated_at();

create table if not exists public.role_permissions (
  role_id text not null references public.team_roles(id) on delete cascade,
  permission_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (role_id, permission_key)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  role_id text not null references public.team_roles(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists team_members_email_lower_idx
  on public.team_members (lower(email));

create index if not exists team_members_role_id_idx
  on public.team_members (role_id);

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

-- Auto-create profile and auto-link pre-provisioned team_member on auth signup
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locale public.app_locale := 'en';
  v_name text;
begin
  if (new.raw_user_meta_data ->> 'preferred_locale') = 'zh' then
    v_locale := 'zh';
  end if;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, email, full_name, avatar_url, preferred_locale)
  values (
    new.id,
    coalesce(new.email, ''),
    v_name,
    new.raw_user_meta_data ->> 'avatar_url',
    v_locale
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  -- Link pre-invited internal team member by email if not linked yet
  if new.email is not null then
    update public.team_members
    set user_id = new.id
    where lower(email) = lower(new.email)
      and user_id is null;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 4. Reusable Client Presenter Profiles
create table if not exists public.presenter_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  notes text not null default '',
  headshot_r2_key text,
  voice_sample_r2_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists presenter_profiles_client_idx
  on public.presenter_profiles (client_id);

drop trigger if exists presenter_profiles_set_updated_at on public.presenter_profiles;
create trigger presenter_profiles_set_updated_at
  before update on public.presenter_profiles
  for each row execute function public.set_updated_at();

-- 5. Dynamic Pricing: Plans, Add-ons & Custom Quotes (amounts in USD cents)
create table if not exists public.plans (
  id text primary key,
  name_zh text not null,
  name_en text not null,
  tag_zh text not null default '',
  tag_en text not null default '',
  video_count integer not null check (video_count > 0),
  price_cents integer not null check (price_cents > 0),
  original_price_cents integer check (original_price_cents is null or original_price_cents > 0),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create table if not exists public.addons (
  id text primary key,
  name_zh text not null,
  name_en text not null,
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists addons_set_updated_at on public.addons;
create trigger addons_set_updated_at
  before update on public.addons
  for each row execute function public.set_updated_at();

create table if not exists public.custom_quotes (
  id text primary key,
  client_email text,
  project_name text not null default '',
  video_count integer not null check (video_count > 0),
  amount_cents integer not null check (amount_cents > 0),
  status public.quote_status not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists custom_quotes_set_updated_at on public.custom_quotes;
create trigger custom_quotes_set_updated_at
  before update on public.custom_quotes
  for each row execute function public.set_updated_at();

-- 6. Orders & Credit Ledger
create table if not exists public.orders (
  id text primary key,
  client_id uuid not null references public.profiles(id) on delete restrict,
  presenter_profile_id uuid references public.presenter_profiles(id) on delete set null,
  title_zh text not null default '数字人视频制作',
  title_en text not null default 'Digital avatar video production',
  status public.order_status not null default 'waiting_assets',
  plan_id text references public.plans(id) on delete set null,
  custom_quote_id text references public.custom_quotes(id) on delete set null,
  addon_ids text[] not null default '{}',
  video_credits_total integer not null check (video_credits_total > 0),
  video_credits_used integer not null default 0 check (video_credits_used >= 0),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  payment_method public.payment_method_type not null default 'card',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  receipt_url text,
  assigned_member_id uuid references public.team_members(id) on delete set null,
  latest_revision_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists orders_client_idx on public.orders (client_id, created_at desc);
create index if not exists orders_assigned_idx on public.orders (assigned_member_id, status);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason public.credit_ledger_reason not null,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_ledger_client_idx
  on public.credit_ledger (client_id, created_at desc);
create index if not exists credit_ledger_order_idx
  on public.credit_ledger (order_id, created_at desc);

-- 7. Order Chat Messages & R2 File Attachments
create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete restrict,
  sender_side public.message_sender_side not null,
  body text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_messages_order_idx
  on public.order_messages (order_id, created_at asc);

create table if not exists public.order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  message_id uuid references public.order_messages(id) on delete set null,
  uploader_user_id uuid not null references auth.users(id) on delete restrict,
  r2_key text not null unique,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  status public.attachment_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_attachments_order_idx
  on public.order_attachments (order_id, created_at desc);
create index if not exists order_attachments_message_idx
  on public.order_attachments (message_id);

-- 8. Video Review Versions & Client Approval/Revision Logs
create table if not exists public.video_versions (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  version_code text not null,
  version_type public.video_version_type not null,
  r2_key text not null,
  file_name text not null,
  notes text not null default '',
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (order_id, version_code)
);

create index if not exists video_versions_order_idx
  on public.video_versions (order_id, created_at asc);

create table if not exists public.review_logs (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  version_id uuid not null references public.video_versions(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  action public.review_action not null,
  comment text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists review_logs_order_idx
  on public.review_logs (order_id, created_at desc);

-- 9. In-App & Email Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  order_id text references public.orders(id) on delete cascade,
  event_type text not null,
  title_zh text not null,
  title_en text not null,
  body_zh text not null default '',
  body_en text not null default '',
  is_read boolean not null default false,
  email_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_user_id, is_read, created_at desc);

-- 10. Bilingual Marketing Site CMS Content
create table if not exists public.site_content (
  id text not null default 'home',
  locale public.app_locale not null,
  hero_cta_label text not null default '',
  content_json jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (id, locale)
);

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

-- 11. Enable Realtime on Chat, Attachments, Orders & Notifications
do $$ begin
  alter publication supabase_realtime add table public.order_messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.order_attachments;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
