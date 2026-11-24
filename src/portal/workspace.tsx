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
  Bell,
  CheckCircle2,
  Clapperboard,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FolderOpen,
  Globe,
  Inbox,
  Landmark,
  LayoutGrid,
  MessageSquare,
  Play,
  Plus,
  Receipt,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
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
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
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
  sampleOrder,
  sampleVideo,
  useDemo,
  usePortal,
  type Order,
} from "./demo"
import { downloadFile, downloadOrderFile } from "./files"
import { ActionLink, LanguageSwitch, StatusBadge } from "./layout"
import { EditableOrderTitle } from "./production"
import { WorkbenchLayout } from "./workbench-layout"

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
    isLiveSupabase,
    signOutAll,
    markNotificationRead,
    markAllNotificationsRead,
  } = useDemo()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query] = useSearchParams()

  const orders = data.orders.filter(
    (value) => value.client === data.account.name
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
  const orderParams = { order: contextOrder?.id ?? sampleOrder }

  const isHub =
    pathname.includes("/order-chat") || pathname.includes("/video-review")
  const workspaceTab =
    query.get("tab") === "billing"
      ? "billing"
      : query.get("tab") === "profile"
        ? "profile"
        : "overview"
  const activeNav = isHub ? "hub" : workspaceTab

  const transitionKey = isHub ? "client-hub" : `${pathname}:${workspaceTab}`

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
          label: t("工作台", "Workspace"),
          icon: LayoutGrid,
          active: activeNav === "overview",
          to: href("workspace"),
        },
        {
          label: t("订单与审片", "Orders & review"),
          icon: MessageSquare,
          active: activeNav === "hub",
          badge: pendingReview || undefined,
          to: href(
            pendingReview > 0 ? "video-review" : "order-chat",
            orderParams
          ),
        },
        {
          label: t("账单与发票", "Billing & invoices"),
          icon: CreditCard,
          active: activeNav === "billing",
          to: href("workspace", { tab: "billing" }),
        },
        {
          label: t("个人资料", "Profile"),
          icon: UserRound,
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
                <Bell aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-semibold text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <PopoverHeader>
                  <PopoverTitle className="text-sm font-semibold">
                    {t("消息通知", "Notifications")}
                  </PopoverTitle>
                </PopoverHeader>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
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
              <Separator />
              <div className="flex max-h-80 flex-col divide-y overflow-y-auto">
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
                    return (
                      <Link
                        key={item.id}
                        to={dest}
                        onClick={() => {
                          if (!item.isRead) void markNotificationRead(item.id)
                        }}
                        className="flex items-start gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/60"
                      >
                        <span
                          className={
                            item.isRead
                              ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent"
                              : "mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                          }
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span
                            className={
                              item.isRead
                                ? "truncate text-xs font-medium text-muted-foreground"
                                : "truncate text-xs font-semibold text-foreground"
                            }
                          >
                            {zh ? item.titleZh : item.titleEn}
                          </span>
                          {(zh ? item.bodyZh : item.bodyEn) && (
                            <span className="line-clamp-2 text-xs text-muted-foreground">
                              {zh ? item.bodyZh : item.bodyEn}
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })
                ) : (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                    {t("暂无消息通知", "No notifications yet")}
                  </p>
                )}
              </div>
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Section 1: Account Details */}
      <section className="grid items-start gap-4 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-1 lg:col-span-4 lg:pt-1">
          <h2 className="text-sm font-semibold text-foreground">
            {t("账户资料", "Account details")}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              "用于订单沟通展示、交付通知接收与收据联络信息。",
              "Used across order chat, delivery notifications, and billing receipts."
            )}
          </p>
        </div>

        <Card className="gap-0 overflow-hidden py-0 shadow-xs lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <Avatar className="size-12 shrink-0 rounded-xl border bg-background">
                <AvatarImage
                  src={account.avatarUrl || clientImage}
                  alt=""
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="rounded-xl text-sm font-semibold">
                  {(account.name || account.email || "U")
                    .slice(0, 1)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                  {account.name || t("未设置姓名", "Unnamed account")}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {account.email}
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50/70 text-[11px] font-medium text-emerald-700"
            >
              <span
                className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              {isGoogleLinked
                ? t("Google 已关联", "Google connected")
                : t("已验证账户", "Verified account")}
            </Badge>
          </div>

          <form onSubmit={(event) => void saveProfile(event)}>
            <CardContent className="p-6">
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
                      placeholder={t("选填，如 Apex Labs", "Optional, e.g. Apex Labs")}
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
      </section>

      <Separator />

      {/* Section 2: Presenter Profile Reuse */}
      <section className="grid items-start gap-4 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-1 lg:col-span-4 lg:pt-1">
          <h2 className="text-sm font-semibold text-foreground">
            {t("人物形象档案", "Presenter profile")}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              "再次购买视频套餐时，可直接复用已有的人物外观与声线档案。",
              "Reuse your saved presenter look and voice profile when starting a new order."
            )}
          </p>
        </div>

        <div className="lg:col-span-8">
          <Item
            variant="outline"
            className="rounded-xl bg-card px-5 py-4 shadow-xs"
          >
            <ItemMedia
              variant="icon"
              className="size-9 rounded-lg border bg-muted/40 text-primary"
            >
              <FolderOpen aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {t(
                  `${account.name || "默认"} · 当前人物档案`,
                  `${account.name || "Default"} · Active presenter profile`
                )}
              </ItemTitle>
              <ItemDescription>
                {t(
                  "下单时自动带入已建档人物资料，无需重复拍摄或上传干声。",
                  "Automatically links your existing look and voice assets to the new order."
                )}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <ActionLink
                size="sm"
                to={href("checkout", { profile: name || account.name })}
              >
                {t("复用档案下单", "Reuse for new order")}
              </ActionLink>
            </ItemActions>
          </Item>
        </div>
      </section>

      <Separator />

      {/* Section 3: Preferences */}
      <section className="grid items-start gap-4 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-1 lg:col-span-4 lg:pt-1">
          <h2 className="text-sm font-semibold text-foreground">
            {t("界面偏好", "Preferences")}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              "设置工作台界面语言，切换后即时生效。",
              "Choose your preferred workspace display language."
            )}
          </p>
        </div>

        <div className="lg:col-span-8">
          <Item
            variant="outline"
            className="rounded-xl bg-card px-5 py-4 shadow-xs"
          >
            <ItemMedia
              variant="icon"
              className="size-9 rounded-lg border bg-muted/40 text-muted-foreground"
            >
              <Globe aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{t("显示语言", "Display language")}</ItemTitle>
              <ItemDescription>
                {t(
                  "支持 English 与简体中文随时切换。",
                  "Switch between English and Simplified Chinese anytime."
                )}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <LanguageSwitch />
            </ItemActions>
          </Item>
        </div>
      </section>
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
  const orders = data.orders.filter(
    (value) => value.client === data.account.name
  )
  const active = orders.filter((value) => value.status !== "completed").length
  const delivered = orders.filter((value) => countDeliveredVideos(value) > 0)
  const deliveredVideoTotal = orders.reduce(
    (sum, value) => sum + countDeliveredVideos(value),
    0
  )
  const pendingReview = orders.filter(
    (value) => value.status === "waiting_confirm"
  ).length
  const totalCredits = orders.reduce((sum, value) => sum + value.count, 0)
  const remaining = orders.reduce(
    (sum, value) => sum + Math.max(0, value.count - countDeliveredVideos(value)),
    0
  )
  const creditPercent = totalCredits
    ? Math.round((remaining / totalCredits) * 100)
    : 0
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

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 py-6 sm:px-8">
      <div className="flex flex-col gap-6">
        {tab === "overview" && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="gap-2 shadow-xs">
                <CardHeader className="pb-0">
                  <CardDescription className="text-xs">
                    {t("剩余视频条数", "Remaining credits")}
                  </CardDescription>
                  <CardAction>
                    <Clapperboard
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <strong className="text-2xl font-bold tracking-tight tabular-nums">
                      {remaining}
                    </strong>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      / {totalCredits} {t("条", "total")}
                    </span>
                  </div>
                  <Progress value={creditPercent} className="h-1.5" />
                </CardContent>
              </Card>

              <Card className="gap-2 shadow-xs">
                <CardHeader className="pb-0">
                  <CardDescription className="text-xs">
                    {t("进行中订单", "In progress")}
                  </CardDescription>
                  <CardAction>
                    <Clock
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <strong className="text-2xl font-bold tracking-tight tabular-nums">
                    {active}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {pendingReview > 0
                      ? t(
                          `${pendingReview} 笔待审核初稿`,
                          `${pendingReview} awaiting review`
                        )
                      : t("无待审核项", "No pending reviews")}
                  </span>
                </CardContent>
              </Card>

              <Card className="gap-2 shadow-xs">
                <CardHeader className="pb-0">
                  <CardDescription className="text-xs">
                    {t("已交付成片", "Delivered videos")}
                  </CardDescription>
                  <CardAction>
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-emerald-600"
                    />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <strong className="text-2xl font-bold tracking-tight tabular-nums">
                    {deliveredVideoTotal}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {t("支持在线播放与下载", "Play and download anytime")}
                  </span>
                </CardContent>
              </Card>
            </div>

            <Card className="gap-0 overflow-hidden pb-0 shadow-xs">
              <CardHeader className="flex-row items-center justify-between border-b px-5 py-3.5">
                <CardTitle className="text-base font-semibold">
                  <h2>{t("我的订单", "My orders")}</h2>
                </CardTitle>
                <Tabs value={filter} onValueChange={setFilter}>
                  <TabsList>
                    <TabsTrigger value="all">{t("全部", "All")}</TabsTrigger>
                    <TabsTrigger value="open">
                      {t("进行中", "In progress")}
                    </TabsTrigger>
                    <TabsTrigger value="done">
                      {t("已完成", "Completed")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0">
                {shown.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-5">
                          {t("订单号", "Order")}
                        </TableHead>
                        <TableHead>{t("项目", "Project")}</TableHead>
                        <TableHead>{t("状态", "Status")}</TableHead>
                        <TableHead className="px-5 text-right">
                          {t("操作", "Action")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shown.map((value) => (
                        <TableRow key={value.id}>
                          <TableCell className="px-5 font-mono text-xs text-muted-foreground">
                            #{value.id}
                          </TableCell>
                          <TableCell className="font-medium">
                            <EditableOrderTitle key={value.id} order={value} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={value.status} />
                          </TableCell>
                          <TableCell className="px-5">
                            <div className="flex justify-end gap-2">
                              <ActionLink
                                size="sm"
                                variant="ghost"
                                to={href("order-chat", { order: value.id })}
                              >
                                {t("进入聊天", "Chat")}
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
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Empty className="py-10">
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
                )}
              </CardContent>
            </Card>

            {delivered.length > 0 && (
              <Card className="shadow-xs">
                <CardHeader className="px-5">
                  <CardTitle className="text-base font-semibold">
                    <h2>{t("已交付成片", "Delivered videos")}</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    {delivered.map((value) => (
                      <Card
                        key={value.id}
                        size="sm"
                        className="group gap-0 overflow-hidden py-0 shadow-none transition-shadow hover:shadow-sm"
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
                          <span
                            aria-hidden="true"
                            className="absolute right-2.5 bottom-2.5 flex size-8 items-center justify-center rounded-full bg-brand-navy/85 text-white shadow-sm backdrop-blur-xs transition-transform group-hover:scale-105"
                          >
                            <Play className="size-3.5 fill-current" />
                          </span>
                        </Link>
                        <CardContent className="flex items-center justify-between gap-2 p-3">
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium">
                              {zh ? value.zh : value.en}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              #{value.id}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
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
                </CardContent>
              </Card>
            )}
          </>
        )}

        {tab === "billing" && (
          <div className="flex flex-col gap-4">
            <Card className="gap-0 overflow-hidden py-0 shadow-xs">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
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
                            <TableCell className="text-right font-mono text-sm font-semibold text-foreground tabular-nums">
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
