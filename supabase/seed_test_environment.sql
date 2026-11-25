-- ============================================================================
-- NextGen Avatar: 测试环境一键升级 + 真实数据库测试数据脚本
-- 使用方式：在测试 Supabase 控制台 -> SQL Editor 中整段粘贴并点击 Run。
-- 特点：完全幂等（可安全重复执行），会一次性完成：
--   1. 补齐最新表结构迁移（多条视频字段 + 续费价字段 + 官网 7 档套餐 & 加项）
--   2. 创建 3 个可直接真实登录 Supabase Auth 的测试账号（统一密码: NextGen2026!）
--      - 管理员: admin@nextgenavatar.test
--      - 制作师: producer@nextgenavatar.test
--      - 客户:   client@nextgenavatar.test
--   3. 写入覆盖全流程的 4 笔真实订单、聊天消息、预览/交付版本、2 笔定制报价单与通知
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. 补齐缺失迁移：多条视频交付字段 (202611240001)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. 补齐缺失迁移：官网 7 档标准套餐与续费月价 (202611250001)
-- ----------------------------------------------------------------------------
alter table public.plans
  add column if not exists renewal_price_cents integer
  check (renewal_price_cents is null or renewal_price_cents >= 0);

insert into public.plans (
  id, name_zh, name_en, tag_zh, tag_en, video_count, price_cents, original_price_cents, renewal_price_cents, is_published, sort_order
) values
  ('trial',        '体验视频（单条）',          'Trial Video (1 video)',            '首单尝鲜', 'Starter Trial', 1,  5900,  null, null,  true, 1),
  ('presenter-5',  'AI 标准版口播 · 5 条套餐',  'AI Standard Presenter · 5 Videos', '最受欢迎', 'Most Popular',  5,  45900, null, 35900, true, 2),
  ('presenter-10', 'AI 标准版口播 · 10 条套餐', 'AI Standard Presenter · 10 Videos','标准版',   'Standard',      10, 75900, null, 65900, true, 3),
  ('presenter-15', 'AI 标准版口播 · 15 条套餐', 'AI Standard Presenter · 15 Videos','批量优惠', 'Best Value',    15, 99900, null, 89900, true, 4),
  ('cinematic-4',  'AI 电影版口播 · 4 条套餐',  'AI Cinematic Presenter · 4 Videos','电影版',   'Cinematic',     4,  45900, null, 35900, true, 5),
  ('cinematic-6',  'AI 电影版口播 · 6 条套餐',  'AI Cinematic Presenter · 6 Videos','电影版',   'Cinematic',     6,  59900, null, 49900, true, 6),
  ('cinematic-8',  'AI 电影版口播 · 8 条套餐',  'AI Cinematic Presenter · 8 Videos','电影版',   'Cinematic',     8,  73900, null, 63900, true, 7)
on conflict (id) do update set
  name_zh = excluded.name_zh,
  name_en = excluded.name_en,
  tag_zh = excluded.tag_zh,
  tag_en = excluded.tag_en,
  video_count = excluded.video_count,
  price_cents = excluded.price_cents,
  original_price_cents = excluded.original_price_cents,
  renewal_price_cents = excluded.renewal_price_cents,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

update public.plans
set is_published = false, updated_at = timezone('utc', now())
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
  updated_at = timezone('utc', now());

-- 确保 RBAC 角色与权限矩阵完整
insert into public.team_roles (id, name_zh, name_en, description_zh, description_en, locked)
values
  ('admin', '管理员', 'Administrator', '拥有全部业务与系统权限（受保护，防止误删权限自锁）', 'Full access to all operations and system settings (locked)', true),
  ('lead', '制作主管', 'Production Lead', '负责排期派单、质量把控与成片最终交付，不涉及定价与系统管理', 'Manages assignments, reviews, and final deliveries', false),
  ('producer', '制作人员', 'Producer', '仅处理被分配的订单、下载素材、与客户沟通并上传初稿', 'Works only on assigned orders, materials, chat, and drafts', false)
on conflict (id) do nothing;

insert into public.role_permissions (role_id, permission_key) values
  ('admin', 'orders:view_all'),
  ('admin', 'orders:assign'),
  ('admin', 'production:work'),
  ('admin', 'production:deliver_final'),
  ('admin', 'settings:pricing'),
  ('admin', 'settings:quotes'),
  ('admin', 'settings:clients'),
  ('admin', 'team:manage'),
  ('lead', 'orders:view_all'),
  ('lead', 'orders:assign'),
  ('lead', 'production:work'),
  ('lead', 'production:deliver_final'),
  ('lead', 'settings:clients'),
  ('producer', 'production:work')
on conflict (role_id, permission_key) do nothing;

-- ----------------------------------------------------------------------------
-- 3. 创建真实可用的测试账号（密码统一为 NextGen2026!）+ 真实业务测试数据
-- ----------------------------------------------------------------------------
do $$
declare
  v_admin_uid uuid;
  v_producer_uid uuid;
  v_client_uid uuid;
  v_admin_member_id uuid;
  v_producer_member_id uuid;
  v_pw_hash text := crypt('NextGen2026!', gen_salt('bf'));
begin
  -- 3.1 预置团队成员邮箱（触发器在创建 auth.users 时会自动绑定 user_id）
  insert into public.team_members (name, email, role_id, active)
  values
    ('Alex Chen', 'admin@nextgenavatar.test', 'admin', true),
    ('Chloe Rivera', 'producer@nextgenavatar.test', 'producer', true)
  on conflict ((lower(email))) do update
    set active = true;

  -- 3.2 创建/复用 管理员 Auth 账号
  select id into v_admin_uid from auth.users where lower(email) = 'admin@nextgenavatar.test' limit 1;
  if v_admin_uid is null then
    v_admin_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_admin_uid, 'authenticated', 'authenticated',
      'admin@nextgenavatar.test', v_pw_hash,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Alex Chen"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_admin_uid, v_admin_uid::text,
      jsonb_build_object('sub', v_admin_uid::text, 'email', 'admin@nextgenavatar.test'),
      'email', now(), now(), now()
    );
  end if;

  -- 3.3 创建/复用 制作师 Auth 账号
  select id into v_producer_uid from auth.users where lower(email) = 'producer@nextgenavatar.test' limit 1;
  if v_producer_uid is null then
    v_producer_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_producer_uid, 'authenticated', 'authenticated',
      'producer@nextgenavatar.test', v_pw_hash,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Chloe Rivera"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_producer_uid, v_producer_uid::text,
      jsonb_build_object('sub', v_producer_uid::text, 'email', 'producer@nextgenavatar.test'),
      'email', now(), now(), now()
    );
  end if;

  -- 3.4 创建/复用 客户 Auth 账号
  select id into v_client_uid from auth.users where lower(email) = 'client@nextgenavatar.test' limit 1;
  if v_client_uid is null then
    v_client_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_client_uid, 'authenticated', 'authenticated',
      'client@nextgenavatar.test', v_pw_hash,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Sarah Lin"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_client_uid, v_client_uid::text,
      jsonb_build_object('sub', v_client_uid::text, 'email', 'client@nextgenavatar.test'),
      'email', now(), now(), now()
    );
  end if;

  -- 确保 profiles 资料完整
  update public.profiles
  set full_name = 'Sarah Lin', company = 'Northstar Health'
  where id = v_client_uid;

  update public.profiles
  set full_name = 'Alex Chen', company = '2301 Pictures'
  where id = v_admin_uid;

  update public.profiles
  set full_name = 'Chloe Rivera', company = '2301 Pictures'
  where id = v_producer_uid;

  -- 确保 team_members 已准确绑定 user_id
  update public.team_members set user_id = v_admin_uid where lower(email) = 'admin@nextgenavatar.test';
  update public.team_members set user_id = v_producer_uid where lower(email) = 'producer@nextgenavatar.test';

  select id into v_admin_member_id from public.team_members where lower(email) = 'admin@nextgenavatar.test' limit 1;
  select id into v_producer_member_id from public.team_members where lower(email) = 'producer@nextgenavatar.test' limit 1;

  -- 3.5 写入 2 笔真实定制报价单
  insert into public.custom_quotes (
    id, client_email, project_name, video_count, amount_cents, status, created_by
  ) values
    ('QUOTE-9021', 'client@nextgenavatar.test', 'Cinematic Custom · Q4 Brand Campaign', 10, 125000, 'open', v_admin_uid),
    ('QUOTE-8842', 'client@nextgenavatar.test', 'Apex Launch Commercial Pack', 6, 89000, 'paid', v_admin_uid)
  on conflict (id) do nothing;

  -- 3.6 写入 4 笔覆盖全流程的真实测试订单
  insert into public.orders (
    id, client_id, title_zh, title_en, status, plan_id,
    video_credits_total, video_credits_used, amount_cents, currency,
    payment_method, assigned_member_id
  ) values
    (
      'NGA-20261125-WAIT', v_client_uid,
      '春季新品口播系列 · 5 条', 'Spring Launch Explainer Pack · 5 Videos',
      'waiting_assets', 'presenter-5', 5, 0, 45900, 'usd', 'card', null
    ),
    (
      'NGA-20261125-PROD', v_client_uid,
      '品牌电影感宣传片 · 4 条', 'Cinematic Brand Film · 4 Videos',
      'producing', 'cinematic-4', 4, 0, 45900, 'usd', 'apple', v_producer_member_id
    ),
    (
      'NGA-20261125-REVW', v_client_uid,
      '医疗健康科普口播 · 10 条', 'Northstar Patient FAQ Series · 10 Videos',
      'waiting_confirm', 'presenter-10', 10, 0, 75900, 'usd', 'card', v_producer_member_id
    ),
    (
      'NGA-20261125-DONE', v_client_uid,
      '数字人首单体验样片', 'Digital Presenter Trial Video',
      'completed', 'trial', 1, 1, 5900, 'usd', 'card', v_admin_member_id
    )
  on conflict (id) do nothing;

  -- 3.7 写入真实聊天记录（幂等：仅当该订单暂无消息时写入）
  if not exists (select 1 from public.order_messages where order_id = 'NGA-20261125-PROD') then
    insert into public.order_messages (order_id, sender_user_id, sender_side, body) values
      ('NGA-20261125-PROD', v_client_uid, 'client', 'Hi team, we want a warm studio lighting look matching our Q4 brand guidelines.'),
      ('NGA-20261125-PROD', v_producer_uid, 'studio', 'Got it! Materials look clean and crisp. We are currently rendering the first cinematic preview.');
  end if;

  if not exists (select 1 from public.order_messages where order_id = 'NGA-20261125-REVW') then
    insert into public.order_messages (order_id, sender_user_id, sender_side, body) values
      ('NGA-20261125-REVW', v_client_uid, 'client', 'Uploaded our presenter reference video and voice sample. Please keep captions crisp and clean.'),
      ('NGA-20261125-REVW', v_producer_uid, 'studio', 'Initial draft v1 is now ready for your online review. Let us know if you would like any pacing tweaks!');
  end if;

  -- 3.8 写入真实视频版本记录（使用静态可播放示例 MP4 方便直接在线预览，后续上传的新版本将直传 R2）
  insert into public.video_versions (
    order_id, item_index, item_title, version_code, version_type, r2_key, file_name, notes, uploaded_by
  ) values
    (
      'NGA-20261125-REVW', 1, 'Episode 1 · Clinic Welcome', 'v1', 'preview',
      '/marketing/assets/media/6a985fcdcf28d63365089e91.mp4',
      'Northstar_Ep1_v1_preview.mp4',
      '初稿 v1 已完成口型同步与双语字幕，请审片确认。',
      v_producer_uid
    ),
    (
      'NGA-20261125-DONE', 1, 'Trial Digital Presenter', 'final', 'final',
      '/marketing/assets/media/6a985fcdcf28d63365089e91.mp4',
      'Northstar_Trial_1080P_Final.mp4',
      '1080P 正式成片已交付。',
      v_admin_uid
    )
  on conflict (order_id, item_index, version_code) do nothing;

  -- 3.9 写入真实消息通知（用于验证铃铛未读红点与已读持久化）
  if not exists (select 1 from public.notifications where recipient_user_id = v_client_uid and order_id = 'NGA-20261125-REVW') then
    insert into public.notifications (
      recipient_user_id, order_id, event_type, title_zh, title_en, body_zh, body_en, is_read
    ) values
      (
        v_client_uid, 'NGA-20261125-REVW', 'draft_ready',
        '新预览稿 v1 已上传，请在线审片', 'Preview v1 is ready for review',
        '医疗健康科普口播 (#NGA-20261125-REVW) 已上传初稿，点击前往确认或提出修改意见。',
        'Northstar Patient FAQ Series (#NGA-20261125-REVW) has a new preview waiting for your review.',
        false
      ),
      (
        v_client_uid, 'NGA-20261125-WAIT', 'order_created',
        '新订单已创建，请上传制作素材', 'Order created — upload materials to begin',
        '春季新品口播系列 (#NGA-20261125-WAIT) 正在等待上传出镜素材与台词。',
        'Spring Launch Explainer Pack (#NGA-20261125-WAIT) is waiting for presenter assets.',
        false
      );
  end if;
end $$;
