-- NextGen Avatar: Initial Seed Data (M1)
-- Safe to re-run (idempotent upserts).

-- 1. RBAC Team Roles
insert into public.team_roles (id, name_zh, name_en, description_zh, description_en, locked)
values
  ('admin', '管理员', 'Administrator', '拥有全部业务与系统权限（受保护，防止误删权限自锁）', 'Full access to all operations and system settings (locked)', true),
  ('lead', '制作主管', 'Production Lead', '负责排期派单、质量把控与成片最终交付，不涉及定价与系统管理', 'Manages assignments, reviews, and final deliveries', false),
  ('producer', '制作人员', 'Producer', '仅处理被分配的订单、下载素材、与客户沟通并上传初稿', 'Works only on assigned orders, materials, chat, and drafts', false)
on conflict (id) do update
  set name_zh = excluded.name_zh,
      name_en = excluded.name_en,
      description_zh = excluded.description_zh,
      description_en = excluded.description_en,
      locked = excluded.locked;

-- 2. Default Role Permission Matrix
insert into public.role_permissions (role_id, permission_key)
values
  -- Admin (all permissions)
  ('admin', 'orders:view_all'),
  ('admin', 'orders:assign'),
  ('admin', 'production:work'),
  ('admin', 'production:deliver_final'),
  ('admin', 'settings:pricing'),
  ('admin', 'settings:quotes'),
  ('admin', 'settings:clients'),
  ('admin', 'team:manage'),
  -- Production Lead
  ('lead', 'orders:view_all'),
  ('lead', 'orders:assign'),
  ('lead', 'production:work'),
  ('lead', 'production:deliver_final'),
  ('lead', 'settings:clients'),
  -- Producer (least privilege)
  ('producer', 'production:work')
on conflict (role_id, permission_key) do nothing;

-- 3. Default Packages (USD cents)
insert into public.plans (
  id,
  name_zh,
  name_en,
  tag_zh,
  tag_en,
  video_count,
  price_cents,
  original_price_cents,
  is_published,
  sort_order
)
values
  ('pro', '专业 5 条套餐', 'Pro 5-Pack', '最受欢迎', 'Most Popular', 5, 29900, 34900, true, 1),
  ('trial', '新用户尝鲜单条', 'Starter Trial', '首单尝鲜', 'Starter', 1, 5900, null, true, 2),
  ('ent', '企业 15 条套餐', 'Enterprise 15-Pack', '批量优惠', 'Best Value', 15, 76500, 89900, true, 3)
on conflict (id) do update
  set name_zh = excluded.name_zh,
      name_en = excluded.name_en,
      tag_zh = excluded.tag_zh,
      tag_en = excluded.tag_en,
      video_count = excluded.video_count,
      price_cents = excluded.price_cents,
      original_price_cents = excluded.original_price_cents,
      sort_order = excluded.sort_order;

-- 4. Default Optional Add-ons (USD cents)
insert into public.addons (id, name_zh, name_en, price_cents, is_active, sort_order)
values
  ('script', '额外口播脚本', 'Additional script', 4900, true, 1),
  ('duration', '延长视频时长', 'Extended duration', 7900, true, 2)
on conflict (id) do update
  set name_zh = excluded.name_zh,
      name_en = excluded.name_en,
      price_cents = excluded.price_cents,
      sort_order = excluded.sort_order;

-- 5. Initial Bilingual Marketing Site Content
insert into public.site_content (id, locale, hero_cta_label, content_json)
values
  (
    'home',
    'en',
    'Start Production',
    '{"headline": "Done-for-you digital avatar videos.", "faqs": []}'::jsonb
  ),
  (
    'home',
    'zh',
    '开始制作',
    '{"headline": "专属数字人短视频人工精制服务", "faqs": []}'::jsonb
  )
on conflict (id, locale) do nothing;

-- 6. Bootstrap First Administrator (replace email before running in production!)
-- When this email signs up via Supabase Auth, the on_auth_user_created trigger
-- automatically links team_members.user_id to auth.users.id.
insert into public.team_members (name, email, role_id, active)
values ('Alex', 'alex@nextgenstudio.io', 'admin', true)
on conflict ((lower(email))) do nothing;
