# NextGen Avatar 项目交接

面向美国客户的数字人视频制作服务平台，默认英文，支持简体中文和美元付款。客户购买视频额度、上传素材、审核并下载成片，制作团队在后台派单、沟通和交付。首版由团队人工制作，后续 AI 能力可通过 API 接入。[功能需求 V3](../NextGen_Avatar_客户平台功能需求_v3.md)

当前为可实操的演示版本。门户使用 React、TypeScript、Vite、React Router、shadcn/ui、Tailwind CSS 和 react-i18next。代码在 `src/portal/`，通用组件在 `src/components/ui/`，官网资源在 `public/marketing/`。

## 已完成

- 官网复用客户授权的参考站实现。套餐入口会带着套餐和语言进入登录，登录后继续结算。语言切换保留当前页面与查询参数。[官网验收参考](../官网复刻验证/index.html)
- 客户侧可完成「选套餐 → 付款 → 订单聊天上传 → 审初稿 → 提修改或确认 → 领取成片」。聊天通过加号添加附件，支持图片和视频预览。登录、通知、账单及订单使用演示数据，状态存在 `sessionStorage`，文件存在 IndexedDB。
- 后台具备独立登录入口（`/zh/admin/login`）、统一深色侧边栏（移除返回官网与冗余入口）、基于 RBAC 的角色权限矩阵与成员管理（`/zh/admin-permissions`）、3 栏多订单制作协同收件箱、右侧 `Sheet` 订单详情抽屉，以及按原型重构的套餐定价、双栏定制报价与 Master-Detail 客户档案。
- 结算保留套餐选择、加项和金额摘要。配置测试密钥后，默认套餐和示例报价可在本地用 Stripe Elements 测试付款，付款确认后创建演示订单。未配置密钥、自定义报价或演示价格被调整时使用模拟支付。

## 本地运行与验收

在 `nextgen-avatar/` 运行以下命令，打开终端显示的地址。

```sh
npm ci
npm run dev
npm run lint
npm run build
```

- 常用入口为 `/en`、`/zh/auth`、`/zh/checkout?plan=ent`、`/zh/workspace` 和 `/zh/admin-orders`。客户工作台和后台可进入同一笔订单的聊天、审核和制作页面。
- 本地 Stripe 预览使用 `localhost` 或 `127.0.0.1`，测试密钥按 [环境变量示例](.env.example) 写入 `.env.local`。已用测试卡验证加项计价、付款与建单。测试时可取消 Link 的保存付款资料选项。Apple Pay 与独立 ACH 待在客户沙箱及兼容设备上验收。
- UI 已沿用原型布局与入口完成 shadcn/ui 规范化重构，配色体系与官网同步（深海藏青 `#0f2142`、电光蓝 `#0066e6`、暖金点缀与冷灰蓝表面），补齐 `sonner`、`popover`、`breadcrumb`、`empty`、`alert-dialog`、`scroll-area`、`spinner` 组件。[原型源码](../原型/)

## 待联调

- **Supabase（美国区）**已完成 M1 数据库 Schema、RBAC 权限表、RLS 行级安全策略、分包脱敏视图与 `seed.sql`（`supabase/migrations/`）；待配置项目凭证后推送迁移并接入邮箱/Google 登录、实时聊天和通知。[本地配置](supabase/config.toml)
- **Stripe**使用客户沙箱验证美元支付、可用支付方式和 Webhook，再将已付款订单和额度写入数据库。
- **Cloudflare R2**联调大文件直传、受控下载和文件保留策略。上线前补齐品牌素材、双语文案、首位管理员及部署配置。
