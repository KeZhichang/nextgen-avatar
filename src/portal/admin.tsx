import { useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router"
import {
  Check,
  Copy,
  ExternalLink,
  Inbox,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { motion } from "motion/react"
import { cn } from "cn"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  clientImage,
  formatDollars,
  studioImage,
  useDemo,
  usePortal,
  useTeamAuth,
  type Addon,
  type Order,
  type PermissionKey,
  type Plan,
  type Status,
} from "./demo"
import {
  ActionLink,
  DataPagination,
  FadeTransition,
  StatusBadge,
} from "./layout"
import { TeamConsoleLayout, type TeamNavKey } from "./team-console"

const clientDirectoryMeta: Record<
  string,
  {
    company: string
    email: string
    phone: string
    city: string
    avatar: string
    presenters: {
      nameZh: string
      nameEn: string
      noteZh: string
      noteEn: string
      avatar: string
    }[]
  }
> = {
  "Sarah Lin": {
    company: "Apex Labs (US)",
    email: "sarah.lin@gmail.com",
    phone: "+1 (415) 890-3321",
    city: "San Francisco",
    avatar: clientImage,
    presenters: [
      {
        nameZh: "Sarah · 商务白西装",
        nameEn: "Sarah · Business Blazer",
        noteZh: "含 48kHz 英文干声",
        noteEn: "48kHz studio voice sample",
        avatar: clientImage,
      },
      {
        nameZh: "David · 创始人形象",
        nameEn: "David · Founder",
        noteZh: "已用于 2 条历史交付",
        noteEn: "Used in 2 past deliveries",
        avatar: studioImage,
      },
    ],
  },
  "Michael Ross": {
    company: "EduScale",
    email: "michael@eduscale.io",
    phone: "+1 (212) 555-0194",
    city: "New York",
    avatar: studioImage,
    presenters: [
      {
        nameZh: "Michael · 讲师形象",
        nameEn: "Michael · Instructor",
        noteZh: "英/西双语声线已建档",
        noteEn: "EN/ES voice profile ready",
        avatar: studioImage,
      },
    ],
  },
  "Emily Clark": {
    company: "MedFlow",
    email: "emily@medflow.us",
    phone: "+1 (617) 555-0148",
    city: "Boston",
    avatar: clientImage,
    presenters: [
      {
        nameZh: "Emily · 产品解说",
        nameEn: "Emily · Product Host",
        noteZh: "含室内自然光素材",
        noteEn: "Natural studio lighting",
        avatar: clientImage,
      },
    ],
  },
}

function paymentChannelLabel(
  method: string,
  total: number,
  t: (zh: string, en: string) => string
) {
  const channel =
    method === "apple" ? "Apple Pay" : method === "ach" ? "ACH" : "Stripe"
  return `${channel} ${t("已付", "Paid")} ${formatDollars(total)}`
}

export function AdminOrdersPage() {
  const { t, href, zh } = usePortal()
  const { data, assignOrderOwner } = useDemo()
  const { member, can } = useTeamAuth()
  const [query, setQuery] = useSearchParams()
  const [detailId, setDetailId] = useState("")

  const filter = query.get("status") ?? "all"
  const search = query.get("q") ?? ""
  const rawPage = Number(query.get("page") ?? "1")
  const [pageSize, setPageSize] = useState(10)
  const canViewAll = can("orders:view_all")
  const canAssign = can("orders:assign")
  const canWork = can("production:work")

  const allowed = canViewAll
    ? data.orders
    : data.orders.filter((value) => value.owner === member?.name)

  const keyword = search.trim().toLowerCase()
  const active = allowed.filter((value) => {
    const statusOk = filter === "all" || value.status === filter
    if (!statusOk) return false
    if (!keyword) return true
    return (
      value.id.toLowerCase().includes(keyword) ||
      value.client.toLowerCase().includes(keyword) ||
      value.zh.toLowerCase().includes(keyword) ||
      value.en.toLowerCase().includes(keyword)
    )
  })
  const totalPages = Math.max(1, Math.ceil(active.length / pageSize))
  const page =
    Number.isFinite(rawPage) && rawPage >= 1
      ? Math.min(Math.floor(rawPage), totalPages)
      : 1
  const pagedOrders = active.slice((page - 1) * pageSize, page * pageSize)
  const current = canViewAll
    ? allowed.find((value) => value.id === detailId)
    : undefined
  const contextOrder = query.get("order")

  const assignableMembers = data.teamMembers.filter(
    (item) => item.active && item.roleId !== "admin"
  )

  const filters: { id: "all" | Status; label: string }[] = [
    { id: "all", label: t("全部", "All") },
    { id: "waiting_assets", label: t("等待素材", "Awaiting materials") },
    { id: "producing", label: t("制作中", "In production") },
    { id: "waiting_confirm", label: t("等待确认", "Awaiting review") },
    { id: "revision", label: t("需要修改", "Changes requested") },
    { id: "approved", label: t("待交付", "Ready to deliver") },
    { id: "completed", label: t("已完成", "Completed") },
  ]

  function setFilter(next: string) {
    const params = new URLSearchParams(query)
    if (next === "all") params.delete("status")
    else params.set("status", next)
    params.delete("page")
    setQuery(params, { replace: true })
  }

  function setSearch(next: string) {
    const params = new URLSearchParams(query)
    if (!next.trim()) params.delete("q")
    else params.set("q", next)
    params.delete("page")
    setQuery(params, { replace: true })
  }

  function setPage(next: number) {
    const params = new URLSearchParams(query)
    if (next <= 1) params.delete("page")
    else params.set("page", String(next))
    setQuery(params, { replace: true })
  }

  function assign(id: string, owner: string) {
    if (!canAssign) return
    void assignOrderOwner(id, owner).then((ok) => {
      if (!ok) {
        toast.error(
          t("分配负责人失败，请重试。", "Could not update assignment.")
        )
        return
      }
      toast.success(
        owner === "unassigned"
          ? t("已取消订单分配", "Assignment removed")
          : t(
              `订单 #${id} 已派给 ${owner}`,
              `Order #${id} assigned to ${owner}`
            )
      )
    })
  }

  function actionLabel(order: Order) {
    switch (order.status) {
      case "waiting_assets":
        return t("处理", "Handle")
      case "revision":
        return t("传新版", "Upload revision")
      case "producing":
        return t("传初稿", "Upload draft")
      case "approved":
        return t("去交付", "Deliver")
      case "completed":
        return t("查看", "View")
      default:
        return t("查看", "View")
    }
  }

  return (
    <TeamConsoleLayout
      activeNav="orders"
      heading={
        <h1>
          {canViewAll
            ? t("订单管理与工作列表", "Orders & assignments")
            : t("我的制作任务", "My production tasks")}
        </h1>
      }
    >
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label={t("按制作状态筛选", "Filter by order status")}
            className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-2xs"
          >
            {filters.map((item) => {
              const count =
                item.id === "all"
                  ? allowed.length
                  : allowed.filter((value) => value.status === item.id).length
              const selected = filter === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "relative inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                    selected
                      ? "text-white"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="admin-order-filter-pill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      className="absolute inset-0 rounded-lg bg-brand-navy shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                  <span
                    className={cn(
                      "relative z-10 font-mono text-xs tabular-nums",
                      selected ? "text-white/80" : "text-muted-foreground/80"
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <InputGroup className="h-9 w-full bg-card sm:w-64">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("搜索订单号或客户…", "Search order or client…")}
              aria-label={t("搜索订单号或客户", "Search orders")}
            />
          </InputGroup>
        </div>

        <FadeTransition key={filter}>
          <Card className="gap-0 overflow-hidden py-0 shadow-xs">
            <CardContent className="p-0">
              {active.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-5">
                          {canViewAll
                            ? t("订单 / Stripe 付款", "Order / Payment")
                            : t("订单", "Order")}
                        </TableHead>
                        <TableHead>
                          {canViewAll
                            ? t(
                                "客户 / 套餐与配额",
                                "Client / Package & credits"
                              )
                            : t("制作项目", "Project")}
                        </TableHead>
                        <TableHead>{t("制作状态", "Status")}</TableHead>
                        <TableHead>{t("负责人", "Assigned to")}</TableHead>
                        <TableHead className="px-5 text-right">
                          {t("操作", "Action")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedOrders.map((value) => {
                        const plan = data.plans.find(
                          (item) => item.id === value.plan
                        )
                        const meta = clientDirectoryMeta[value.client]
                        const remaining =
                          value.count - (value.status === "completed" ? 1 : 0)
                        const isUrgent =
                          value.status === "revision" ||
                          value.status === "waiting_assets"
                        const isDeliveryReady = value.status === "approved"
                        const firstAssignee =
                          assignableMembers[0]?.name ?? "Leo"
                        return (
                          <TableRow
                            key={value.id}
                            className={cn(
                              value.id === contextOrder && "bg-accent/50"
                            )}
                          >
                            <TableCell className="px-5 py-3.5">
                              <div className="font-mono text-xs font-semibold text-foreground">
                                #{value.id}
                              </div>
                              {canViewAll && (
                                <div
                                  className={cn(
                                    "mt-1 text-xs font-medium tabular-nums",
                                    value.status === "completed"
                                      ? "text-muted-foreground"
                                      : "text-emerald-700"
                                  )}
                                >
                                  {paymentChannelLabel(
                                    value.method,
                                    value.total,
                                    t
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <span>
                                  {canViewAll
                                    ? value.client
                                    : zh
                                      ? value.zh
                                      : value.en}
                                </span>
                                {canViewAll && meta && (
                                  <span className="text-xs font-normal text-muted-foreground">
                                    · {meta.company.replace(" (US)", "")}
                                  </span>
                                )}
                              </div>
                              {canViewAll && (
                                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                                  {plan
                                    ? zh
                                      ? plan.zh
                                      : plan.en
                                    : t("定制报价", "Custom quote")}{" "}
                                  ·{" "}
                                  {value.status === "completed"
                                    ? t(
                                        "已交付 · 扣减 1 条",
                                        "Delivered · -1 credit"
                                      )
                                    : t(
                                        `剩余 ${remaining}/${value.count} 条`,
                                        `${remaining}/${value.count} credits left`
                                      )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={value.status} />
                            </TableCell>
                            <TableCell>
                              {canAssign ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={value.owner || "unassigned"}
                                    onValueChange={(owner) =>
                                      assign(value.id, owner)
                                    }
                                  >
                                    <SelectTrigger
                                      size="sm"
                                      aria-label={t(
                                        "订单负责人",
                                        "Order assignee"
                                      )}
                                      className="h-8 w-28 bg-card"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectItem value="unassigned">
                                          {t("待分配", "Unassigned")}
                                        </SelectItem>
                                        {assignableMembers.map((person) => (
                                          <SelectItem
                                            key={person.id}
                                            value={person.name}
                                          >
                                            {person.name}
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                  {!value.owner && (
                                    <Button
                                      variant="secondary"
                                      size="xs"
                                      onClick={() =>
                                        assign(value.id, firstAssignee)
                                      }
                                    >
                                      {t(
                                        `派给 ${firstAssignee}`,
                                        `Assign ${firstAssignee}`
                                      )}
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {value.owner || t("待分配", "Unassigned")}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-5">
                              <div className="flex items-center justify-end gap-2">
                                {canViewAll && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={() => setDetailId(value.id)}
                                  >
                                    {t("详情", "Details")}
                                  </Button>
                                )}
                                {canWork && (
                                  <ActionLink
                                    size="sm"
                                    variant={
                                      isDeliveryReady
                                        ? "default"
                                        : isUrgent
                                          ? "default"
                                          : "outline"
                                    }
                                    className={cn(
                                      isUrgent &&
                                        "bg-brand-navy text-white hover:bg-brand-navy/90"
                                    )}
                                    to={href("admin-workspace", {
                                      order: value.id,
                                    })}
                                  >
                                    {actionLabel(value)}
                                  </ActionLink>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <DataPagination
                    page={page}
                    pageSize={pageSize}
                    total={active.length}
                    onPageChange={setPage}
                    onPageSizeChange={(nextSize) => {
                      setPageSize(nextSize)
                      setPage(1)
                    }}
                  />
                </>
              ) : (
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Inbox aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {t("暂无符合条件的订单", "No matching orders")}
                    </EmptyTitle>
                    <EmptyDescription>
                      {t(
                        "尝试清除搜索词或切换到「全部」。",
                        "Clear the search or switch back to All."
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </FadeTransition>
      </main>

      <Sheet
        open={Boolean(current)}
        onOpenChange={(open) => {
          if (!open) setDetailId("")
        }}
      >
        {current && (
          <SheetContent
            side="right"
            className="w-full sm:max-w-md"
            closeLabel={t("关闭详情", "Close details")}
          >
            <SheetHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <SheetTitle className="font-mono text-base">
                  #{current.id}
                </SheetTitle>
                <StatusBadge status={current.status} />
              </div>
              <SheetDescription>
                {zh ? current.zh : current.en}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("下单客户", "Client")}
                  </dt>
                  <dd className="font-medium">
                    {current.client}
                    {clientDirectoryMeta[current.client]
                      ? ` · ${clientDirectoryMeta[current.client].company.replace(" (US)", "")}`
                      : ""}
                  </dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("所选套餐", "Package")}
                  </dt>
                  <dd className="font-medium">
                    {(() => {
                      const matched = data.plans.find(
                        (item) => item.id === current.plan
                      )
                      return matched
                        ? zh
                          ? matched.zh
                          : matched.en
                        : t("定制报价", "Custom quote")
                    })()}
                  </dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("Stripe 付款状态", "Payment")}
                  </dt>
                  <dd className="font-medium text-emerald-700 tabular-nums">
                    {paymentChannelLabel(current.method, current.total, t)}
                  </dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("负责人", "Assigned to")}
                  </dt>
                  <dd className="font-medium">
                    {current.owner || t("待分配", "Unassigned")}
                  </dd>
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <dt className="text-muted-foreground">
                      {t("视频配额余量", "Remaining video credits")}
                    </dt>
                    <dd className="font-mono font-medium tabular-nums">
                      {current.count - (current.status === "completed" ? 1 : 0)}{" "}
                      / {current.count}
                    </dd>
                  </div>
                  <Progress
                    value={Math.round(
                      ((current.count -
                        (current.status === "completed" ? 1 : 0)) /
                        current.count) *
                        100
                    )}
                    className="h-1.5"
                  />
                </div>
              </dl>

              {current.revision && (
                <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-3.5 text-sm">
                  <div className="mb-1 text-xs font-semibold text-amber-900">
                    {t("最新修改意见", "Latest revision note")}
                  </div>
                  <p className="text-xs leading-relaxed text-amber-950">
                    {current.revision}
                  </p>
                </div>
              )}
            </div>

            {canWork && (
              <SheetFooter className="border-t bg-muted/30">
                <ActionLink
                  primary
                  className="w-full"
                  to={href("admin-workspace", { order: current.id })}
                >
                  {t("打开制作协同会话", "Open in studio inbox")}
                </ActionLink>
              </SheetFooter>
            )}
          </SheetContent>
        )}
      </Sheet>
    </TeamConsoleLayout>
  )
}

type SettingsTabId = "pricing" | "quote" | "clients"

export function AdminSettingsPage() {
  const { t, href, zh } = usePortal()
  const { data, saveCatalog, saveCustomQuote } = useDemo()
  const { can } = useTeamAuth()
  const [query] = useSearchParams()

  // Pricing state
  const [plans, setPlans] = useState<Plan[]>(data.plans)
  const [addons, setAddons] = useState<Addon[]>(data.addons)
  const [planQuery, setPlanQuery] = useState("")
  const [addPlanOpen, setAddPlanOpen] = useState(false)
  const [newPlanZh, setNewPlanZh] = useState("")
  const [newPlanEn, setNewPlanEn] = useState("")
  const [newPlanTagZh, setNewPlanTagZh] = useState("")
  const [newPlanTagEn, setNewPlanTagEn] = useState("")
  const [newPlanCount, setNewPlanCount] = useState("5")
  const [newPlanPrice, setNewPlanPrice] = useState("299")
  const [newPlanRegular, setNewPlanRegular] = useState("")

  const [addAddonOpen, setAddAddonOpen] = useState(false)
  const [newAddonZh, setNewAddonZh] = useState("")
  const [newAddonEn, setNewAddonEn] = useState("")
  const [newAddonPrice, setNewAddonPrice] = useState("49")

  // Quote state
  const [quoteEmail, setQuoteEmail] = useState("michael@eduscale.io")
  const [quoteAmount, setQuoteAmount] = useState("1250")
  const [quoteCount, setQuoteCount] = useState("10")
  const [quoteRef, setQuoteRef] = useState("QUOTE-9021")
  const [copiedQuote, setCopiedQuote] = useState(false)

  // Clients master-detail state (combines real Supabase profiles + order clients)
  const clientNames = [
    ...new Set([
      ...data.clients.map((item) => item.name),
      ...data.orders.map((value) => value.client),
    ]),
  ]
  const [clientQuery, setClientQuery] = useState("")
  const [clientPage, setClientPage] = useState(1)
  const clientPageSize = 8
  const [selectedClient, setSelectedClient] = useState(clientNames[0] ?? "")

  const allTabs: {
    id: SettingsTabId
    permission: PermissionKey
    label: string
  }[] = [
    {
      id: "pricing",
      permission: "settings:pricing",
      label: t("套餐与加项定价", "Package pricing & add-ons"),
    },
    {
      id: "quote",
      permission: "settings:quotes",
      label: t("定制报价链接", "Custom quote link"),
    },
    {
      id: "clients",
      permission: "settings:clients",
      label: t("客户管理与档案", "Clients & profiles"),
    },
  ]

  const allowedTabs = allTabs.filter((item) => can(item.permission))
  const requestedTab = query.get("tab") as SettingsTabId | null
  const activeTab =
    allowedTabs.find((item) => item.id === requestedTab)?.id ??
    allowedTabs[0]?.id

  if (!activeTab) {
    return (
      <TeamConsoleLayout
        activeNav="pricing"
        heading={<h1>{t("运营配置", "Operations")}</h1>}
      >
        <main className="flex flex-1 items-center justify-center p-6">
          <Empty className="max-w-md border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldAlert aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {t("无权访问此模块", "Access restricted")}
              </EmptyTitle>
              <EmptyDescription>
                {t(
                  "当前角色未被分配运营配置权限，请联系管理员开启。",
                  "Your current role does not have permission to access operations settings."
                )}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <ActionLink primary to={href("admin-orders")}>
                {t("返回订单管理", "Back to orders")}
              </ActionLink>
            </EmptyContent>
          </Empty>
        </main>
      </TeamConsoleLayout>
    )
  }

  function updatePlan(id: string, patch: Partial<Plan>) {
    setPlans((current) =>
      current.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan))
    )
  }

  function addPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const zhName = newPlanZh.trim()
    const enName = newPlanEn.trim()
    const count = Math.floor(Number(newPlanCount))
    const price = Number(newPlanPrice)
    const regular = newPlanRegular.trim() ? Number(newPlanRegular) : undefined
    if (
      !zhName ||
      !enName ||
      !Number.isFinite(count) ||
      count <= 0 ||
      price <= 0
    ) {
      toast.error(
        t(
          "请填写完整的套餐名称、视频条数与售价。",
          "Please enter a valid plan name, video count, and price."
        )
      )
      return
    }
    const created: Plan = {
      id: "plan-" + crypto.randomUUID().slice(0, 6),
      zh: zhName,
      en: enName,
      tagZh: newPlanTagZh.trim(),
      tagEn: newPlanTagEn.trim(),
      count,
      price,
      regular: regular && regular > price ? regular : undefined,
      active: true,
    }
    const nextPlans = [...plans, created]
    setPlans(nextPlans)
    void saveCatalog(nextPlans, addons).then((ok) => {
      if (ok) {
        toast.success(
          t(`已新增套餐「${zhName}」。`, `Added package "${enName}".`)
        )
      } else {
        toast.error(
          t("保存套餐到数据库失败，请重试。", "Could not save package.")
        )
      }
    })
    setNewPlanZh("")
    setNewPlanEn("")
    setNewPlanTagZh("")
    setNewPlanTagEn("")
    setNewPlanCount("5")
    setNewPlanPrice("299")
    setNewPlanRegular("")
    setAddPlanOpen(false)
  }

  function removePlan(id: string) {
    if (plans.length <= 1) {
      toast.error(
        t(
          "至少保留一个套餐，无法全部删除。",
          "At least one package is required."
        )
      )
      return
    }
    const nextPlans = plans.filter((item) => item.id !== id)
    if (!nextPlans.some((item) => item.active !== false)) {
      nextPlans[0] = { ...nextPlans[0], active: true }
    }
    setPlans(nextPlans)
    void saveCatalog(nextPlans, addons).then((ok) => {
      if (ok) toast.success(t("套餐已删除。", "Package deleted."))
      else toast.error(t("删除套餐失败，请重试。", "Could not delete package."))
    })
  }

  function updateAddon(id: string, patch: Partial<Addon>) {
    setAddons((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  function addAddon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const zhName = newAddonZh.trim()
    const enName = newAddonEn.trim()
    const price = Number(newAddonPrice)
    if (!zhName || !enName || !Number.isFinite(price) || price < 0) {
      toast.error(
        t(
          "请填写完整的加项名称与价格。",
          "Please enter a valid add-on name and price."
        )
      )
      return
    }
    const created: Addon = {
      id: "addon-" + crypto.randomUUID().slice(0, 6),
      zh: zhName,
      en: enName,
      price,
      active: true,
    }
    const nextAddons = [...addons, created]
    setAddons(nextAddons)
    void saveCatalog(plans, nextAddons).then((ok) => {
      if (ok) {
        toast.success(
          t(`已新增加项「${zhName}」。`, `Added add-on "${enName}".`)
        )
      } else {
        toast.error(t("保存加项失败，请重试。", "Could not save add-on."))
      }
    })
    setNewAddonZh("")
    setNewAddonEn("")
    setNewAddonPrice("49")
    setAddAddonOpen(false)
  }

  function removeAddon(id: string) {
    const nextAddons = addons.filter((item) => item.id !== id)
    setAddons(nextAddons)
    void saveCatalog(plans, nextAddons).then((ok) => {
      if (ok) toast.success(t("加项服务已删除。", "Add-on deleted."))
      else toast.error(t("删除加项失败，请重试。", "Could not delete add-on."))
    })
  }

  function savePricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      plans.some(
        (plan) =>
          !plan.zh.trim() ||
          !plan.en.trim() ||
          plan.price <= 0 ||
          !Number.isInteger(plan.count) ||
          plan.count <= 0
      )
    ) {
      toast.error(
        t(
          "请检查套餐名称、条数与价格是否有效。",
          "Please verify all package names, video counts, and prices."
        )
      )
      return
    }
    if (!plans.some((plan) => plan.active !== false)) {
      toast.error(
        t(
          "请至少保持一个套餐处于上架状态。",
          "Keep at least one package published."
        )
      )
      return
    }
    if (
      addons.some(
        (item) =>
          !item.zh.trim() ||
          !item.en.trim() ||
          !Number.isFinite(item.price) ||
          item.price < 0
      )
    ) {
      toast.error(
        t(
          "请检查加项服务名称与价格是否有效。",
          "Please verify all add-on names and prices."
        )
      )
      return
    }
    const cleanedPlans = plans.map((plan) => ({
      ...plan,
      zh: plan.zh.trim(),
      en: plan.en.trim(),
      tagZh: plan.tagZh?.trim() || "",
      tagEn: plan.tagEn?.trim() || "",
      regular:
        plan.regular && plan.regular > plan.price ? plan.regular : undefined,
      active: plan.active !== false,
    }))
    const cleanedAddons = addons.map((item) => ({
      ...item,
      zh: item.zh.trim(),
      en: item.en.trim(),
    }))
    setPlans(cleanedPlans)
    setAddons(cleanedAddons)
    void saveCatalog(cleanedPlans, cleanedAddons).then((ok) => {
      if (ok) {
        toast.success(
          t("套餐与加项配置已保存生效。", "Packages and add-on pricing saved.")
        )
      } else {
        toast.error(
          t("保存定价失败，请稍后重试。", "Could not save pricing changes.")
        )
      }
    })
  }

  const normalizedPlanQuery = planQuery.trim().toLowerCase()
  const filteredPlans = plans.filter((plan) => {
    if (!normalizedPlanQuery) return true
    return (
      plan.id.toLowerCase().includes(normalizedPlanQuery) ||
      plan.zh.toLowerCase().includes(normalizedPlanQuery) ||
      plan.en.toLowerCase().includes(normalizedPlanQuery) ||
      (plan.tagZh ?? "").toLowerCase().includes(normalizedPlanQuery) ||
      (plan.tagEn ?? "").toLowerCase().includes(normalizedPlanQuery)
    )
  })

  const absolute = (route: string) =>
    new URL(route, window.location.origin).href
  const quotePath = href("auth", {
    quote: quoteRef,
    amount: quoteAmount || "1250",
    quota: quoteCount || "10",
    project: quoteEmail.trim(),
    redirect: "checkout",
  })
  const quoteUrl = absolute(quotePath)

  function generateQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextRef = "QUOTE-" + Math.floor(1000 + Math.random() * 9000)
    setQuoteRef(nextRef)
    void saveCustomQuote({
      id: nextRef,
      clientEmail: quoteEmail.trim(),
      projectName: quoteEmail.trim(),
      videoCount: Math.max(1, Math.floor(Number(quoteCount) || 10)),
      amountDollars: Math.max(1, Number(quoteAmount) || 1250),
    }).then((ok) => {
      if (ok) {
        toast.success(
          t(
            `专属付款链接 #${nextRef} 已生成。`,
            `Custom payment link #${nextRef} generated.`
          )
        )
      } else {
        toast.error(
          t("保存定制报价失败，请稍后重试。", "Could not save custom quote.")
        )
      }
    })
  }

  async function copyQuoteUrl() {
    try {
      await navigator.clipboard.writeText(quoteUrl)
      setCopiedQuote(true)
      toast.success(t("付款链接已复制。", "Payment link copied."))
      window.setTimeout(() => setCopiedQuote(false), 1800)
    } catch {
      toast.info(t("请手动复制右侧链接。", "Select and copy the link."))
    }
  }

  const filteredClients = clientNames.filter((name) => {
    const q = clientQuery.trim().toLowerCase()
    if (!q) return true
    const dbClient = data.clients.find((c) => c.name === name)
    const meta = clientDirectoryMeta[name]
    const email =
      dbClient?.email ??
      (name === data.account.name ? data.account.email : (meta?.email ?? ""))
    const company = dbClient?.company ?? meta?.company ?? ""
    return (
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      company.toLowerCase().includes(q)
    )
  })
  const activeClientName = filteredClients.includes(selectedClient)
    ? selectedClient
    : (filteredClients[0] ?? clientNames[0] ?? "")
  const activeClientOrders = data.orders.filter(
    (item) => item.client === activeClientName
  )
  const activeDbClient = data.clients.find((c) => c.name === activeClientName)
  const activeClientMeta = clientDirectoryMeta[activeClientName]
  const activeClientEmail =
    activeDbClient?.email ??
    (activeClientName === data.account.name
      ? data.account.email
      : (activeClientMeta?.email ?? "—"))
  const activeClientCompany =
    activeDbClient?.company ||
    (activeClientName === data.account.name
      ? data.account.company
      : (activeClientMeta?.company ?? "—"))
  const activeClientSpend = activeClientOrders.reduce(
    (sum, item) => sum + item.total,
    0
  )
  const activeClientRemaining = activeClientOrders.reduce(
    (sum, item) => sum + item.count - (item.status === "completed" ? 1 : 0),
    0
  )

  const currentTabMeta = allowedTabs.find((item) => item.id === activeTab)!

  return (
    <TeamConsoleLayout
      activeNav={activeTab as TeamNavKey}
      heading={<h1>{currentTabMeta.label}</h1>}
    >
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 py-6 sm:px-8">
        {activeTab === "pricing" && can("settings:pricing") && (
          <form className="flex flex-col gap-5" onSubmit={savePricing}>
            <Card className="gap-0 overflow-hidden pb-0 shadow-xs">
              <CardHeader className="border-b px-5 pb-4">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base font-semibold">
                    <h2>
                      {t(
                        "套餐与展示定价 (USD $)",
                        "Packages & pricing (USD $)"
                      )}
                    </h2>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      "支持新增、编辑、上下架与删除套餐；展示标签会同步显示在官网与结算页卡片上。",
                      "Create, edit, publish, or delete packages. Display tags appear on website & checkout cards."
                    )}
                  </span>
                </div>
                <CardAction className="flex flex-wrap items-center gap-2">
                  <InputGroup className="h-8 w-44 bg-card">
                    <InputGroupAddon>
                      <Search aria-hidden="true" className="size-3.5" />
                    </InputGroupAddon>
                    <InputGroupInput
                      value={planQuery}
                      onChange={(event) => setPlanQuery(event.target.value)}
                      placeholder={t("搜索套餐…", "Search plans…")}
                      aria-label={t("搜索套餐", "Search packages")}
                      className="text-xs"
                    />
                  </InputGroup>
                  <Dialog open={addPlanOpen} onOpenChange={setAddPlanOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        {t("新增套餐", "Add package")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>
                          {t("新增制作套餐", "Add package")}
                        </DialogTitle>
                        <DialogDescription>
                          {t(
                            "填写中英文名称、展示标签与美元价格，创建后立即上架。",
                            "Configure bilingual names, optional badge tag, and USD price."
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={addPlan} className="flex flex-col gap-4">
                        <FieldGroup className="gap-3.5">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field>
                              <FieldLabel htmlFor="new-plan-zh">
                                {t("中文名称", "Chinese name")}
                              </FieldLabel>
                              <Input
                                id="new-plan-zh"
                                value={newPlanZh}
                                onChange={(event) =>
                                  setNewPlanZh(event.target.value)
                                }
                                placeholder={t(
                                  "例如：标准 3 条套餐",
                                  "e.g. Standard 3-Pack"
                                )}
                                required
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="new-plan-en">
                                {t("英文名称", "English name")}
                              </FieldLabel>
                              <Input
                                id="new-plan-en"
                                value={newPlanEn}
                                onChange={(event) =>
                                  setNewPlanEn(event.target.value)
                                }
                                placeholder="Standard 3-Pack"
                                required
                              />
                            </Field>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field>
                              <FieldLabel htmlFor="new-plan-tag-zh">
                                {t(
                                  "中文标签（选填）",
                                  "Chinese tag (optional)"
                                )}
                              </FieldLabel>
                              <Input
                                id="new-plan-tag-zh"
                                value={newPlanTagZh}
                                onChange={(event) =>
                                  setNewPlanTagZh(event.target.value)
                                }
                                placeholder={t(
                                  "例如：最受欢迎",
                                  "e.g. 最受欢迎"
                                )}
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="new-plan-tag-en">
                                {t(
                                  "英文标签（选填）",
                                  "English tag (optional)"
                                )}
                              </FieldLabel>
                              <Input
                                id="new-plan-tag-en"
                                value={newPlanTagEn}
                                onChange={(event) =>
                                  setNewPlanTagEn(event.target.value)
                                }
                                placeholder="Most Popular"
                              />
                            </Field>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <Field>
                              <FieldLabel htmlFor="new-plan-count">
                                {t("视频条数", "Videos")}
                              </FieldLabel>
                              <Input
                                id="new-plan-count"
                                type="number"
                                min="1"
                                value={newPlanCount}
                                onChange={(event) =>
                                  setNewPlanCount(event.target.value)
                                }
                                required
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="new-plan-price">
                                {t("售价 ($)", "Price ($)")}
                              </FieldLabel>
                              <Input
                                id="new-plan-price"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={newPlanPrice}
                                onChange={(event) =>
                                  setNewPlanPrice(event.target.value)
                                }
                                required
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="new-plan-regular">
                                {t("原价划线（选填）", "Compare at ($)")}
                              </FieldLabel>
                              <Input
                                id="new-plan-regular"
                                type="number"
                                min="0"
                                step="0.01"
                                value={newPlanRegular}
                                onChange={(event) =>
                                  setNewPlanRegular(event.target.value)
                                }
                                placeholder="—"
                              />
                            </Field>
                          </div>
                        </FieldGroup>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAddPlanOpen(false)}
                          >
                            {t("取消", "Cancel")}
                          </Button>
                          <Button type="submit">
                            {t("确认新增", "Create package")}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button type="submit" size="sm">
                    {t("保存配置", "Save changes")}
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5">
                        {t("套餐名称（中 / 英）", "Plan name (ZH / EN)")}
                      </TableHead>
                      <TableHead>
                        {t("展示标签（中 / 英）", "Display tag (ZH / EN)")}
                      </TableHead>
                      <TableHead className="w-24">
                        {t("条数", "Credits")}
                      </TableHead>
                      <TableHead className="w-32">
                        {t("售价 ($)", "Price ($)")}
                      </TableHead>
                      <TableHead className="w-32">
                        {t("原价划线 ($)", "Compare at")}
                      </TableHead>
                      <TableHead className="w-20 text-center">
                        {t("上架", "Active")}
                      </TableHead>
                      <TableHead className="w-16 px-5 text-right">
                        {t("操作", "Action")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="px-5">
                          <div className="grid min-w-52 grid-cols-1 gap-1.5 sm:grid-cols-2">
                            <Input
                              value={plan.zh}
                              required
                              className="h-8 text-sm"
                              aria-label={`${plan.id} 中文名称`}
                              onChange={(event) =>
                                updatePlan(plan.id, {
                                  zh: event.target.value,
                                })
                              }
                            />
                            <Input
                              value={plan.en}
                              required
                              className="h-8 text-sm text-muted-foreground"
                              aria-label={`${plan.id} English name`}
                              onChange={(event) =>
                                updatePlan(plan.id, {
                                  en: event.target.value,
                                })
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="grid min-w-44 grid-cols-1 gap-1.5 sm:grid-cols-2">
                            <Input
                              value={plan.tagZh ?? ""}
                              placeholder={t("中文标签", "ZH tag")}
                              className="h-8 text-xs"
                              aria-label={`${plan.id} 中文标签`}
                              onChange={(event) =>
                                updatePlan(plan.id, {
                                  tagZh: event.target.value,
                                })
                              }
                            />
                            <Input
                              value={plan.tagEn ?? ""}
                              placeholder={t("英文标签", "EN tag")}
                              className="h-8 text-xs text-muted-foreground"
                              aria-label={`${plan.id} English tag`}
                              onChange={(event) =>
                                updatePlan(plan.id, {
                                  tagEn: event.target.value,
                                })
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            required
                            className="h-8 w-20 font-mono tabular-nums"
                            value={plan.count || ""}
                            aria-label={`${plan.id} ${t("条数", "credits")}`}
                            onChange={(event) =>
                              updatePlan(plan.id, {
                                count: Number(event.target.value),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <InputGroup className="h-8 w-28 bg-card">
                            <InputGroupAddon>
                              <InputGroupText className="text-xs">
                                $
                              </InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              className="font-mono text-sm tabular-nums"
                              value={plan.price || ""}
                              aria-label={`${plan.id} ${t("售价", "price")}`}
                              onChange={(event) =>
                                updatePlan(plan.id, {
                                  price: Number(event.target.value),
                                })
                              }
                            />
                          </InputGroup>
                        </TableCell>
                        <TableCell>
                          <InputGroup className="h-8 w-28 bg-card">
                            <InputGroupAddon>
                              <InputGroupText className="text-xs">
                                $
                              </InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="—"
                              className="font-mono text-sm text-muted-foreground tabular-nums"
                              value={plan.regular ?? ""}
                              aria-label={`${plan.id} ${t("原价划线", "compare price")}`}
                              onChange={(event) =>
                                updatePlan(plan.id, {
                                  regular: event.target.value
                                    ? Number(event.target.value)
                                    : undefined,
                                })
                              }
                            />
                          </InputGroup>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={plan.active !== false}
                            aria-label={t(
                              `切换 ${plan.zh} 上架状态`,
                              `Toggle ${plan.en}`
                            )}
                            onCheckedChange={(checked) =>
                              updatePlan(plan.id, { active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="px-5 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={plans.length <= 1}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={t(
                                  `删除 ${plan.zh}`,
                                  `Delete ${plan.en}`
                                )}
                              >
                                <Trash2 aria-hidden="true" className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t(
                                    "确认删除该套餐？",
                                    "Delete this package?"
                                  )}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t(
                                    `删除「${plan.zh}」后将不再展示于结算页，但不影响已生成的历史订单。`,
                                    `Deleting "${plan.en}" removes it from checkout without affecting existing orders.`
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t("取消", "Cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removePlan(plan.id)}
                                >
                                  {t("确认删除", "Delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPlans.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-xs text-muted-foreground"
                        >
                          {t("没有匹配的套餐", "No matching packages")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden pb-0 shadow-xs">
              <CardHeader className="border-b px-5 pb-4">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base font-semibold">
                    <h2>
                      {t(
                        "可选加项服务定价 (USD $)",
                        "Optional add-ons (USD $)"
                      )}
                    </h2>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      "客户下单结算时可按需勾选，支持随时新增、编辑或删除。",
                      "Selectable during checkout. Add, edit, toggle, or remove add-ons anytime."
                    )}
                  </span>
                </div>
                <CardAction>
                  <Dialog open={addAddonOpen} onOpenChange={setAddAddonOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        {t("新增加项", "Add add-on")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {t("新增可选加项服务", "Add optional add-on")}
                        </DialogTitle>
                        <DialogDescription>
                          {t(
                            "创建后立即同步到客户结算页的可选加项列表。",
                            "Immediately available for clients to select at checkout."
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={addAddon} className="flex flex-col gap-4">
                        <FieldGroup className="gap-3.5">
                          <Field>
                            <FieldLabel htmlFor="new-addon-zh">
                              {t("中文名称", "Chinese name")}
                            </FieldLabel>
                            <Input
                              id="new-addon-zh"
                              value={newAddonZh}
                              onChange={(event) =>
                                setNewAddonZh(event.target.value)
                              }
                              placeholder={t(
                                "例如：48 小时加急交付",
                                "e.g. 48h Rush Delivery"
                              )}
                              required
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="new-addon-en">
                              {t("英文名称", "English name")}
                            </FieldLabel>
                            <Input
                              id="new-addon-en"
                              value={newAddonEn}
                              onChange={(event) =>
                                setNewAddonEn(event.target.value)
                              }
                              placeholder="48h Rush Delivery"
                              required
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="new-addon-price">
                              {t("加项价格 (USD $)", "Price (USD $)")}
                            </FieldLabel>
                            <Input
                              id="new-addon-price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={newAddonPrice}
                              onChange={(event) =>
                                setNewAddonPrice(event.target.value)
                              }
                              required
                            />
                          </Field>
                        </FieldGroup>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAddAddonOpen(false)}
                          >
                            {t("取消", "Cancel")}
                          </Button>
                          <Button type="submit">
                            {t("确认新增", "Create add-on")}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardAction>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5">
                        {t("加项名称（中 / 英）", "Add-on name (ZH / EN)")}
                      </TableHead>
                      <TableHead className="w-36">
                        {t("加项价格 ($)", "Price ($)")}
                      </TableHead>
                      <TableHead className="w-24 text-center">
                        {t("启用", "Active")}
                      </TableHead>
                      <TableHead className="w-20 px-5 text-right">
                        {t("操作", "Action")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addons.map((addon) => (
                      <TableRow key={addon.id}>
                        <TableCell className="px-5">
                          <div className="grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                            <Input
                              value={addon.zh}
                              required
                              className="h-8 text-sm"
                              aria-label={`${addon.id} 中文名称`}
                              onChange={(event) =>
                                updateAddon(addon.id, {
                                  zh: event.target.value,
                                })
                              }
                            />
                            <Input
                              value={addon.en}
                              required
                              className="h-8 text-sm text-muted-foreground"
                              aria-label={`${addon.id} English name`}
                              onChange={(event) =>
                                updateAddon(addon.id, {
                                  en: event.target.value,
                                })
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <InputGroup className="h-8 w-28 bg-card">
                            <InputGroupAddon>
                              <InputGroupText className="text-xs">
                                $
                              </InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              className="font-mono text-sm tabular-nums"
                              value={addon.price}
                              aria-label={`${addon.id} ${t("价格", "price")}`}
                              onChange={(event) =>
                                updateAddon(addon.id, {
                                  price: Number(event.target.value),
                                })
                              }
                            />
                          </InputGroup>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={addon.active}
                            aria-label={t(
                              `切换 ${addon.zh} 启用状态`,
                              `Toggle ${addon.en}`
                            )}
                            onCheckedChange={(checked) =>
                              updateAddon(addon.id, { active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="px-5 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={t(
                                  `删除 ${addon.zh}`,
                                  `Delete ${addon.en}`
                                )}
                              >
                                <Trash2 aria-hidden="true" className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t(
                                    "确认删除该加项服务？",
                                    "Delete this add-on?"
                                  )}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t(
                                    `删除「${addon.zh}」后客户下单将不再看到此可选项。`,
                                    `Removing "${addon.en}" hides it from future checkouts.`
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t("取消", "Cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeAddon(addon.id)}
                                >
                                  {t("确认删除", "Delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {addons.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-xs text-muted-foreground"
                        >
                          {t(
                            "暂无可选加项服务，点击右上角「新增加项」创建。",
                            "No add-ons yet. Click Add add-on to create one."
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </form>
        )}

        {activeTab === "quote" && can("settings:quotes") && (
          <Card className="shadow-xs">
            <CardContent className="grid items-start gap-8 p-6 lg:grid-cols-12">
              <form
                onSubmit={generateQuote}
                className="flex flex-col gap-5 lg:col-span-6"
              >
                <h2 className="text-base font-semibold">
                  {t("创建人工定制报价单 (USD)", "Create custom quote (USD)")}
                </h2>
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="quote-email">
                      {t("绑定客户邮箱或项目名称", "Client email or project")}
                    </FieldLabel>
                    <Input
                      id="quote-email"
                      className="h-9"
                      value={quoteEmail}
                      onChange={(event) => setQuoteEmail(event.target.value)}
                      placeholder="michael@eduscale.io"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="quote-count">
                        {t("交付视频条数", "Video credits")}
                      </FieldLabel>
                      <Input
                        id="quote-count"
                        type="number"
                        min="1"
                        required
                        className="h-9 font-mono tabular-nums"
                        value={quoteCount}
                        onChange={(event) => setQuoteCount(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="quote-price">
                        {t("报价总额 (USD $)", "Total amount (USD)")}
                      </FieldLabel>
                      <InputGroup className="h-9 bg-card">
                        <InputGroupAddon>
                          <InputGroupText>$</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="quote-price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          className="font-mono tabular-nums"
                          value={quoteAmount}
                          onChange={(event) =>
                            setQuoteAmount(event.target.value)
                          }
                        />
                      </InputGroup>
                    </Field>
                  </div>
                  <Button type="submit" className="self-start">
                    {t("生成 Stripe 付款链接", "Generate Stripe payment link")}
                  </Button>
                </FieldGroup>
              </form>

              <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/25 p-5 lg:col-span-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {t(
                      "专属 Stripe 付款链接（支持 Card / Apple Pay / ACH）",
                      "Dedicated Stripe link (Card / Apple Pay / ACH)"
                    )}
                  </h3>
                  <Badge variant="secondary" className="font-mono">
                    #{quoteRef}
                  </Badge>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5 font-mono text-xs leading-relaxed break-all text-primary">
                  {quoteUrl}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "客户付款成功后将自动创建订单、入账配额并邮件通知制作团队。",
                    "Upon successful payment, the order and video credits are created automatically."
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyQuoteUrl()}
                  >
                    {copiedQuote ? (
                      <Check data-icon="inline-start" aria-hidden="true" />
                    ) : (
                      <Copy data-icon="inline-start" aria-hidden="true" />
                    )}
                    {t("复制链接", "Copy link")}
                  </Button>
                  <ActionLink size="sm" variant="ghost" to={quotePath}>
                    <ExternalLink data-icon="inline-start" aria-hidden="true" />
                    {t("预览结算页", "Preview checkout")}
                  </ActionLink>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "clients" && can("settings:clients") && (
          <div className="grid items-start gap-5 lg:grid-cols-12">
            <Card className="gap-0 overflow-hidden py-0 shadow-xs lg:col-span-4">
              <CardHeader className="flex-row items-center justify-between gap-2 border-b px-4 py-3">
                <CardTitle className="shrink-0 text-sm font-semibold">
                  {t(
                    `客户列表 (${filteredClients.length})`,
                    `Clients (${filteredClients.length})`
                  )}
                </CardTitle>
                <InputGroup className="h-8 max-w-44 bg-muted/40">
                  <InputGroupAddon>
                    <Search aria-hidden="true" className="size-3.5" />
                  </InputGroupAddon>
                  <InputGroupInput
                    value={clientQuery}
                    onChange={(event) => {
                      setClientQuery(event.target.value)
                      setClientPage(1)
                    }}
                    placeholder={t("筛选姓名或邮箱…", "Filter…")}
                    aria-label={t("筛选客户", "Filter clients")}
                    className="text-xs"
                  />
                </InputGroup>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {filteredClients
                  .slice(
                    (clientPage - 1) * clientPageSize,
                    clientPage * clientPageSize
                  )
                  .map((name) => {
                    const ordersForClient = data.orders.filter(
                      (value) => value.client === name
                    )
                    const creditsLeft = ordersForClient.reduce(
                      (sum, item) =>
                        sum +
                        item.count -
                        (item.status === "completed" ? 1 : 0),
                      0
                    )
                    const meta = clientDirectoryMeta[name]
                    const email =
                      name === data.account.name
                        ? data.account.email
                        : (meta?.email ?? "")
                    const isSelected = name === activeClientName
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedClient(name)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 border-l-2 px-4 py-3.5 text-left transition-colors hover:bg-muted/50",
                          isSelected
                            ? "border-l-primary bg-accent/55"
                            : "border-l-transparent"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9 shrink-0">
                            <AvatarImage src={meta?.avatar} alt="" />
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium text-foreground">
                              {name}
                              {meta
                                ? ` · ${meta.company.replace(" (US)", "")}`
                                : ""}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {email}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-medium text-primary tabular-nums">
                          {t(`余 ${creditsLeft} 条`, `${creditsLeft} left`)}
                        </span>
                      </button>
                    )
                  })}
                {filteredClients.length === 0 && (
                  <p className="p-6 text-center text-xs text-muted-foreground">
                    {t("未找到匹配客户", "No matching clients")}
                  </p>
                )}
                <DataPagination
                  compact
                  page={clientPage}
                  pageSize={clientPageSize}
                  total={filteredClients.length}
                  onPageChange={setClientPage}
                />
              </CardContent>
            </Card>

            <Card className="shadow-xs lg:col-span-8">
              {activeClientName ? (
                <FadeTransition key={activeClientName}>
                  <CardContent className="flex flex-col gap-6 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
                      <div className="flex flex-col gap-1">
                        <h2 className="text-base font-semibold text-foreground">
                          {activeClientName} · {activeClientCompany}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {activeClientEmail}
                          {activeClientMeta
                            ? ` · ${activeClientMeta.phone} · ${activeClientMeta.city}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-semibold text-emerald-700">
                          {t("累计付款", "Total paid")}{" "}
                          {formatDollars(activeClientSpend)}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {t(
                            `老客续购资格 · 余 ${activeClientRemaining} 条`,
                            `Repeat discount eligible · ${activeClientRemaining} credits left`
                          )}
                        </div>
                      </div>
                    </div>

                    <section className="flex flex-col gap-2.5">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("历史订单记录", "Order history")}
                      </h3>
                      <div className="divide-y overflow-hidden rounded-xl border border-border">
                        {activeClientOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/35"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="font-mono text-xs font-semibold text-foreground">
                                #{order.id}
                              </span>
                              <span className="truncate text-muted-foreground">
                                {zh ? order.zh : order.en}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-medium text-foreground tabular-nums">
                                {formatDollars(order.total)}
                              </span>
                              <StatusBadge status={order.status} />
                              {can("production:work") && (
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="xs"
                                  className="text-primary"
                                >
                                  <Link
                                    to={href("admin-workspace", {
                                      order: order.id,
                                    })}
                                  >
                                    {t("协同", "Open")}
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="flex flex-col gap-2.5">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t(
                          "已建立的可复用人物资料",
                          "Reusable presenter profiles"
                        )}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(activeClientMeta?.presenters ?? []).map(
                          (presenter) => (
                            <div
                              key={presenter.nameEn}
                              className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3"
                            >
                              <Avatar className="size-10 rounded-lg">
                                <AvatarImage src={presenter.avatar} alt="" />
                                <AvatarFallback className="rounded-lg">
                                  {presenter.nameEn.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-medium">
                                  {zh ? presenter.nameZh : presenter.nameEn}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {zh ? presenter.noteZh : presenter.noteEn}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </section>
                  </CardContent>
                </FadeTransition>
              ) : (
                <Empty className="py-12">
                  <EmptyHeader>
                    <EmptyTitle>
                      {t("请选择左侧客户", "Select a client")}
                    </EmptyTitle>
                  </EmptyHeader>
                </Empty>
              )}
            </Card>
          </div>
        )}
      </main>
    </TeamConsoleLayout>
  )
}
