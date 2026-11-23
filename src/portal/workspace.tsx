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
  FolderOpen,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Play,
  Plus,
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
  coverImage,
  formatDollars,
  sampleOrder,
  sampleVideo,
  useDemo,
  usePortal,
  type Order,
} from "./demo"
import { downloadFile, downloadOrderFile } from "./files"
import { ActionLink, StatusBadge } from "./layout"
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
  const { data, isLiveSupabase, signOutAll, markAllNotificationsRead } =
    useDemo()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query] = useSearchParams()

  const orders = data.orders.filter(
    (value) => value.client === data.account.name
  )
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
                {data.unread && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-semibold text-primary-foreground">
                    {Math.min(orders.length, 3) || 1}
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
                {data.unread && (
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
              <div className="flex flex-col divide-y">
                {orders.slice(0, 3).map((value) => (
                  <Link
                    key={value.id}
                    to={href(
                      value.status === "waiting_confirm"
                        ? "video-review"
                        : "order-chat",
                      { order: value.id }
                    )}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/60"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">
                        {zh ? value.zh : value.en}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        #{value.id}
                      </span>
                    </div>
                    <StatusBadge status={value.status} />
                  </Link>
                ))}
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

function ProfileSettingsCard({
  account,
  title,
  onSave,
}: {
  account: { name: string; email: string; company: string; avatarUrl?: string }
  title: string
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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
  }

  return (
    <Card className="max-w-2xl shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3.5">
          <Avatar className="size-12 rounded-xl border">
            <AvatarImage
              src={account.avatarUrl || clientImage}
              alt=""
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="rounded-xl text-sm font-semibold">
              {(account.name || account.email || "U").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle>
              <h1>{title}</h1>
            </CardTitle>
            <CardDescription className="mt-1">
              {t(
                "更新个人与公司资料，或直接复用当前人物档案下单。",
                "Update your account details or reuse your presenter profile for a new order."
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={(event) => void saveProfile(event)}>
        <CardContent>
          <FieldGroup className="max-w-md gap-4">
            <Field>
              <FieldLabel htmlFor="profile-name">
                {t("姓名", "Name")}
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
              <FieldLabel htmlFor="profile-email">
                {t("邮箱", "Email")}
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
            <Field>
              <FieldLabel htmlFor="profile-company">
                {t("公司", "Company")}
              </FieldLabel>
              <Input
                id="profile-company"
                className="h-9"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex-wrap gap-2.5">
          <Button type="submit">{t("保存设置", "Save settings")}</Button>
          <ActionLink to={href("checkout", { profile: name })}>
            <FolderOpen data-icon="inline-start" aria-hidden="true" />
            {t("复用人物档案下单", "Reuse this profile")}
          </ActionLink>
        </CardFooter>
      </form>
    </Card>
  )
}

export function WorkspacePage() {
  const { t, href, zh } = usePortal()
  const { data, saveAccountProfile } = useDemo()
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
  const delivered = orders.filter((value) => value.status === "completed")
  const pendingReview = orders.filter(
    (value) => value.status === "waiting_confirm"
  ).length
  const totalCredits = orders.reduce((sum, value) => sum + value.count, 0)
  const remaining = orders.reduce(
    (sum, value) => sum + value.count - (value.status === "completed" ? 1 : 0),
    0
  )
  const creditPercent = totalCredits
    ? Math.round((remaining / totalCredits) * 100)
    : 0
  const shown = orders.filter(
    (value) =>
      filter === "all" || (filter === "done") === (value.status === "completed")
  )
  const labels = {
    overview: t("工作台", "Workspace"),
    billing: t("账单与发票", "Billing & invoices"),
    profile: t("个人资料", "Profile"),
  }

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
                    {delivered.length}
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
          <Card className="gap-0 overflow-hidden pb-0 shadow-xs">
            <CardHeader className="border-b pb-4">
              <CardTitle>
                <h1>{labels.billing}</h1>
              </CardTitle>
              <CardDescription>
                {t(
                  "查看历史美元支付记录并下载订单收据。",
                  "Review past USD payments and download order receipts."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">
                      {t("订单号", "Order")}
                    </TableHead>
                    <TableHead>{t("支付方式", "Method")}</TableHead>
                    <TableHead>{t("金额 (USD)", "Amount (USD)")}</TableHead>
                    <TableHead className="px-4 text-right">
                      {t("收据", "Invoice")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((value) => (
                    <TableRow key={value.id}>
                      <TableCell className="px-4 font-mono text-xs text-muted-foreground">
                        #{value.id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {value.method === "apple"
                            ? "Apple Pay"
                            : value.method === "ach"
                              ? "ACH"
                              : t("信用卡", "Card")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {formatDollars(value.total)}
                      </TableCell>
                      <TableCell className="px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            downloadFile(
                              new Blob(
                                [
                                  `NextGen Avatar Receipt\nOrder: ${value.id}\nAmount Paid (USD): ${formatDollars(value.total)}`,
                                ],
                                { type: "text/plain" }
                              ),
                              `${value.id}-invoice.txt`
                            )
                            toast.success(t("收据已下载", "Receipt downloaded"))
                          }}
                        >
                          <Download
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          {t("下载收据", "Download receipt")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {tab === "profile" && (
          <ProfileSettingsCard
            key={`${data.account.email}:${data.account.name}:${data.account.company}`}
            account={data.account}
            title={labels.profile}
            onSave={saveAccountProfile}
          />
        )}
      </div>
    </main>
  )
}
