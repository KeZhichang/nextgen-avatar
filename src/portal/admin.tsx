import { useState } from "react"
import { Link, useSearchParams } from "react-router"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  FileText,
  Film,
  Inbox,
  Mail,
  MessageSquare,
  Paperclip,
  Play,
  Search,
  ShieldAlert,
  UserCheck,
} from "lucide-react"
import { toast } from "sonner"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { cn } from "cn"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CustomQuotesView, PricingCatalogView } from "./admin-operations"
import {
  clientImage,
  countDeliveredVideos,
  entryAttachments,
  formatDollars,
  getVersionCode,
  getVersionItemIndex,
  sampleOrder,
  sampleVideo,
  studioImage,
  useDemo,
  usePortal,
  useTeamAuth,
  type Order,
  type PermissionKey,
  type Status,
} from "./demo"
import { downloadOrderFile } from "./files"
import {
  ActionLink,
  DataPagination,
  FadeTransition,
  SmoothHeight,
  StatusBadge,
} from "./layout"
import { EditableOrderTitle } from "./production"
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

const workflowStages: {
  id: Exclude<Status, "revision">
  zh: string
  en: string
}[] = [
  { id: "waiting_assets", zh: "素材", en: "Materials" },
  { id: "producing", zh: "制作", en: "Production" },
  { id: "waiting_confirm", zh: "审片", en: "Review" },
  { id: "approved", zh: "已确认", en: "Approved" },
  { id: "completed", zh: "已交付", en: "Delivered" },
]

function resolveStageIndex(status: Status): number {
  switch (status) {
    case "waiting_assets":
      return 0
    case "producing":
      return 1
    case "waiting_confirm":
    case "revision":
      return 2
    case "approved":
      return 3
    case "completed":
      return 4
  }
}

function OrderDetailInspector({
  order,
  canAssign,
  canWork,
  canViewClients,
  canViewFinance,
  assignableMembers,
  onAssign,
  onStartProduction,
}: {
  order: Order
  canAssign: boolean
  canWork: boolean
  canViewClients: boolean
  canViewFinance: boolean
  assignableMembers: { id: string; name: string }[]
  onAssign: (id: string, owner: string) => void
  onStartProduction: (order: Order) => Promise<void>
}) {
  const { t, href, zh } = usePortal()
  const { data } = useDemo()
  const [copiedKey, setCopiedKey] = useState<string>("")
  const [starting, setStarting] = useState(false)

  const stageIndex = resolveStageIndex(order.status)
  const isRevision = order.status === "revision"

  const matchedPlan = data.plans.find((item) => item.id === order.plan)
  const planLabel = matchedPlan
    ? zh
      ? matchedPlan.zh
      : matchedPlan.en
    : t("定制报价", "Custom quote")

  const dbClient = data.clients.find((item) => item.name === order.client)
  const presetClient = clientDirectoryMeta[order.client]
  const clientEmail =
    dbClient?.email ||
    presetClient?.email ||
    (order.client === data.account.name ? data.account.email : "")
  const clientCompany = (
    dbClient?.company ||
    presetClient?.company ||
    (order.client === data.account.name ? data.account.company : "")
  ).replace(" (US)", "")
  const clientAvatar =
    dbClient?.avatarUrl ||
    presetClient?.avatar ||
    (order.client === data.account.name ? data.account.avatarUrl : undefined) ||
    clientImage

  const usedCredits = countDeliveredVideos(order)
  const remainingCredits = Math.max(0, order.count - usedCredits)
  const creditPercent = order.count
    ? Math.round((remainingCredits / order.count) * 100)
    : 0

  const uploadedAssets = order.entries.flatMap((entry) =>
    entryAttachments(entry).map((att) => ({
      ...att,
      side: entry.side,
    }))
  )

  const recentEntries = [
    ...(order.demo && order.id === sampleOrder && order.entries.length === 0
      ? [
          {
            id: "inspector-sample-1",
            side: "client" as const,
            text: t(
              "初稿 v1 00:24 处语速稍快，麻烦调整一下。",
              "The pacing at 00:24 in v1 is a little fast. Could you slow it down?"
            ),
          },
          {
            id: "inspector-sample-2",
            side: "studio" as const,
            text: t(
              "收到，修订版 v2 已上传，请在线审片确认或继续提出修改意见。",
              "Updated pacing and uploaded v2. Please review and approve or leave revision notes."
            ),
          },
        ]
      : []),
    ...order.entries,
  ]
    .filter((item) => item.text.trim())
    .slice(-3)
    .reverse()

  const orderedVersions = [...order.versions].reverse()

  function copyValue(key: string, value: string, label: string) {
    if (!value) return
    void navigator.clipboard?.writeText(value).then(
      () => {
        setCopiedKey(key)
        toast.success(label)
        window.setTimeout(() => {
          setCopiedKey((current) => (current === key ? "" : current))
        }, 1600)
      },
      () => {
        toast.error(t("复制失败，请手动复制", "Could not copy to clipboard"))
      }
    )
  }

  function copyOrderSummary() {
    const lines = [
      `Order: #${order.id}`,
      `Project: ${zh ? order.zh : order.en}`,
      `Client: ${order.client}${clientCompany ? ` (${clientCompany})` : ""}`,
      `Status: ${order.status}`,
      `Assigned: ${order.owner || "Unassigned"}`,
      `Package: ${planLabel} (${remainingCredits}/${order.count} credits)`,
      ...(canViewFinance ? [`Payment: ${paymentChannelLabel(order.method, order.total, t)}`] : []),
    ]
    copyValue(
      "summary",
      lines.join("\n"),
      t("已复制订单摘要", "Order summary copied")
    )
  }

  async function handleStart() {
    if (starting) return
    setStarting(true)
    try {
      await onStartProduction(order)
    } finally {
      setStarting(false)
    }
  }

  async function handleDownloadVersion(
    fileId: string | undefined,
    fileName: string
  ) {
    try {
      await downloadOrderFile(fileId, sampleVideo, fileName)
      toast.success(t("开始下载视频", "Downloading video"))
    } catch {
      toast.error(
        t("该视频暂不可下载，请稍后重试。", "Video is temporarily unavailable.")
      )
    }
  }

  async function handleDownloadAsset(fileId: string, fileName: string) {
    if (!fileId) return
    try {
      await downloadOrderFile(fileId, "", fileName)
      toast.success(t("开始下载素材", "Downloading file"))
    } catch {
      toast.error(
        t("该素材暂不可下载，请稍后重试。", "File is temporarily unavailable.")
      )
    }
  }

  return (
    <SheetContent
      side="right"
      className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      closeLabel={t("关闭详情", "Close details")}
    >
      {/* 1. Actionable SaaS Header */}
      <SheetHeader className="gap-2 border-b bg-card px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center gap-2 pr-7">
          <button
            type="button"
            onClick={() =>
              copyValue(
                "order-id",
                order.id,
                t(`已复制订单号 #${order.id}`, `Copied #${order.id}`)
              )
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/50 px-2 py-0.5 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            title={t("点击复制订单号", "Copy order ID")}
          >
            <span>#{order.id}</span>
            {copiedKey === "order-id" ? (
              <Check className="size-3 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy
                className="size-3 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </button>
          <StatusBadge status={order.status} />
        </div>
        <SheetTitle className="sr-only">#{order.id}</SheetTitle>
        <div className="min-w-0">
          <EditableOrderTitle order={order} />
        </div>
        <SheetDescription className="sr-only">
          {zh ? order.zh : order.en}
        </SheetDescription>
      </SheetHeader>

      {/* Scrollable Inspector Body */}
      <ScrollArea className="min-h-0 flex-1 bg-muted/20">
        <div className="flex flex-col gap-4 px-5 py-4">
        {/* 2. Workflow Pipeline Stepper */}
        <section className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              {t("交付流水线进度", "Delivery pipeline")}
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {stageIndex + 1} / {workflowStages.length}
            </span>
          </div>
          <ol className="grid grid-cols-5 gap-1">
            {workflowStages.map((stage, idx) => {
              const done = idx < stageIndex || order.status === "completed"
              const active = idx === stageIndex && order.status !== "completed"
              const warn = active && isRevision
              return (
                <li key={stage.id} className="flex flex-col items-center gap-1.5">
                  <div className="flex w-full items-center">
                    <div
                      className={cn(
                        "h-0.5 flex-1",
                        idx === 0
                          ? "bg-transparent"
                          : idx <= stageIndex
                            ? "bg-primary"
                            : "bg-border"
                      )}
                    />
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : warn
                            ? "border-amber-500 bg-amber-500/15 text-amber-700"
                            : active
                              ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                              : "border-border bg-background text-muted-foreground"
                      )}
                    >
                      {done ? (
                        <Check className="size-3" aria-hidden="true" />
                      ) : warn ? (
                        <AlertTriangle className="size-3" aria-hidden="true" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div
                      className={cn(
                        "h-0.5 flex-1",
                        idx === workflowStages.length - 1
                          ? "bg-transparent"
                          : idx < stageIndex
                            ? "bg-primary"
                            : "bg-border"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-center text-[11px] leading-tight",
                      done || active
                        ? warn
                          ? "font-semibold text-amber-800"
                          : "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {zh ? stage.zh : stage.en}
                  </span>
                </li>
              )
            })}
          </ol>

          {order.status === "waiting_assets" && canWork && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <span className="text-xs text-foreground">
                {order.owner
                  ? t(
                      "已确认素材齐备？可直接推进至制作中。",
                      "Materials ready? Move directly into production."
                    )
                  : t(
                      "请先在下方指派负责制作师，再开始制作。",
                      "Assign a producer below before starting production."
                    )}
              </span>
              <Button
                size="xs"
                disabled={starting || !order.owner}
                onClick={() => void handleStart()}
              >
                <Play data-icon="inline-start" aria-hidden="true" />
                {starting
                  ? t("处理中…", "Updating…")
                  : t("开始制作", "Start production")}
              </Button>
            </div>
          )}

          {order.revision && (
            <div className="mt-3 rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                {t("最新修改意见", "Latest revision note")}
              </div>
              <p className="text-xs leading-relaxed text-amber-950">
                {order.revision}
              </p>
            </div>
          )}
        </section>

        {/* 3A. Client & Assignment Card */}
        <section className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {t("客户与负责人", "Client & assignment")}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar className="size-9 rounded-lg border">
                <AvatarImage
                  src={clientAvatar}
                  alt=""
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="rounded-lg text-xs font-semibold">
                  {order.client.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {order.client}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {clientCompany ||
                    (canViewClients && clientEmail
                      ? clientEmail
                      : t("个人客户", "Individual client"))}
                </div>
              </div>
            </div>

            {canViewClients && clientEmail && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  copyValue(
                    "client-email",
                    clientEmail,
                    t("已复制客户邮箱", "Client email copied")
                  )
                }
                title={clientEmail}
              >
                {copiedKey === "client-email" ? (
                  <Check
                    data-icon="inline-start"
                    className="text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <Mail data-icon="inline-start" aria-hidden="true" />
                )}
                {t("复制邮箱", "Copy email")}
              </Button>
            )}
          </div>

          <Separator className="my-3" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCheck className="size-3.5" aria-hidden="true" />
              <span>{t("负责制作师", "Assigned producer")}</span>
            </div>
            {canAssign && order.status !== "completed" ? (
              <Select
                value={order.owner || "unassigned"}
                onValueChange={(value) => onAssign(order.id, value)}
              >
                <SelectTrigger size="sm" className="h-8 w-40 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="unassigned">
                      {t("待分配", "Unassigned")}
                    </SelectItem>
                    {order.owner &&
                      !assignableMembers.some(
                        (item) => item.name === order.owner
                      ) && (
                        <SelectItem value={order.owner}>
                          {order.owner}
                        </SelectItem>
                      )}
                    {assignableMembers.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <Badge
                variant="secondary"
                title={
                  order.status === "completed"
                    ? t("订单已交付，已锁定负责人", "Delivered orders cannot be reassigned")
                    : undefined
                }
                className={cn(
                  "font-medium",
                  order.status === "completed" &&
                    "bg-muted/70 text-muted-foreground"
                )}
              >
                {order.owner || t("未指派", "Unassigned")}
              </Badge>
            )}
          </div>
        </section>

        {/* 3B. Package, Payment & Credits Card */}
        {canViewFinance && (
          <section className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                {t("套餐与财务信息", "Package & billing")}
              </span>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700"
              >
                <CreditCard className="mr-1 size-3" aria-hidden="true" />
                {paymentChannelLabel(order.method, order.total, t)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg bg-muted/40 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">
                  {t("所选套餐", "Package")}
                </div>
                <div className="mt-0.5 truncate text-xs font-semibold text-foreground">
                  {planLabel}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">
                  {t("已交付 / 总配额", "Delivered / total")}
                </div>
                <div className="mt-0.5 font-mono text-xs font-semibold text-foreground tabular-nums">
                  {usedCredits} / {order.count} {t("条", "videos")}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t("剩余可用配额", "Remaining video credits")}
                </span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {remainingCredits} / {order.count}
                </span>
              </div>
              <Progress value={creditPercent} className="h-1.5" />
            </div>

            {order.paymentSession && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5 text-xs">
                <span className="text-muted-foreground">
                  {t("Stripe 交易号", "Stripe session")}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyValue(
                      "stripe-session",
                      order.paymentSession ?? "",
                      t("已复制交易号", "Stripe session copied")
                    )
                  }
                  className="inline-flex max-w-52 items-center gap-1 truncate font-mono text-[11px] text-foreground hover:text-primary"
                >
                  <span className="truncate">{order.paymentSession}</span>
                  {copiedKey === "stripe-session" ? (
                    <Check
                      className="size-3 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy
                      className="size-3 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {/* 4. Deliverables & Materials / Activity Tabs */}
        <section className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <Tabs defaultValue="deliverables" className="gap-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deliverables" className="gap-1.5 text-xs">
                <Film className="size-3.5" aria-hidden="true" />
                {t("交付版本", "Deliverables")}
                <span className="font-mono text-[11px] opacity-70">
                  ({order.versions.length})
                </span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 text-xs">
                <Paperclip className="size-3.5" aria-hidden="true" />
                {t("素材与动态", "Assets & activity")}
                <span className="font-mono text-[11px] opacity-70">
                  ({uploadedAssets.length + recentEntries.length})
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deliverables" className="m-0">
              {orderedVersions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {orderedVersions.map((ver) => {
                    const itemIdx = getVersionItemIndex(ver)
                    const code = getVersionCode(ver)
                    return (
                    <div
                      key={ver.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/25 p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {itemIdx > 1 && (
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 font-mono text-[10px]"
                            >
                              #{itemIdx}
                            </Badge>
                          )}
                          <Badge
                            variant={
                              ver.type === "final" ? "default" : "secondary"
                            }
                            className="h-5 px-1.5 font-mono text-[10px] uppercase"
                          >
                            {ver.type === "final"
                              ? t("正式版", "Final")
                              : code}
                          </Badge>
                          <span className="truncate text-xs font-medium text-foreground">
                            {ver.itemTitle ||
                              ver.file ||
                              (ver.type === "final"
                                ? `${order.id}-final.mp4`
                                : `${order.id}-${code}.mp4`)}
                          </span>
                        </div>
                        {ver.note && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {ver.note}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        title={t("下载视频", "Download video")}
                        aria-label={t("下载视频", "Download video")}
                        onClick={() =>
                          void handleDownloadVersion(
                            ver.fileId,
                            ver.file || `${order.id}-${ver.id}.mp4`
                          )
                        }
                      >
                        <Download className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  )})}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center">
                  <Film
                    className="mb-1.5 size-5 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                  <div className="text-xs font-medium text-foreground">
                    {t("暂无交付版本", "No video versions yet")}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(
                      "进入制作协同工作台即可上传初稿或正式成片。",
                      "Open studio inbox to upload a draft or final video."
                    )}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="m-0 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Paperclip className="size-3.5" aria-hidden="true" />
                    {t("已传素材", "Files")}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {uploadedAssets.length}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageSquare className="size-3.5" aria-hidden="true" />
                    {t("沟通记录", "Messages")}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {recentEntries.length}
                  </span>
                </div>
              </div>

              {uploadedAssets.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("客户上传文件", "Uploaded files")}
                  </div>
                  {uploadedAssets.slice(0, 4).map((asset) => (
                    <div
                      key={asset.fileId + asset.name}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <FileText
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate font-medium">
                          {asset.name}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("下载文件", "Download file")}
                        onClick={() =>
                          void handleDownloadAsset(asset.fileId, asset.name)
                        }
                      >
                        <Download className="size-3" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {recentEntries.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("最新沟通摘要", "Recent activity")}
                  </div>
                  {recentEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2 text-xs"
                    >
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex size-1.5 rounded-full",
                            entry.side === "client"
                              ? "bg-primary"
                              : "bg-emerald-500"
                          )}
                        />
                        <span className="font-semibold text-foreground">
                          {entry.side === "client"
                            ? order.client
                            : t("制作团队", "Studio team")}
                        </span>
                      </div>
                      <p className="line-clamp-2 leading-relaxed text-muted-foreground">
                        {entry.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                uploadedAssets.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center">
                    <CheckCircle2
                      className="mb-1.5 size-5 text-muted-foreground/60"
                      aria-hidden="true"
                    />
                    <div className="text-xs font-medium text-foreground">
                      {t("暂无素材或沟通记录", "No files or messages yet")}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t(
                        "客户上传参考素材或留言后会实时同步显示在此。",
                        "Client uploads and messages will appear here in real time."
                      )}
                    </p>
                  </div>
                )
              )}
            </TabsContent>
          </Tabs>
        </section>
        </div>
      </ScrollArea>

      {/* 5. Sticky Action Footer */}
      <SheetFooter className="flex-row items-center justify-between gap-2.5 border-t bg-card px-5 py-3.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyOrderSummary}
        >
          {copiedKey === "summary" ? (
            <Check
              data-icon="inline-start"
              className="text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <Copy data-icon="inline-start" aria-hidden="true" />
          )}
          {t("复制摘要", "Copy summary")}
        </Button>
        {canWork && (
          <ActionLink
            primary
            size="sm"
            className="flex-1 sm:flex-none"
            to={href("admin-workspace", { order: order.id })}
          >
            {t("打开制作协同会话", "Open in studio inbox")}
          </ActionLink>
        )}
      </SheetFooter>
    </SheetContent>
  )
}

export function AdminOrdersPage() {
  const { t, href, zh } = usePortal()
  const { data, assignOrderOwner, startOrderProduction } = useDemo()
  const { member, can } = useTeamAuth()
  const [query, setQuery] = useSearchParams()
  const [detailId, setDetailId] = useState("")
  const [detailOpen, setDetailOpen] = useState(false)

  const filter = query.get("status") ?? "all"
  const search = query.get("q") ?? ""
  const rawPage = Number(query.get("page") ?? "1")
  const [pageSize, setPageSize] = useState(10)
  const canViewAll = can("orders:view_all")
  const canAssign = can("orders:assign")
  const canWork = can("production:work")
  const canViewClients = can("settings:clients")

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
                        damping: 34,
                        mass: 0.88,
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

        <Card className="gap-0 overflow-hidden py-0 shadow-xs">
          <CardContent className="p-0">
            <SmoothHeight>
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[22%] px-5">
                      {canViewAll
                        ? t("订单 / Stripe 付款", "Order / Payment")
                        : t("订单", "Order")}
                    </TableHead>
                    <TableHead className="w-[28%]">
                      {canViewAll
                        ? t(
                            "客户 / 套餐与配额",
                            "Client / Package & credits"
                          )
                        : t("制作项目", "Project")}
                    </TableHead>
                    <TableHead className="w-[14%]">
                      {t("制作状态", "Status")}
                    </TableHead>
                    <TableHead className="w-[20%]">
                      {t("负责人", "Assigned to")}
                    </TableHead>
                    <TableHead className="w-[16%] px-5 text-right">
                      {t("操作", "Action")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {active.length > 0 ? (
                      pagedOrders.map((value) => {
                        const plan = data.plans.find(
                          (item) => item.id === value.plan
                        )
                        const dbClient = data.clients.find(
                          (c) =>
                            (value.clientId && c.id === value.clientId) ||
                            c.name === value.client
                        )
                        const meta = clientDirectoryMeta[value.client]
                        const clientCompany = (
                          dbClient?.company ||
                          meta?.company ||
                          ""
                        ).replace(" (US)", "")
                        const isCompleted = value.status === "completed"
                        const deliveredCount = countDeliveredVideos(value)
                        const remaining = Math.max(
                          0,
                          value.count - deliveredCount
                        )
                        const isUrgent =
                          value.status === "revision" ||
                          value.status === "waiting_assets"
                        const isDeliveryReady = value.status === "approved"
                        const firstAssignee =
                          assignableMembers[0]?.name ?? "Leo"
                        return (
                          <motion.tr
                            key={value.id}
                            data-slot="table-row"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              duration: 0.18,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className={cn(
                              "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
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
                                    isCompleted
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
                                {canViewAll && clientCompany && (
                                  <span className="text-xs font-normal text-muted-foreground">
                                    · {clientCompany}
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
                                  {isCompleted
                                    ? t(
                                        `已交付 · ${deliveredCount} 条`,
                                        `Delivered · ${deliveredCount} video${deliveredCount > 1 ? "s" : ""}`
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
                                isCompleted ? (
                                  <div
                                    title={t(
                                      "已交付订单不可重新指派",
                                      "Delivered orders cannot be reassigned"
                                    )}
                                    className="inline-flex h-8 w-36 cursor-not-allowed items-center rounded-md border border-border/60 bg-muted/50 px-2.5 text-xs text-muted-foreground select-none"
                                  >
                                    <span className="truncate">
                                      {value.owner || t("已归档", "Archived")}
                                    </span>
                                  </div>
                                ) : (
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
                                        className="h-8 w-36 bg-card"
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectGroup>
                                          <SelectItem value="unassigned">
                                            {t("待分配", "Unassigned")}
                                          </SelectItem>
                                          {value.owner &&
                                            !assignableMembers.some(
                                              (person) =>
                                                person.name === value.owner
                                            ) && (
                                              <SelectItem value={value.owner}>
                                                {value.owner}
                                              </SelectItem>
                                            )}
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
                                )
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
                                    onClick={() => {
                                      setDetailId(value.id)
                                      setDetailOpen(true)
                                    }}
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
                          </motion.tr>
                        )
                      })
                    ) : (
                      <motion.tr
                        key="admin-orders-empty"
                        data-slot="table-row"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.18,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="border-b hover:bg-transparent"
                      >
                        <TableCell colSpan={5} className="p-0">
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
                        </TableCell>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
              {active.length > 0 && (
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
              )}
            </SmoothHeight>
          </CardContent>
        </Card>
      </main>

      <Sheet
        open={detailOpen && Boolean(current)}
        onOpenChange={setDetailOpen}
      >
        {current && (
          <OrderDetailInspector
            key={current.id}
            order={current}
            canAssign={canAssign}
            canWork={canWork}
            canViewClients={canViewClients}
            canViewFinance={canViewAll}
            assignableMembers={assignableMembers}
            onAssign={assign}
            onStartProduction={async (targetOrder) => {
              const ok = await startOrderProduction(
                targetOrder.id,
                t(
                  "已确认素材并正式开始制作。",
                  "Materials confirmed. Production has started."
                )
              )
              if (ok) {
                toast.success(t("订单已进入制作中", "Order moved to production"))
              } else {
                toast.error(
                  t("状态更新失败，请稍后重试。", "Could not update status.")
                )
              }
            }}
          />
        )}
      </Sheet>
    </TeamConsoleLayout>
  )
}

type SettingsTabId = "pricing" | "quote" | "clients"

export function AdminSettingsPage() {
  const { t, href, zh } = usePortal()
  const { data } = useDemo()
  const { can } = useTeamAuth()
  const [query] = useSearchParams()

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
    (sum, item) => sum + Math.max(0, item.count - countDeliveredVideos(item)),
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
          <PricingCatalogView />
        )}

        {activeTab === "quote" && can("settings:quotes") && (
          <CustomQuotesView />
        )}
        {activeTab === "clients" && can("settings:clients") && (
          <div className="grid items-start gap-5 lg:grid-cols-12">
            <Card className="gap-0 overflow-hidden py-0 shadow-xs lg:col-span-4">
              <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-4 py-3">
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
              <CardContent className="p-0">
                <LayoutGroup id="admin-client-directory-group">
                  <div className="divide-y">
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
                            Math.max(
                              0,
                              item.count - countDeliveredVideos(item)
                            ),
                          0
                        )
                        const dbClient = data.clients.find(
                          (c) => c.name === name
                        )
                        const meta = clientDirectoryMeta[name]
                        const email =
                          dbClient?.email ||
                          (name === data.account.name
                            ? data.account.email
                            : (meta?.email ?? ""))
                        const company = (
                          dbClient?.company ||
                          (name === data.account.name
                            ? data.account.company
                            : (meta?.company ?? ""))
                        ).replace(" (US)", "")
                        const avatar =
                          dbClient?.avatarUrl ||
                          (name === data.account.name
                            ? data.account.avatarUrl
                            : undefined) ||
                          meta?.avatar
                        const isSelected = name === activeClientName
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setSelectedClient(name)}
                            className={cn(
                              "relative flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-200",
                              !isSelected && "hover:bg-muted/50"
                            )}
                          >
                            {isSelected && (
                              <motion.span
                                layoutId="admin-client-row-active"
                                aria-hidden="true"
                                transition={{
                                  type: "spring",
                                  stiffness: 420,
                                  damping: 34,
                                  mass: 0.88,
                                }}
                                className="pointer-events-none absolute inset-0 z-0 bg-accent/60"
                              >
                                <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
                              </motion.span>
                            )}
                            <div className="relative z-10 flex min-w-0 items-center gap-3">
                              <Avatar className="size-9 shrink-0">
                                <AvatarImage
                                  src={avatar}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                />
                                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                  {name.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-medium text-foreground">
                                  {name}
                                  {company ? ` · ${company}` : ""}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {email}
                                </span>
                              </div>
                            </div>
                            <span className="relative z-10 shrink-0 font-mono text-xs font-medium text-primary tabular-nums">
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
                  </div>
                </LayoutGroup>
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
                            `${activeClientOrders.length} 笔订单 · 余 ${activeClientRemaining} 条配额`,
                            `${activeClientOrders.length} orders · ${activeClientRemaining} credits left`
                          )}
                        </div>
                      </div>
                    </div>

                    <section className="flex flex-col gap-2.5">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("历史订单记录", "Order history")}
                      </h3>
                      {activeClientOrders.length > 0 ? (
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
                      ) : (
                        <div className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                          {t("该客户暂无订单记录", "No orders yet for this client")}
                        </div>
                      )}
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
