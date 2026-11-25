-- NextGen Avatar: Multi-Video Deliverables Within Single Order
-- Allows one order (e.g. 5-Pack / 15-Pack) to deliver multiple independent videos
-- with unlimited preview revisions per video item.

alter table public.video_versions
  add column if not exists item_index integer not null default 1 check (item_index >= 1),
  add column if not exists item_title text not null default '';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'video_versions_order_id_version_code_key'
      and conrelid = 'public.video_versions'::regclass
  ) then
    alter table public.video_versions
      drop constraint video_versions_order_id_version_code_key;
  end if;
end $$;

create unique index if not exists video_versions_order_item_code_uidx
  on public.video_versions (order_id, item_index, version_code);

create index if not exists video_versions_order_item_idx
  on public.video_versions (order_id, item_index, created_at asc);
