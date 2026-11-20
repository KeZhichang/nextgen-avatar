-- NextGen Avatar: Client Workflow RLS Policies & Message Metadata (M2/M3)
-- Enables full end-to-end client & studio testing against Supabase before Stripe Webhook goes live.

-- 1. Add metadata jsonb to order_messages for embedded video version cards
alter table public.order_messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2. Allow authenticated clients to update their own order title / review status
drop policy if exists "orders_update_client_own" on public.orders;
create policy "orders_update_client_own"
  on public.orders for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- 3. Allow authenticated clients to insert orders in test/sandbox mode
--    (Drop this policy when switching exclusively to server-side Stripe Webhook in production)
drop policy if exists "orders_insert_client_test" on public.orders;
create policy "orders_insert_client_test"
  on public.orders for insert
  with check (client_id = auth.uid());

-- 4. Allow team members with production:work to insert notifications for clients
drop policy if exists "notifications_insert_authenticated" on public.notifications;
create policy "notifications_insert_authenticated"
  on public.notifications for insert
  with check (
    recipient_user_id = auth.uid()
    or public.is_active_team_member()
  );

-- 5. Ensure any pre-created auth user matching team_members.email is linked
update public.team_members tm
set user_id = u.id
from auth.users u
where tm.user_id is null
  and lower(tm.email) = lower(u.email);
