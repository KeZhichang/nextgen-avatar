-- NextGen Avatar: Private Cloud Storage Bucket & Order-Scoped RLS Policies
-- Bucket: order-media (private, max 500MB per file)
-- Path conventions:
--   orders/<order_id>/attachments/<uuid>-<safe_name>
--   orders/<order_id>/videos/<uuid>-<safe_name>

-- 1. Create private bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit)
values ('order-media', 'order-media', false, 524288000)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

-- 2. Strict RLS policies bound to public.can_access_order_workspace(order_id)
drop policy if exists "order_media_select_workspace" on storage.objects;
create policy "order_media_select_workspace"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'order-media'
    and (storage.foldername(name))[1] = 'orders'
    and public.can_access_order_workspace((storage.foldername(name))[2])
  );

drop policy if exists "order_media_insert_workspace" on storage.objects;
create policy "order_media_insert_workspace"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'order-media'
    and (storage.foldername(name))[1] = 'orders'
    and public.can_access_order_workspace((storage.foldername(name))[2])
  );

drop policy if exists "order_media_delete_owner_or_admin" on storage.objects;
create policy "order_media_delete_owner_or_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'order-media'
    and (
      owner = auth.uid()
      or public.has_team_permission('orders:view_all')
    )
  );

-- 3. Enable Realtime on video_versions so clients see new drafts instantly
do $$ begin
  alter publication supabase_realtime add table public.video_versions;
exception when duplicate_object then null; end $$;
