import { useState, type FormEvent, type ReactNode } from "react"
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router"
import { motion } from "motion/react"
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Film,
  FolderOpen,
  Globe,
  Inbox,
  Landmark,
  Mail,
  MessageSquare,
  Play,
  Plus,
  Receipt,
  ShieldCheck,
  Smartphone,
  Upload,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  clientImage,
  countDeliveredVideos,
  coverImage,
  formatDollars,
  getVersionCode,
  sampleVideo,
  useDemo,
  usePortal,
  type Order,
} from "./demo"
import { downloadFile, downloadOrderFile } from "./files"
import { ActionLink, LanguageSwitch, StatusBadge } from "./layout"
import {
  AppMorphIcon,
  clientNavMorphIcons,
  notificationBellMorphIcons,
} from "./morph-icons"
import { EditableOrderTitle } from "./production"
import { WorkbenchLayout } from "./workbench-layout"

function formatNotificationTime(iso: string, zh: boolean) {
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return ""
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000))
  if (diffMin < 1) return zh ? "刚刚" : "Just now"
  if (diffMin < 60) return zh ? `${diffMin} 分钟前` : `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return zh ? `${diffHour} 小时前` : `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return zh ? `${diffDay} 天前` : `${diffDay}d ago`
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getNotificationVisual(eventType: string) {
  if (eventType === "draft_ready") {
    return {
      icon: Film,
      tone: "border-amber-200/80 bg-amber-50 text-amber-700",
    }
  }
  if (eventType === "final_delivered" || eventType === "order_completed") {
    return {
      icon: CheckCircle2,
      tone: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
    }
  }
  if (eventType === "order_created") {
    return {
      icon: Upload,
      tone: "border-primary/20 bg-primary/8 text-primary",
    }
  }
  return {
    icon: MessageSquare,
    tone: "border-border bg-muted/60 text-muted-foreground",
  }
}

export function RequireClientAuth() {
  const { isLiveSupabase, authLoading, authUser } = useDemo()
  const { locale } = usePortal()
  const { pathname, search } = useLocation()

  if (!isLiveSupabase) return <Outlet />

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  if (!authUser) {
    const redirect = `${pathname}${search}`
    return (
      <Navigate
        to={`/${locale}/auth?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  return <Outlet />
}

export function ClientConsoleShell() {
  const { t, href, zh } = usePortal()
  const {
    data,
    authUser,
    isLiveSupabase,
    signOutAll,
    markNotificationRead,
    markAllNotificationsRead,
  } = useDemo()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query] = useSearchParams()

  const orders = data.orders.filter((value) =>
    authUser && !authUser.isDemo && value.clientId
      ? value.clientId === authUser.id
      : value.client === data.account.name
  )
  const unreadNotifications = data.notifications.filter((item) => !item.isRead)
  const unreadCount = unreadNotifications.length
  const pendingReview = orders.filter(
    (value) => value.status === "waiting_confirm"
  ).length
  const contextOrderId = query.get("order")
  const contextOrder =
    orders.find((value) => value.id === contextOrderId) ??
    orders.find((value) => value.status === "waiting_confirm") ??
    orders[0]
  const orderParams = contextOrder ? { order: contextOrder.id } : undefined

  const isHub =
    pathname.includes("/order-chat") || pathname.includes("/video-review")
  const workspaceTab =
    query.get("tab") === "billing"
      ? "billing"
      : query.get("tab") === "profile"
        ? "profile"
        : "overview"
  const activeNav = isHub ? "hub" : workspaceTab

  const transitionKey = isHub ? "client-hub" : `workspace:${workspaceTab}`

  const heading: ReactNode = (() => {
    if (isHub) {
      return contextOrder ? (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate">
            {t("订单与审片", "Orders & review")} ·{" "}
            <span className="font-mono text-xs">#{contextOrder.id}</span>
          </span>
          <StatusBadge status={contextOrder.status} />
        </div>
      ) : (
        <h1>{t("订单与审片", "Orders & review")}</h1>
      )
    }
    if (workspaceTab === "billing") {
      return <h1>{t("账单与发票", "Billing & invoices")}</h1>
    }
    if (workspaceTab === "profile") {
      return <h1>{t("个人资料", "Profile")}</h1>
    }
    return <h1>{t("工作台", "Workspace")}</h1>
  })()

  return (
    <WorkbenchLayout
      navigationLabel={t("工作台导航", "Workspace navigation")}
      brandTo={href("workspace")}
      items={[
        {
          id: "overview",
          label: t("工作台", "Workspace"),
          morph: clientNavMorphIcons.overview,
          active: activeNav === "overview",
          to: href("workspace"),
        },
        {
          id: "hub",
          label: t("订单与审片", "Orders & review"),
          morph: clientNavMorphIcons.hub,
          active: activeNav === "hub",
          badge: pendingReview || undefined,
          to: href(
            pendingReview > 0 ? "video-review" : "order-chat",
            orderParams
          ),
        },
        {
          id: "billing",
          label: t("账单与发票", "Billing & invoices"),
          morph: clientNavMorphIcons.billing,
          active: activeNav === "billing",
          to: href("workspace", { tab: "billing" }),
        },
        {
          id: "profile",
          label: t("个人资料", "Profile"),
          morph: clientNavMorphIcons.profile,
          active: activeNav === "profile",
          to: href("workspace", { tab: "profile" }),
        },
      ]}
      account={{
        name: data.account.name || data.account.email || "Client",
        detail: data.account.company || data.account.email,
        image: data.account.avatarUrl || clientImage,
      }}
      onSignOut={
        isLiveSupabase
          ? () => {
              void signOutAll().then(() => {
                toast.info(t("已退出登录", "Signed out"))
                void navigate(href("auth"), { replace: true })
              })
            }
          : undefined
      }
      accountActions={
        <DropdownMenuItem asChild>
          <Link to={href("workspace", { tab: "profile" })}>
            <UserRound aria-hidden="true" />
            {t("个人资料", "Profile")}
          </Link>
        </DropdownMenuItem>
      }
      heading={heading}
      actions={
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="relative"
                aria-label={t("通知", "Notifications")}
              >
                <AppMorphIcon
                  icon={
                    unreadCount > 0
                      ? notificationBellMorphIcons.unread
                      : notificationBellMorphIcons.read
                  }
                  size={16}
                  strokeWidth={unreadCount > 0 ? 2.1 : 1.9}
                  spring="snappy"
                  className={
                    unreadCount > 0
                      ? "size-4 text-primary transition-colors duration-200"
                      : "size-4 text-foreground transition-colors duration-200"
                  }
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-semibold text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[360px] gap-0 overflow-hidden rounded-xl p-0 shadow-lg"
            >
              <div className="flex items-center justify-between gap-2 border-b bg-card px-4 py-3">
                <PopoverHeader className="flex-row items-center gap-2">
                  <PopoverTitle className="text-sm font-semibold text-foreground">
                    {t("消息通知", "Notifications")}
                  </PopoverTitle>
                  {unreadCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 rounded-full px-1.5 font-mono text-[11px] tabular-nums"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </PopoverHeader>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      void markAllNotificationsRead()
                      toast.success(
                        t(
                          "已标记全部通知为已读",
                          "All notifications marked read"
                        )
                      )
                    }}
                  >
                    {t("全部已读", "Mark all read")}
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-88">
                <div className="flex flex-col divide-y divide-border/70">
                {data.notifications.length > 0 ? (
                  data.notifications.slice(0, 8).map((item) => {
                    const targetOrder = item.orderId
                      ? orders.find((o) => o.id === item.orderId)
                      : undefined
                    const dest = item.orderId
                      ? href(
                          item.eventType === "draft_ready" ||
                            targetOrder?.status === "waiting_confirm"
                            ? "video-review"
                            : "order-chat",
                          { order: item.orderId }
                        )
                      : href("workspace")
                    const { icon: Icon, tone } = getNotificationVisual(
                      item.eventType
                    )
                    const timeText = formatNotificationTime(item.createdAt, zh)
                    return (
                      <Link
                        key={item.id}
                        to={dest}
                        onClick={() => {
                          if (!item.isRead) void markNotificationRead(item.id)
                        }}
                        className={`group flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/55 ${
                          item.isRead ? "bg-card" : "bg-primary/[0.035]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border transition-opacity ${tone} ${
                            item.isRead ? "opacity-70" : "opacity-100"
                          }`}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={
                                item.isRead
                                  ? "line-clamp-1 text-xs font-medium text-foreground/80"
                                  : "line-clamp-1 text-xs font-semibold text-foreground"
                              }
                            >
                              {zh ? item.titleZh : item.titleEn}
                            </span>
                            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                              {timeText && (
                                <span className="font-mono text-[10px] text-muted-foreground/80 tabular-nums">
                                  {timeText}
                                </span>
                              )}
                              {!item.isRead && (
                                <span
                                  aria-label={t("未读", "Unread")}
                                  className="size-1.5 rounded-full bg-primary"
                                />
                              )}
                            </div>
                          </div>
                          {(zh ? item.bodyZh : item.bodyEn) && (
                            <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {zh ? item.bodyZh : item.bodyEn}
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Bell className="size-4" aria-hidden="true" />
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t("暂无消息通知", "No notifications yet")}
                    </p>
                  </div>
                )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Button asChild size="sm">
            <Link to={href("checkout")}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              {t("再次购买", "Buy a package")}
            </Link>
          </Button>
        </>
      }
    >
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Outlet />
      </motion.div>
    </WorkbenchLayout>
  )
}

function ProfileSettingsView({
  account,
  isGoogleLinked,
  onSave,
}: {
  account: { name: string; email: string; company: string; avatarUrl?: string }
  isGoogleLinked: boolean
  onSave: (profile: {
    name: string
    email: string
    company: string
  }) => Promise<boolean>
}) {
  const { t, href } = usePortal()
  const [name, setName] = useState(account.name)
  const [email, setEmail] = useState(account.email)
  const [company, setCompany] = useState(account.company)
  const [saving, setSaving] = useState(false)

  const isDirty =
    name.trim() !== account.name.trim() ||
    email.trim() !== account.email.trim() ||
    company.trim() !== account.company.trim()

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isDirty || saving) return
    setSaving(true)
    try {
      const ok = await onSave({
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
      })
      if (ok) {
        toast.success(t("个人设置已保存", "Profile settings saved"))
      } else {
        toast.error(
          t("保存失败，请稍后重试。", "Could not save profile. Please try again.")
        )
      }
    } finally {
      setSaving(false)
    }
  }

  function resetDraft() {
    setName(account.name)
    setEmail(account.email)
    setCompany(account.company)
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        {/* 1. Brand Cover Banner */}
        <div className="relative h-32 w-full overflow-hidden bg-brand-navy sm:h-36">
          <img
            src="/portal-media/quote-header-bg.svg"
            alt=""
            className="size-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/50 via-transparent to-transparent" />
          <div className="absolute top-3.5 right-4">
            <Badge
              variant="outline"
              className="border-white/20 bg-brand-navy/65 text-[11px] font-medium text-white backdrop-blur-md"
            >
              <span
                className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              {isGoogleLinked
                ? t("Google 已关联", "Google connected")
                : t("已验证账户", "Verified account")}
            </Badge>
          </div>
        </div>

        {/* 2. Overlapping Avatar + Quick Reuse Action + Identity Meta */}
        <div className="px-6 pb-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="relative -mt-12 flex items-end sm:-mt-14">
              <Avatar className="size-22 rounded-2xl bg-card shadow-md ring-4 ring-card sm:size-24">
                <AvatarImage
                  src={account.avatarUrl || clientImage}
                  alt=""
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="rounded-2xl text-xl font-semibold">
                  {(account.name || account.email || "U")
                    .slice(0, 1)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full bg-emerald-500 ring-2 ring-card"
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ActionLink
                size="sm"
                to={href("checkout", { profile: name || account.name })}
              >
                <FolderOpen data-icon="inline-start" aria-hidden="true" />
                {t("复用人物档案下单", "Reuse presenter profile")}
              </ActionLink>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {account.name || t("未设置姓名", "Unnamed account")}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{account.email}</span>
              </span>
              {account.company && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{account.company}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* 3. Unified Inline Profile Form + Language Preference */}
        <form onSubmit={(event) => void saveProfile(event)}>
          <CardContent className="flex flex-col gap-5 p-6">
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="profile-name">
                    {t("姓名", "Full name")}
                  </FieldLabel>
                  <Input
                    id="profile-name"
                    className="h-9"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-company">
                    {t("公司 / 品牌", "Company / brand")}
                  </FieldLabel>
                  <Input
                    id="profile-company"
                    className="h-9"
                    placeholder={t(
                      "选填，如 Apex Labs",
                      "Optional, e.g. Apex Labs"
                    )}
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="profile-email">
                  {t("联系邮箱", "Email address")}
                </FieldLabel>
                <Input
                  id="profile-email"
                  className="h-9"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
            </FieldGroup>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                  <Globe className="size-4" aria-hidden="true" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {t("界面语言", "Display language")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      "支持 English 与简体中文即时切换",
                      "Switch between English and Simplified Chinese"
                    )}
                  </span>
                </div>
              </div>
              <LanguageSwitch />
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-6 py-3.5">
            <span className="text-xs text-muted-foreground">
              {isDirty
                ? t("有尚未保存的更改", "You have unsaved changes")
                : t("所有资料已是最新", "All changes saved")}
            </span>
            <div className="flex items-center gap-2">
              {isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetDraft}
                  disabled={saving}
                >
                  {t("重置", "Reset")}
                </Button>
              )}
              <Button type="submit" size="sm" disabled={!isDirty || saving}>
                {saving && <Spinner data-icon="inline-start" />}
                {t("保存更改", "Save changes")}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export function WorkspacePage() {
  const { t, href, zh } = usePortal()
  const { data, authUser, saveAccountProfile } = useDemo()
  const [query] = useSearchParams()
  const tab: "overview" | "billing" | "profile" =
    query.get("tab") === "billing"
      ? "billing"
      : query.get("tab") === "profile"
        ? "profile"
        : "overview"
  const [filter, setFilter] = useState("all")
  const orders = data.orders.filter((value) =>
    authUser && !authUser.isDemo && value.clientId
      ? value.clientId === authUser.id
      : value.client === data.account.name
  )
  const active = orders.filter((value) => value.status !== "completed").length
  const delivered = orders.filter((value) => countDeliveredVideos(value) > 0)
  const deliveredVideoTotal = orders.reduce(
    (sum, value) => sum + countDeliveredVideos(value),
    0
  )
  const reviewOrder = orders.find(
    (value) => value.status === "waiting_confirm"
  )
  const assetsOrder = orders.find(
    (value) => value.status === "waiting_assets"
  )
  const focusOrder = reviewOrder ?? assetsOrder
  const pendingReview = orders.filter(
    (value) => value.status === "waiting_confirm"
  ).length
  const shown = orders.filter(
    (value) =>
      filter === "all" || (filter === "done") === (value.status === "completed")
  )

  async function getDelivery(value: Order) {
    const version = value.versions.findLast((item) => item.type === "final")
    try {
      await downloadOrderFile(
        version?.fileId,
        sampleVideo,
        version?.file ?? `${value.id}.mp4`
      )
      toast.success(t("开始下载成片", "Downloading final video"))
    } catch {
      toast.error(
        t(
          "当前成片暂不可下载，请稍后重试或联系制作团队。",
          "This video is temporarily unavailable. Please try again later."
        )
      )
    }
  }

  const firstName = (data.account.name || "").trim().split(/\s+/)[0] || ""

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 py-6 sm:px-8">
      <div className="flex flex-col gap-6">
        {tab === "overview" && (
          <>
            {/* 1. Minimalist Greeting & Inline Status Summary (no generic KPI cards) */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {firstName
                    ? t(`欢迎回来，${firstName}`, `Welcome back, ${firstName}`)
                    : t("工作台概览", "Workspace overview")}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-1.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {t(`${active} 笔进行中`, `${active} in progress`)}
                  </span>
                  {pendingReview > 0 && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
                      <span
                        className="size-1.5 rounded-full bg-amber-500"
                        aria-hidden="true"
                      />
                      {t(
                        `${pendingReview} 笔待审片确认`,
                        `${pendingReview} awaiting review`
                      )}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-1.5 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    {t(
                      `${deliveredVideoTotal} 条已交付成片`,
                      `${deliveredVideoTotal} delivered`
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Subtle Context Action Bar (only shown when action is needed) */}
            {focusOrder && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-xs">
                <div className="flex min-w-0 items-center gap-3.5">
                  {focusOrder.status === "waiting_confirm" ? (
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border bg-brand-navy">
                      <img
                        src={coverImage}
                        alt=""
                        className="size-full object-cover opacity-85"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex size-6 items-center justify-center rounded-full bg-brand-navy/80 text-white">
                          <Play
                            className="size-3 fill-current"
                            aria-hidden="true"
                          />
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-primary">
                      <Upload className="size-4" aria-hidden="true" />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {zh ? focusOrder.zh : focusOrder.en}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] font-normal text-muted-foreground"
                      >
                        #{focusOrder.id}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {focusOrder.status === "waiting_confirm"
                        ? t(
                            "最新预览版已上传，您可以随时在线审片确认或提出修改意见。",
                            "A new preview draft is ready. Watch online to approve or leave revision notes."
                          )
                        : t(
                            "请上传人物素材、声音样本与口播脚本，制作团队确认后即可开工。",
                            "Upload your photos, voice sample, and script so our team can begin production."
                          )}
                    </p>
                  </div>
                </div>
                <ActionLink
                  primary
                  size="sm"
                  to={href(
                    focusOrder.status === "waiting_confirm"
                      ? "video-review"
                      : "order-chat",
                    { order: focusOrder.id }
                  )}
                >
                  {focusOrder.status === "waiting_confirm"
                    ? t("立即审片", "Review draft")
                    : t("上传素材", "Upload materials")}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </ActionLink>
              </div>
            )}

            {/* 3. Refined Orders Table */}
            <Card className="gap-0 overflow-hidden py-0 shadow-xs">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">
                    <h3>{t("我的订单", "My orders")}</h3>
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="font-mono text-[11px] tabular-nums"
                  >
                    {orders.length}
                  </Badge>
                </div>
                <Tabs value={filter} onValueChange={setFilter}>
                  <TabsList>
                    <TabsTrigger value="all" className="text-xs">
                      {t("全部", "All")}
                    </TabsTrigger>
                    <TabsTrigger value="open" className="text-xs">
                      {t("进行中", "In progress")}
                    </TabsTrigger>
                    <TabsTrigger value="done" className="text-xs">
                      {t("已完成", "Completed")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[52%] px-6">
                        {t("项目与订单", "Project")}
                      </TableHead>
                      <TableHead className="w-[26%]">
                        {t("制作状态", "Status")}
                      </TableHead>
                      <TableHead className="w-[22%] px-6 text-right">
                        {t("操作", "Action")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <motion.tbody
                    key={filter}
                    data-slot="table-body"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="[&_tr:last-child]:border-0"
                  >
                    {shown.length > 0 ? (
                      shown.map((value) => {
                        const matchedPlan = data.plans.find(
                          (item) => item.id === value.plan
                        )
                        const planLabel = matchedPlan
                          ? zh
                            ? matchedPlan.zh
                            : matchedPlan.en
                          : t("定制报价", "Custom quote")
                        const latestVersion = value.versions.at(-1)
                        return (
                          <TableRow key={value.id}>
                            <TableCell className="px-6 py-3.5">
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <EditableOrderTitle
                                  key={value.id}
                                  order={value}
                                />
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                  <span className="font-mono">#{value.id}</span>
                                  <span>·</span>
                                  <span className="truncate">{planLabel}</span>
                                  {value.owner && (
                                    <>
                                      <span>·</span>
                                      <span>
                                        {t(
                                          `制作师 ${value.owner}`,
                                          `Producer ${value.owner}`
                                        )}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={value.status} />
                                {latestVersion && (
                                  <Badge
                                    variant="outline"
                                    className="h-5 px-1.5 font-mono text-[10px] font-normal text-muted-foreground uppercase"
                                  >
                                    {latestVersion.type === "final"
                                      ? "FINAL"
                                      : getVersionCode(latestVersion)}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-6">
                              <div className="flex justify-end gap-2">
                                <ActionLink
                                  size="sm"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-foreground"
                                  to={href("order-chat", { order: value.id })}
                                >
                                  {t("沟通", "Chat")}
                                </ActionLink>
                                {value.versions.length > 0 && (
                                  <ActionLink
                                    size="sm"
                                    variant={
                                      value.status === "waiting_confirm"
                                        ? "default"
                                        : "outline"
                                    }
                                    className={
                                      value.status === "waiting_confirm"
                                        ? "bg-brand-navy text-white hover:bg-brand-navy/90"
                                        : undefined
                                    }
                                    to={href("video-review", {
                                      order: value.id,
                                    })}
                                  >
                                    {value.status === "waiting_confirm"
                                      ? t("审核视频", "Review")
                                      : t("查看视频", "Watch")}
                                  </ActionLink>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={3} className="p-0">
                          <Empty className="py-12">
                            <EmptyHeader>
                              <EmptyMedia variant="icon">
                                <Inbox aria-hidden="true" />
                              </EmptyMedia>
                              <EmptyTitle>
                                {t("暂无符合条件的订单", "No matching orders")}
                              </EmptyTitle>
                              <EmptyDescription>
                                {t(
                                  "切换筛选条件，或前往购买新套餐。",
                                  "Switch the filter or purchase a new package."
                                )}
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </TableCell>
                      </TableRow>
                    )}
                  </motion.tbody>
                </Table>
              </CardContent>
            </Card>

            {/* 4. Clean Delivered Videos Gallery (directly on canvas, no nested wrapper box) */}
            {delivered.length > 0 && (
              <section className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Film
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("已交付成片", "Delivered videos")}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="font-mono text-[11px] tabular-nums"
                    >
                      {deliveredVideoTotal}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      "无水印正式成片 · 随时播放与下载",
                      "Watermark-free masters · ready anytime"
                    )}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {delivered.map((value) => (
                    <Card
                      key={value.id}
                      className="group gap-0 overflow-hidden py-0 shadow-xs transition-shadow hover:shadow-md"
                    >
                      <Link
                        to={href("video-review", { order: value.id })}
                        aria-label={t("查看成片", "Watch delivery")}
                        className="relative block overflow-hidden bg-brand-navy"
                      >
                        <img
                          className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          src={coverImage}
                          alt=""
                        />
                        <div className="absolute inset-0 bg-brand-navy/0 transition-colors duration-200 group-hover:bg-brand-navy/20" />
                        <Badge
                          variant="outline"
                          className="pointer-events-none absolute top-2.5 left-2.5 border-white/15 bg-brand-navy/75 font-mono text-[10px] font-medium text-white backdrop-blur-xs"
                        >
                          1080P · {t("无水印", "Clean")}
                        </Badge>
                        <span
                          aria-hidden="true"
                          className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-brand-navy/85 text-white shadow-sm backdrop-blur-xs transition-transform group-hover:scale-105"
                        >
                          <Play className="size-3.5 fill-current" />
                        </span>
                      </Link>
                      <CardContent className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {zh ? value.zh : value.en}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            #{value.id}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => void getDelivery(value)}
                        >
                          <Download
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          {t("下载", "Download")}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "billing" && (
          <div className="flex flex-col gap-4">
            <Card className="gap-0 overflow-hidden py-0 shadow-xs">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
                <div className="flex flex-col gap-0.5">
                  <CardTitle className="text-base font-semibold">
                    <h2>{t("付款与收据记录", "Payment history")}</h2>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t(
                      "查看历史美元支付记录，随时获取 Stripe 官方收据或下载凭证。",
                      "Review past USD payments and download official receipts."
                    )}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-muted/30 font-mono text-[11px] font-medium text-muted-foreground"
                >
                  USD · Stripe
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6">
                          {t("项目与订单号", "Order & package")}
                        </TableHead>
                        <TableHead>{t("支付方式", "Method")}</TableHead>
                        <TableHead>{t("付款状态", "Status")}</TableHead>
                        <TableHead className="text-right">
                          {t("金额 (USD)", "Amount (USD)")}
                        </TableHead>
                        <TableHead className="px-6 text-right">
                          {t("收据", "Receipt")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((value) => {
                        const matchedPlan = data.plans.find(
                          (item) => item.id === value.plan
                        )
                        const planLabel = matchedPlan
                          ? zh
                            ? matchedPlan.zh
                            : matchedPlan.en
                          : t("定制报价", "Custom quote")
                        return (
                          <TableRow key={value.id}>
                            <TableCell className="px-6 py-3.5">
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-sm font-medium text-foreground">
                                  {zh ? value.zh : value.en}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span className="font-mono">#{value.id}</span>
                                  <span>·</span>
                                  <span className="truncate">{planLabel}</span>
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="gap-1.5 font-normal"
                              >
                                {value.method === "apple" ? (
                                  <Smartphone
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                ) : value.method === "ach" ? (
                                  <Landmark
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <CreditCard
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                )}
                                {value.method === "apple"
                                  ? "Apple Pay"
                                  : value.method === "ach"
                                    ? "ACH"
                                    : t("信用卡", "Card")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50/75 text-xs font-medium text-emerald-700"
                              >
                                <span
                                  className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500"
                                  aria-hidden="true"
                                />
                                {t("已支付", "Paid")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                              {formatDollars(value.total)}
                            </TableCell>
                            <TableCell className="px-6 text-right">
                              {value.receiptUrl ? (
                                <Button asChild variant="outline" size="xs">
                                  <a
                                    href={value.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink
                                      data-icon="inline-start"
                                      aria-hidden="true"
                                    />
                                    {t("官方收据", "Stripe receipt")}
                                  </a>
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    downloadFile(
                                      new Blob(
                                        [
                                          `NextGen Avatar Receipt\nOrder: #${value.id}\nProject: ${zh ? value.zh : value.en}\nPackage: ${planLabel}\nStatus: Paid\nAmount Paid (USD): ${formatDollars(value.total)}\nSupport: support@nextgenavatar.com`,
                                        ],
                                        { type: "text/plain" }
                                      ),
                                      `${value.id}-receipt.txt`
                                    )
                                    toast.success(
                                      t("收据已下载", "Receipt downloaded")
                                    )
                                  }}
                                >
                                  <Download
                                    data-icon="inline-start"
                                    aria-hidden="true"
                                  />
                                  {t("下载收据", "Download")}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <Empty className="py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Receipt aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>
                        {t("暂无付款记录", "No billing records yet")}
                      </EmptyTitle>
                      <EmptyDescription>
                        {t(
                          "完成首次套餐下单后，所有交易记录与官方收据将自动同步至此。",
                          "Your invoices and official Stripe receipts will appear here after your first order."
                        )}
                      </EmptyDescription>
                    </EmptyHeader>
                    <ActionLink primary size="sm" to={href("checkout")}>
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      {t("前往选择套餐", "Browse packages")}
                    </ActionLink>
                  </Empty>
                )}
              </CardContent>
              <CardFooter className="border-t bg-muted/20 px-6 py-3">
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck
                    className="size-3.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span>
                    {t(
                      "所有交易均由 Stripe 加密处理；如需企业对公抬头发票，请联系 ",
                      "Payments are securely processed by Stripe. Need a custom company invoice? Contact "
                    )}
                    <a
                      href="mailto:support@nextgenavatar.com"
                      className="font-medium text-foreground underline decoration-border underline-offset-2 hover:text-primary"
                    >
                      support@nextgenavatar.com
                    </a>
                    {t("。", ".")}
                  </span>
                </p>
              </CardFooter>
            </Card>
          </div>
        )}

        {tab === "profile" && (
          <ProfileSettingsView
            key={`${data.account.email}:${data.account.name}:${data.account.company}`}
            account={data.account}
            isGoogleLinked={Boolean(authUser && !authUser.isDemo)}
            onSave={saveAccountProfile}
          />
        )}
      </div>
    </main>
  )
}
