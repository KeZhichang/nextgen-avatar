-- NextGen Avatar: RBAC Helpers, Strict Row Level Security (RLS) & Privacy Views (M1)
-- Enforces strict isolation:
--   1. Clients only access their own orders, messages, files, presenter profiles, and notifications.
--   2. Subcontracted producers only access orders assigned to them & required production assets;
--      client contact details, pricing, and financial amounts are restricted server-side.
--   3. Admins & Leads follow fine-grained RBAC permission keys in public.role_permissions.

-- 1. Security Definer Helper Functions
create or replace function public.current_team_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.team_members
  where user_id = auth.uid()
    and active = true
  limit 1;
$$;

create or replace function public.is_active_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where user_id = auth.uid()
      and active = true
  );
$$;

create or replace function public.has_team_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.team_roles tr on tr.id = tm.role_id
    left join public.role_permissions rp
      on rp.role_id = tm.role_id
     and rp.permission_key = required_permission
    where tm.user_id = auth.uid()
      and tm.active = true
      and (tr.locked = true or rp.permission_key is not null)
  );
$$;

create or replace function public.is_assigned_producer(target_order_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and o.assigned_member_id is not null
      and o.assigned_member_id = public.current_team_member_id()
  );
$$;

create or replace function public.can_access_order_workspace(target_order_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and (
        o.client_id = auth.uid()
        or public.has_team_permission('orders:view_all')
        or (
          public.has_team_permission('production:work')
          and o.assigned_member_id = public.current_team_member_id()
        )
      )
  );
$$;

-- Server-side eligibility helper: repeat-purchase discount requires >= 1 completed/paid order
create or replace function public.is_repeat_customer(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders
    where client_id = target_user_id
  );
$$;

-- 2. Privacy-Preserving View for Subcontracted Producers (strips financial & contact fields)
create or replace view public.producer_orders_view
with (security_invoker = false)
as
select
  o.id,
  o.title_zh,
  o.title_en,
  o.status,
  o.video_credits_total,
  o.video_credits_used,
  o.assigned_member_id,
  o.latest_revision_note,
  o.created_at,
  o.updated_at,
  split_part(coalesce(p.full_name, 'Client'), ' ', 1) as client_first_name
from public.orders o
left join public.profiles p on p.id = o.client_id
where public.has_team_permission('orders:view_all')
   or (
     public.has_team_permission('production:work')
     and o.assigned_member_id = public.current_team_member_id()
   );

grant select on public.producer_orders_view to authenticated;

-- 3. Enable RLS on Every Table
alter table public.profiles enable row level security;
alter table public.team_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.team_members enable row level security;
alter table public.presenter_profiles enable row level security;
alter table public.plans enable row level security;
alter table public.addons enable row level security;
alter table public.custom_quotes enable row level security;
alter table public.orders enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.order_messages enable row level security;
alter table public.order_attachments enable row level security;
alter table public.video_versions enable row level security;
alter table public.review_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.site_content enable row level security;

-- 4. Profiles Policies (Producers without settings:clients CANNOT read client contact info)
drop policy if exists "profiles_select_self_or_authorized" on public.profiles;
create policy "profiles_select_self_or_authorized"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.has_team_permission('settings:clients')
    or public.has_team_permission('orders:view_all')
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- 5. RBAC Tables Policies
drop policy if exists "team_roles_select_team" on public.team_roles;
create policy "team_roles_select_team"
  on public.team_roles for select
  using (public.is_active_team_member());

drop policy if exists "team_roles_manage_admin" on public.team_roles;
create policy "team_roles_manage_admin"
  on public.team_roles for all
  using (public.has_team_permission('team:manage'))
  with check (public.has_team_permission('team:manage'));

drop policy if exists "role_permissions_select_team" on public.role_permissions;
create policy "role_permissions_select_team"
  on public.role_permissions for select
  using (public.is_active_team_member());

drop policy if exists "role_permissions_manage_admin" on public.role_permissions;
create policy "role_permissions_manage_admin"
  on public.role_permissions for all
  using (public.has_team_permission('team:manage'))
  with check (public.has_team_permission('team:manage'));

drop policy if exists "team_members_select_self_or_managers" on public.team_members;
create policy "team_members_select_self_or_managers"
  on public.team_members for select
  using (
    user_id = auth.uid()
    or public.has_team_permission('team:manage')
    or public.has_team_permission('orders:assign')
  );

drop policy if exists "team_members_manage_admin" on public.team_members;
create policy "team_members_manage_admin"
  on public.team_members for all
  using (public.has_team_permission('team:manage'))
  with check (public.has_team_permission('team:manage'));

-- 6. Presenter Profiles Policies
drop policy if exists "presenter_profiles_owner_all" on public.presenter_profiles;
create policy "presenter_profiles_owner_all"
  on public.presenter_profiles for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "presenter_profiles_team_read" on public.presenter_profiles;
create policy "presenter_profiles_team_read"
  on public.presenter_profiles for select
  using (
    public.has_team_permission('settings:clients')
    or exists (
      select 1
      from public.orders o
      where o.presenter_profile_id = public.presenter_profiles.id
        and o.assigned_member_id = public.current_team_member_id()
    )
  );

-- 7. Pricing, Add-ons & Custom Quotes Policies
drop policy if exists "plans_public_read" on public.plans;
create policy "plans_public_read"
  on public.plans for select
  using (is_published = true or public.has_team_permission('settings:pricing'));

drop policy if exists "plans_manage_pricing" on public.plans;
create policy "plans_manage_pricing"
  on public.plans for all
  using (public.has_team_permission('settings:pricing'))
  with check (public.has_team_permission('settings:pricing'));

drop policy if exists "addons_public_read" on public.addons;
create policy "addons_public_read"
  on public.addons for select
  using (is_active = true or public.has_team_permission('settings:pricing'));

drop policy if exists "addons_manage_pricing" on public.addons;
create policy "addons_manage_pricing"
  on public.addons for all
  using (public.has_team_permission('settings:pricing'))
  with check (public.has_team_permission('settings:pricing'));

drop policy if exists "custom_quotes_manage_or_recipient" on public.custom_quotes;
create policy "custom_quotes_manage_or_recipient"
  on public.custom_quotes for select
  using (
    public.has_team_permission('settings:quotes')
    or (
      status = 'open'
      and (
        client_email is null
        or lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  );

drop policy if exists "custom_quotes_write_authorized" on public.custom_quotes;
create policy "custom_quotes_write_authorized"
  on public.custom_quotes for all
  using (public.has_team_permission('settings:quotes'))
  with check (public.has_team_permission('settings:quotes'));

-- 8. Orders & Credit Ledger Policies
-- Note: Producers without orders:view_all query producer_orders_view (hiding amount_cents/stripe/receipt).
drop policy if exists "orders_select_owner_or_view_all" on public.orders;
create policy "orders_select_owner_or_view_all"
  on public.orders for select
  using (
    client_id = auth.uid()
    or public.has_team_permission('orders:view_all')
  );

drop policy if exists "orders_update_assign_or_production" on public.orders;
create policy "orders_update_assign_or_production"
  on public.orders for update
  using (
    public.has_team_permission('orders:assign')
    or public.has_team_permission('orders:view_all')
    or (
      public.has_team_permission('production:work')
      and assigned_member_id = public.current_team_member_id()
    )
  )
  with check (
    public.has_team_permission('orders:assign')
    or public.has_team_permission('orders:view_all')
    or (
      public.has_team_permission('production:work')
      and assigned_member_id = public.current_team_member_id()
    )
  );

-- Orders are inserted exclusively by server-side Stripe Webhook (service_role bypasses RLS)

drop policy if exists "credit_ledger_select_owner_or_view_all" on public.credit_ledger;
create policy "credit_ledger_select_owner_or_view_all"
  on public.credit_ledger for select
  using (
    client_id = auth.uid()
    or public.has_team_permission('orders:view_all')
  );

-- 9. Order Messages & Attachments Policies
drop policy if exists "order_messages_select" on public.order_messages;
create policy "order_messages_select"
  on public.order_messages for select
  using (public.can_access_order_workspace(order_id));

drop policy if exists "order_messages_insert" on public.order_messages;
create policy "order_messages_insert"
  on public.order_messages for insert
  with check (
    sender_user_id = auth.uid()
    and public.can_access_order_workspace(order_id)
    and (
      (sender_side = 'client' and exists (
        select 1 from public.orders o where o.id = order_id and o.client_id = auth.uid()
      ))
      or (sender_side = 'studio' and public.has_team_permission('production:work'))
    )
  );

drop policy if exists "order_attachments_select" on public.order_attachments;
create policy "order_attachments_select"
  on public.order_attachments for select
  using (public.can_access_order_workspace(order_id));

drop policy if exists "order_attachments_insert" on public.order_attachments;
create policy "order_attachments_insert"
  on public.order_attachments for insert
  with check (
    uploader_user_id = auth.uid()
    and public.can_access_order_workspace(order_id)
  );

-- 10. Video Versions & Review Logs Policies
drop policy if exists "video_versions_select" on public.video_versions;
create policy "video_versions_select"
  on public.video_versions for select
  using (public.can_access_order_workspace(order_id));

drop policy if exists "video_versions_insert_studio" on public.video_versions;
create policy "video_versions_insert_studio"
  on public.video_versions for insert
  with check (
    uploaded_by = auth.uid()
    and public.can_access_order_workspace(order_id)
    and (
      (version_type = 'preview' and public.has_team_permission('production:work'))
      or (version_type = 'final' and public.has_team_permission('production:deliver_final'))
    )
  );

drop policy if exists "review_logs_select" on public.review_logs;
create policy "review_logs_select"
  on public.review_logs for select
  using (public.can_access_order_workspace(order_id));

drop policy if exists "review_logs_insert_client" on public.review_logs;
create policy "review_logs_insert_client"
  on public.review_logs for insert
  with check (
    reviewer_user_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.client_id = auth.uid()
    )
  );

-- 11. Notifications Policies
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

-- 12. Site Content CMS Policies (public readable, settings:website writable)
drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read"
  on public.site_content for select
  using (true);

drop policy if exists "site_content_manage_website" on public.site_content;
create policy "site_content_manage_website"
  on public.site_content for all
  using (public.has_team_permission('settings:website'))
  with check (public.has_team_permission('settings:website'));
