export type PermissionKey =
  | "orders:view_all"
  | "orders:assign"
  | "production:work"
  | "production:deliver_final"
  | "settings:pricing"
  | "settings:quotes"
  | "settings:clients"
  | "team:manage"

export type TeamRoleId = "admin" | "lead" | "producer"

export type TeamRoleConfig = {
  id: TeamRoleId
  zh: string
  en: string
  descriptionZh: string
  descriptionEn: string
  locked?: boolean
  permissions: PermissionKey[]
}

export type TeamMember = {
  id: string
  name: string
  email: string
  roleId: TeamRoleId
  active: boolean
}

export type PermissionMeta = {
  key: PermissionKey
  group: "orders" | "production" | "operations" | "system"
  zh: string
  en: string
  descZh: string
  descEn: string
}

export const allPermissions: PermissionMeta[] = [
  {
    key: "orders:view_all",
    group: "orders",
    zh: "查看全部订单与金额",
    en: "View all orders & payments",
    descZh: "关闭后仅查看本人负责订单，并隐藏付款金额",
    descEn: "When off, users only see assigned orders without payment totals",
  },
  {
    key: "orders:assign",
    group: "orders",
    zh: "分配订单负责人",
    en: "Assign order owners",
    descZh: "在订单列表中指派或调整制作人员",
    descEn: "Assign or reassign producers on orders",
  },
  {
    key: "production:work",
    group: "production",
    zh: "制作协同与初稿上传",
    en: "Production chat & draft upload",
    descZh: "进入制作协同收件箱、下载素材、回复客户与推送初稿",
    descEn: "Access studio inbox, download assets, chat, and upload drafts",
  },
  {
    key: "production:deliver_final",
    group: "production",
    zh: "交付正式无水印成片",
    en: "Deliver final watermark-free video",
    descZh: "客户审核通过后发布正式成片并完结订单",
    descEn: "Publish final delivery after client approval and close the order",
  },
  {
    key: "settings:pricing",
    group: "operations",
    zh: "套餐与加项定价",
    en: "Package & add-on pricing",
    descZh: "配置套餐条数、首购/续购价与可选加项价格",
    descEn: "Manage package credits, renewal pricing, and add-ons",
  },
  {
    key: "settings:quotes",
    group: "operations",
    zh: "定制报价链接",
    en: "Custom quote links",
    descZh: "为大客户或定制需求生成专属美元结算链接",
    descEn: "Generate dedicated USD checkout links for custom quotes",
  },
  {
    key: "settings:clients",
    group: "operations",
    zh: "客户管理与档案",
    en: "Clients & profiles",
    descZh: "查看客户联系方式、累计消费、历史订单与人物档案",
    descEn: "Inspect client profiles, spend, order history, and presenters",
  },
  {
    key: "team:manage",
    group: "system",
    zh: "角色权限与成员管理",
    en: "Roles, permissions & members",
    descZh: "配置各角色菜单与操作权限，管理后台成员账号",
    descEn: "Configure role permissions and manage internal console accounts",
  },
]

export const defaultTeamRoles: TeamRoleConfig[] = [
  {
    id: "admin",
    zh: "管理员",
    en: "Administrator",
    descriptionZh: "全权限角色（受保护，防止自锁）",
    descriptionEn: "Full access to all modules (locked)",
    locked: true,
    permissions: allPermissions.map((item) => item.key),
  },
  {
    id: "lead",
    zh: "制作主管",
    en: "Production Lead",
    descriptionZh: "负责排期派单、质量把控与成片最终交付",
    descriptionEn: "Manages assignments, reviews, and final deliveries",
    permissions: [
      "orders:view_all",
      "orders:assign",
      "production:work",
      "production:deliver_final",
      "settings:clients",
    ],
  },
  {
    id: "producer",
    zh: "制作人员",
    en: "Producer",
    descriptionZh: "仅处理本人负责订单、素材、沟通与初稿上传",
    descriptionEn: "Works only on assigned orders, assets, chat, and drafts",
    permissions: ["production:work"],
  },
]

export const defaultTeamMembers: TeamMember[] = [
  {
    id: "member-alex",
    name: "Alex",
    email: "alex@nextgenstudio.io",
    roleId: "admin",
    active: true,
  },
  {
    id: "member-leo",
    name: "Leo",
    email: "leo@nextgenstudio.io",
    roleId: "producer",
    active: true,
  },
  {
    id: "member-mia",
    name: "Mia",
    email: "mia@nextgenstudio.io",
    roleId: "lead",
    active: true,
  },
]

export function getRoleConfig(
  roles: TeamRoleConfig[],
  roleId: TeamRoleId
): TeamRoleConfig | undefined {
  return roles.find((item) => item.id === roleId)
}

export function hasPermission(
  member: TeamMember | undefined,
  roles: TeamRoleConfig[],
  permission: PermissionKey
): boolean {
  if (!member || !member.active) return false
  const role = getRoleConfig(roles, member.roleId)
  if (!role) return false
  if (role.locked) return true
  return role.permissions.includes(permission)
}
