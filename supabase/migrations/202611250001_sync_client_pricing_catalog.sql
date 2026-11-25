-- Sync standard package catalog & add-ons to match NextGen Avatar marketing site pricing
-- Safe & idempotent: keeps legacy plan rows (pro/ent) unpublished so existing orders never break FK references

insert into public.plans (
  id, name_zh, name_en, tag_zh, tag_en, video_count, price_cents, original_price_cents, is_published, sort_order
) values
  ('trial',        '体验视频（单条）',          'Trial Video (1 video)',            '首单尝鲜', 'Starter Trial', 1,  5900,  null, true, 1),
  ('presenter-5',  'AI 标准版口播 · 5 条套餐',  'AI Standard Presenter · 5 Videos', '最受欢迎', 'Most Popular',  5,  45900, null, true, 2),
  ('presenter-10', 'AI 标准版口播 · 10 条套餐', 'AI Standard Presenter · 10 Videos','标准版',   'Standard',      10, 75900, null, true, 3),
  ('presenter-15', 'AI 标准版口播 · 15 条套餐', 'AI Standard Presenter · 15 Videos','批量优惠', 'Best Value',    15, 99900, null, true, 4),
  ('cinematic-4',  'AI 电影版口播 · 4 条套餐',  'AI Cinematic Presenter · 4 Videos','电影版',   'Cinematic',     4,  45900, null, true, 5),
  ('cinematic-6',  'AI 电影版口播 · 6 条套餐',  'AI Cinematic Presenter · 6 Videos','电影版',   'Cinematic',     6,  59900, null, true, 6),
  ('cinematic-8',  'AI 电影版口播 · 8 条套餐',  'AI Cinematic Presenter · 8 Videos','电影版',   'Cinematic',     8,  73900, null, true, 7)
on conflict (id) do update set
  name_zh = excluded.name_zh,
  name_en = excluded.name_en,
  tag_zh = excluded.tag_zh,
  tag_en = excluded.tag_en,
  video_count = excluded.video_count,
  price_cents = excluded.price_cents,
  original_price_cents = excluded.original_price_cents,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.plans
set is_published = false, updated_at = now()
where id in ('pro', 'ent');

insert into public.addons (
  id, name_zh, name_en, price_cents, is_active, sort_order
) values
  ('script',   '定制口播脚本撰写',      'Custom script copywriting', 5000, true, 1),
  ('duration', '单条延长时长 (+30 秒)', 'Extra runtime (+30 seconds)', 2500, true, 2)
on conflict (id) do update set
  name_zh = excluded.name_zh,
  name_en = excluded.name_en,
  price_cents = excluded.price_cents,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
