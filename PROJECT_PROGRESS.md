# NextGen Avatar 项目进度与验收总表

> 更新日期：2026-11-25  
> 当前分支状态：
> - 线上稳定版：`main`（已部署至 https://nextgen-avatar.vercel.app）
> - 开发验收版：`feat/multi-video-r2-prod`（包含全部最新业务与接入能力，待本地验收后合并发布）
> - 客户营销官网参考仓：`../client-landing-ref`（Nuxt 4，已拉取并可在本地 `http://127.0.0.1:3100` 预览）

---

## 一、已完成的工作

| 模块 | 完成内容 | 所在分支 | 当前状态 |
| :--- | :--- | :--- | :--- |
| **登录与身份体系** | 接入 Supabase Auth（邮箱密码 + Google OAuth 一键登录 + 头像/姓名自动同步与回填）；保留内置演示账号便于展示（可通过 `VITE_HIDE_SAMPLE_DATA=true` 上线关闭） | `main` | ✅ 已上线 |
| **客户端工作台 / 账单 / 个人资料** | 极简 SaaS 工作台（精炼抬头 + 按需待办条 + 3 列订单表 + 成片画廊）、无汇总 5 列 Stripe 风格账单页、品牌封面+叠层头像一体化个人资料卡、双语切换（默认英文 `/en`） | `main` | ✅ 已上线 |
| **管理端后台 SaaS 化重构** | 订单管理列表与右侧详情 `Sheet`（5 步流水线、行内重命名、指派制作师、财务信息、交付版本）、制作协同独立圆角卡片分栏、定制报价单（矢量头图 + 实时二维码 + 台账）、RBAC 角色与权限矩阵、统一 shadcn 弹窗与未保存离开拦截 | `main` | ✅ 已上线 |
| **实时协同与通知** | 订单实时聊天、文件大小校验（附件 100MB / 视频 500MB）与进度条、客户素材一键打包 ZIP、真实 `notifications` 表与未读红点同步、路由级懒加载拆包（主包 ~156 kB） | `main` | ✅ 已上线 |
| **Cloudflare R2 直传与签名下载** | 零新增依赖 S3v4 预签名模块（`api/_lib/r2.ts`、`api/storage/r2.ts`、Vite 中间件 `server/r2-storage.ts`、`src/portal/files.ts`），支持 XHR 真实字节级上传进度与无配置自动回落 Supabase Storage；**已完成真实桶 PUT/GET/下载头/CORS 五项实测通过** | `feat/multi-video-r2-prod` | ✅ 本地已测通 |
| **同订单多条视频 & 无限次修改** | SQL 迁移 `202611240001_multi_video_deliverables.sql` 与同步层扩展；前端默认保持清爽简洁，制作师可按需点「新增一条」扩展，客户可不限次提交修改意见 | `feat/multi-video-r2-prod` | ✅ 本地已实现 |
| **客户 7 档套餐兼容与管理端升级** | 同步客户 7 档标准套餐（`trial` / `presenter-5,10,15` / `cinematic-4,6,8`）与加项（脚本 `$50` / 加时 `$25`）；数据库与管理端「套餐管理」支持**套餐编码 ID、首月价、续费月价、结账链接复制、一键同步 7 档目录**；同步更新工作人员工作台 Mock 数据 | `feat/multi-video-r2-prod` | ✅ 本地已实现 |
| **Stripe 生产/测试双模闭环 & 邮件** | 结账接口自动适配 `pk_live_ / sk_live_` 与 `pk_test_ / sk_test_`；透传 `clientId / customerEmail / customQuoteId / projectName / videoCount / addonIds`；前端与 Webhook 按 `stripe_checkout_session_id` 幂等防重；对齐生产域名 `nextgenavatar.com` 与 Resend 发件人 `support@nextgenavatar.com` | `feat/multi-video-r2-prod` | ✅ 本地已实现 |
| **客户官网双站承接兼容** | 新增 `/checkout/:plan`、`/checkout`、`/auth`、`/account/*`、`/portal/*`、`/admin/*` 承接路由与 `lang=zh-CN/en/es` 映射；结账页补齐《Standard Production Terms》同意勾选；新增 `VITE_MARKETING_SITE_URL` 外链回跳（保留原有 React 营销页代码） | `feat/multi-video-r2-prod` | ✅ 本地已实现 |
| **品牌资产与配色系统对齐** | 引入客户官网真实 Logo（`nextgen-avatar-mark-small.png`）、Favicon（`favicon.png`）与 `by 2301 Pictures` 署名；全站 CSS Token、侧边栏、Stripe 结账主题、报价/个人资料封面及邮件模板统一校准至客户色系（`#101b2d` 深海蓝、`#1f4bc4` 皇室蓝、`#f4f6fa` 浅灰底、`#f8cfaa` 暖杏金） | `feat/multi-video-r2-prod` | ✅ 本地已实现 |

---

## 二、未完成的工作

| 序号 | 待办事项 | 归属方 | 前置依赖 | 预计工作量 |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **客户 Nuxt 官网最小化对接补丁**（约 15~20 行：`StudioOrderLink.vue` 跳结账、`nuxt.config.ts` 登录/工作台 302 跳转、`StudioHeader.vue` 加 Sign in 入口），并在客户 GitHub 仓库提 PR 合并 | 开发（我们）+ 客户审核 | 确定最终业务站子域名（如 `app.nextgenavatar.com`） | 0.5 天 |
| **2** | **客户正式 Supabase 环境初始化**：在客户新库依次执行 `supabase/migrations/` 下全部 SQL 脚本（含多条视频与 7 档套餐迁移）、建管理员账号、配置 Google OAuth 回调域名与 Site URL | 开发（已获权限后执行） | 客户将你加入其正式 Supabase Organization | 1~2 小时 |
| **3** | **客户正式 Stripe 生产配置**：用 Developer 权限进入客户正式 Stripe 后台，提取 `pk_live_` / `sk_live_`，配置生产 Webhook（`https://app.nextgenavatar.com/api/stripe/webhook`，监听 `checkout.session.completed`）拿到 `whsec_`，登记 Apple Pay 域名 | 开发（已获权限） | 确定最终业务站域名并部署完成 | 0.5 小时 |
| **4** | **双域名部署与生产环境变量上线**：客户 Nuxt 站绑定 `nextgenavatar.com`，我们的 React 业务站合并 `feat/multi-video-r2-prod` 到 `main` 并绑定 `app.nextgenavatar.com`，在 Vercel 填入全套生产变量（Supabase、Stripe Live、R2 4 项、Resend、`VITE_MARKETING_SITE_URL`、`APP_PUBLIC_URL`、`VITE_HIDE_SAMPLE_DATA=true`） | 开发 + 客户配 DNS | 完成上述 1~3 项 | 1 小时 |
| **5** | **Resend 邮件域名验证 & 免费层保活（可选）**：在 `nextgenavatar.com` DNS 添加 Resend SPF/DKIM 记录以启用 `support@nextgenavatar.com` 自动发信；若初期使用 Supabase Free，增加定时保活任务防 7 天休眠 | 开发 + 客户配 DNS | 客户配合添加 DNS 记录 | 0.5 小时 |

---

## 三、接下来你需要验收的工作

> 本地双站均已运行：业务站 **http://localhost:5173/** ｜ 客户官网 **http://127.0.0.1:3100/**

| 序号 | 验收项 | 建议操作路径与检查重点 | 验收标准 |
| :---: | :--- | :--- | :--- |
| **1** | **管理端「套餐管理」兼容性** | 进入 `http://localhost:5173/zh/admin-settings?tab=pricing`（若连的是老测试库，点右上角**「同步官网 7 档标准套餐」**一键写入） | 表格完整展示 7 档套餐（含编码 ID 如 `presenter-5`、首月价、续费月价、续费均价）；点击任意行右侧抽屉可编辑编码/续费价并复制 `/checkout/<id>` 链接 |
| **2** | **工作人员工作台 Mock 数据同步** | 进入管理端「订单管理」与「制作协同」页面查看演示订单 | 5 笔示例订单已对应最新套餐与金额（`presenter-5 $459`、`cinematic-4 $459`、`trial $59`、`presenter-10 $759`、`cinematic-6 $599`） |
| **3** | **客户官网跳入结账承接链路** | 依次访问：<br>• `http://localhost:5173/checkout/presenter-5?lang=en`<br>• `http://localhost:5173/checkout/cinematic-4?lang=zh-CN`<br>• `http://localhost:5173/account/login` | 自动映射中/英文并预选对应套餐与首月/续费说明；未勾选《Standard Production Terms》时支付按钮禁用，勾选后可用测试卡正常走完 Stripe 结账与建单 |
| **4** | **多条视频扩展 & 不限次修改** | 在制作协同点右上角「新增一条」上传第 2 条视频预览；切客户端审片页提交多轮修改意见 | 普通单条订单界面依然简洁无冗余；上传第 2 条后审片页自动出现切换胶囊；客户可连续多次提交修改意见且不锁死 |
| **5** | **Cloudflare R2 上传与下载（可选复测）** | 使用真实账号打开一笔真实 Supabase 订单，在聊天传图或制作协同传视频 | 上传过程展示真实百分比进度条，上传后在线预览与下载正常（`r2:` 驱动） |
| **6** | **确认上线节奏与合并分支** | 以上本地验收全部满意后通知合并 `feat/multi-video-r2-prod` → `main` | 确定正式业务站域名（推荐 `app.nextgenavatar.com`），开始给客户 Nuxt 仓库提对接 PR 并切正式环境 |
