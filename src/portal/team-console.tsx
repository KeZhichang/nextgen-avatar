import { useState, type FormEvent, type ReactNode } from "react"
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router"
import { motion } from "motion/react"
import {
  ClipboardList,
  DollarSign,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Headphones,
  LockKeyhole,
  LogIn,
  Mail,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  sampleOrder,
  studioImage,
  useDemo,
  usePortal,
  useTeamAuth,
  type PermissionKey,
  type TeamRoleId,
} from "./demo"
import { allPermissions, getRoleConfig, type PermissionMeta } from "./rbac"
import {
  ActionLink,
  BrandMark,
  DataPagination,
  FadeTransition,
  LanguageSwitch,
  StatusBadge,
} from "./layout"
import {
  WorkbenchLayout,
  type WorkbenchNavGroup,
  type WorkbenchNavItem,
} from "./workbench-layout"

export type TeamNavKey =
  "orders" | "production" | "pricing" | "quote" | "clients" | "permissions"

export function RequireTeamAuth() {
  const { isAuthenticated, authLoading } = useTeamAuth()
  const { locale } = usePortal()
  const { pathname, search } = useLocation()

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    const redirect = `${pathname}${search}`
    return (
      <Navigate
        to={`/${locale}/admin/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  return <TeamConsoleShell />
}

function resolveActiveNav(pathname: string, tab: string | null): TeamNavKey {
  if (pathname.includes("/admin-workspace")) return "production"
  if (pathname.includes("/admin-permissions")) return "permissions"
  if (pathname.includes("/admin-settings")) {
    if (tab === "quote") return "quote"
    if (tab === "clients") return "clients"
    return "pricing"
  }
  return "orders"
}

function TeamConsoleShell() {
  const { t, zh, href } = usePortal()
  const { data } = useDemo()
  const { member, roleConfig, can, signOutTeam } = useTeamAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query] = useSearchParams()

  const tab = query.get("tab")
  const activeNav = resolveActiveNav(pathname, tab)
  const transitionKey = `${pathname}:${pathname.includes("/admin-settings") ? (tab ?? "pricing") : ""}`

  const canViewAll = can("orders:view_all")
  const visibleOrders = canViewAll
    ? data.orders
    : data.orders.filter((value) => value.owner === member?.name)
  const openCount = visibleOrders.filter(
    (value) => value.status !== "completed"
  ).length
  const contextOrder = query.get("order")
  const studioTarget =
    visibleOrders.find((value) => value.id === contextOrder) ?? visibleOrders[0]

  const heading: ReactNode = (() => {
    switch (activeNav) {
      case "production":
        return studioTarget ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">
              {t("制作协同", "Studio inbox")} ·{" "}
              <span className="font-mono text-xs">#{studioTarget.id}</span>
            </span>
            <StatusBadge status={studioTarget.status} />
          </div>
        ) : (
          <h1>{t("制作协同", "Studio inbox")}</h1>
        )
      case "pricing":
        return <h1>{t("套餐与加项定价", "Package pricing & add-ons")}</h1>
      case "quote":
        return <h1>{t("定制报价链接", "Custom quote link")}</h1>
      case "clients":
        return <h1>{t("客户管理与档案", "Clients & profiles")}</h1>
      case "permissions":
        return <h1>{t("权限与成员", "Roles & access")}</h1>
      default:
        return (
          <h1>
            {canViewAll
              ? t("订单管理与工作列表", "Orders & assignments")
              : t("我的制作任务", "My production tasks")}
          </h1>
        )
    }
  })()

  const workItems: WorkbenchNavItem[] = [
    {
      label: t("订单管理", "Orders"),
      icon: ClipboardList,
      active: activeNav === "orders",
      badge: openCount,
      to: href("admin-orders"),
    },
    ...(can("production:work")
      ? [
          {
            label: t("制作协同", "Production"),
            icon: Headphones,
            active: activeNav === "production",
            to: href("admin-workspace", {
              order: studioTarget?.id ?? sampleOrder,
            }),
          },
        ]
      : []),
  ]

  const operationItems: WorkbenchNavItem[] = [
    ...(can("settings:pricing")
      ? [
          {
            label: t("套餐与定价", "Pricing"),
            icon: DollarSign,
            active: activeNav === "pricing",
            to: href("admin-settings", { tab: "pricing" }),
          },
        ]
      : []),
    ...(can("settings:quotes")
      ? [
          {
            label: t("定制报价", "Custom quotes"),
            icon: FileSpreadsheet,
            active: activeNav === "quote",
            to: href("admin-settings", { tab: "quote" }),
          },
        ]
      : []),
    ...(can("settings:clients")
      ? [
          {
            label: t("客户管理", "Clients"),
            icon: Users,
            active: activeNav === "clients",
            to: href("admin-settings", { tab: "clients" }),
          },
        ]
      : []),
  ]

  const systemItems: WorkbenchNavItem[] = can("team:manage")
    ? [
        {
          label: t("权限与成员", "Roles & access"),
          icon: Shield,
          active: activeNav === "permissions",
          to: href("admin-permissions"),
        },
      ]
    : []

  const groups: WorkbenchNavGroup[] = [
    { label: t("制作中心", "Studio"), items: workItems },
    { label: t("运营配置", "Operations"), items: operationItems },
    { label: t("系统管理", "System"), items: systemItems },
  ]

  return (
    <WorkbenchLayout
      team
      navigationLabel={t("制作后台导航", "Team console navigation")}
      groups={groups}
      brandTo={href("admin-orders")}
      showHomeLink={false}
      onSignOut={() => {
        signOutTeam()
        toast.info(t("已退出后台登录", "Signed out of Studio Console"))
        void navigate(href("admin/login"), { replace: true })
      }}
      account={{
        name: member?.name ?? "Studio",
        detail: roleConfig
          ? zh
            ? roleConfig.zh
            : roleConfig.en
          : t("团队成员", "Team member"),
        image: studioImage,
      }}
      heading={heading}
      actions={null}
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

export function TeamConsoleLayout({
  children,
}: {
  activeNav: TeamNavKey
  heading: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return <>{children}</>
}

export function AdminLoginPage() {
  const { t, zh, href, locale } = usePortal()
  const { data } = useDemo()
  const {
    isAuthenticated,
    isLiveSupabase,
    signInTeam,
    signInTeamWithPassword,
  } = useTeamAuth()
  const [query] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState(() =>
    isLiveSupabase ? "" : (data.teamMembers[0]?.email ?? "")
  )
  const [password, setPassword] = useState(() =>
    isLiveSupabase ? "" : "studio-demo"
  )
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const rawRedirect = query.get("redirect")
  const targetUrl =
    rawRedirect && rawRedirect.startsWith(`/${locale}/admin`)
      ? rawRedirect
      : href("admin-orders")

  if (isAuthenticated) {
    return <Navigate to={targetUrl} replace />
  }

  function loginWithMemberId(memberId: string) {
    const ok = signInTeam(memberId)
    if (!ok) {
      setError(
        t(
          "该账号已被停用，请联系管理员。",
          "This account is disabled. Contact an administrator."
        )
      )
      return
    }
    toast.success(t("已登录制作管理后台", "Signed in to Studio Console"))
    void navigate(targetUrl, { replace: true })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (submitting) return

    if (isLiveSupabase) {
      setSubmitting(true)
      try {
        const res = await signInTeamWithPassword(email.trim(), password)
        if (!res.ok) {
          if (res.reason === "not_team_member") {
            setError(
              t(
                "该账号未被分配后台管理权限，请联系管理员。",
                "This account does not have Studio Console access."
              )
            )
          } else if (res.reason === "account_disabled") {
            setError(
              t(
                "该账号已被管理员停用，无法登录后台。",
                "This account is disabled and cannot sign in."
              )
            )
          } else {
            setError(
              t(
                "工作邮箱或密码不正确，请检查后重试。",
                "Invalid work email or password. Please try again."
              )
            )
          }
          return
        }
        toast.success(t("已登录制作管理后台", "Signed in to Studio Console"))
        void navigate(targetUrl, { replace: true })
      } finally {
        setSubmitting(false)
      }
      return
    }

    const normalized = email.trim().toLowerCase()
    const matched = data.teamMembers.find(
      (item) => item.email.toLowerCase() === normalized
    )
    if (!matched) {
      setError(
        t(
          "未找到该工作邮箱，请联系管理员分配账号。",
          "Work email not found. Ask an administrator to provision your account."
        )
      )
      return
    }
    if (!matched.active) {
      setError(
        t(
          "该账号已被管理员停用，无法登录后台。",
          "This account is disabled and cannot sign in."
        )
      )
      return
    }
    loginWithMemberId(matched.id)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-brand-navy px-4 text-brand-navy-foreground sm:px-6">
        <div className="flex items-center gap-3">
          <BrandMark studio dark />
          <Badge
            variant="outline"
            className="hidden border-white/20 bg-white/10 text-[11px] text-white/85 sm:inline-flex"
          >
            {t("内部制作与管理后台", "Internal Console")}
          </Badge>
        </div>
        <LanguageSwitch dark />
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md shadow-xs">
          <CardHeader className="gap-1.5 text-center">
            <div className="mx-auto mb-1 flex size-10 items-center justify-center rounded-xl bg-brand-navy text-white">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              <h1>{t("登录 NextGen Studio", "Sign in to NextGen Studio")}</h1>
            </CardTitle>
            <CardDescription className="text-xs">
              {t(
                "仅限内部管理员与制作成员使用工作邮箱登录",
                "Internal administrators and production staff only"
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <form onSubmit={(event) => void submit(event)}>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="team-login-email">
                    {t("工作邮箱", "Work email")}
                  </FieldLabel>
                  <InputGroup className="h-9">
                    <InputGroupAddon>
                      <Mail aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="team-login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value)
                        setError("")
                      }}
                      required
                    />
                  </InputGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="team-login-password">
                    {t("密码", "Password")}
                  </FieldLabel>
                  <InputGroup className="h-9">
                    <InputGroupAddon>
                      <LockKeyhole aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="team-login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setError("")
                      }}
                      minLength={6}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        aria-label={
                          showPassword
                            ? t("隐藏密码", "Hide password")
                            : t("显示密码", "Show password")
                        }
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? (
                          <EyeOff aria-hidden="true" />
                        ) : (
                          <Eye aria-hidden="true" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                >
                  <LogIn data-icon="inline-start" aria-hidden="true" />
                  {submitting
                    ? t("正在验证身份…", "Signing in…")
                    : t("登录管理后台", "Sign in")}
                </Button>
              </FieldGroup>
            </form>

            {!isLiveSupabase && (
              <>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Separator className="min-w-0 flex-1" />
                  <span>{t("测试环境账号", "Test environment accounts")}</span>
                  <Separator className="min-w-0 flex-1" />
                </div>

                <div className="flex flex-col gap-2">
                  {data.teamMembers.map((item) => {
                    const role = getRoleConfig(data.teamRoles, item.roleId)
                    return (
                      <Button
                        key={item.id}
                        type="button"
                        variant="outline"
                        disabled={!item.active}
                        className="h-auto justify-between gap-3 px-3 py-2 text-left"
                        onClick={() => loginWithMemberId(item.id)}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar className="size-7">
                            <AvatarFallback className="bg-brand-navy text-[11px] font-semibold text-white">
                              {item.name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium">
                              {item.name}
                            </span>
                            <span className="truncate font-mono text-[11px] text-muted-foreground">
                              {item.email}
                            </span>
                          </span>
                        </span>
                        <Badge
                          variant={
                            item.roleId === "admin" ? "default" : "secondary"
                          }
                        >
                          {role ? (zh ? role.zh : role.en) : item.roleId}
                        </Badge>
                      </Button>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="justify-center text-center text-xs text-muted-foreground">
            {t(
              "内部账号由管理员统一分配，不支持公开注册。",
              "Accounts are provisioned by administrators."
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}

export function AdminPermissionsPage() {
  const { t, zh, href } = usePortal()
  const {
    data,
    isLiveSupabase,
    toggleTeamRolePermission,
    resetTeamRolePermissions,
    addTeamMember,
    updateTeamMember,
  } = useDemo()
  const { member, can } = useTeamAuth()
  const [query, setQuery] = useSearchParams()
  const tab = query.get("tab") === "members" ? "members" : "roles"

  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newRoleId, setNewRoleId] = useState<TeamRoleId>("producer")
  const [memberPage, setMemberPage] = useState(1)
  const [memberPageSize, setMemberPageSize] = useState(10)

  function setTab(next: string) {
    const params = new URLSearchParams(query)
    params.set("tab", next)
    setQuery(params, { replace: true })
  }

  if (!can("team:manage")) {
    return (
      <TeamConsoleLayout
        activeNav="permissions"
        heading={<h1>{t("权限与成员", "Roles & access")}</h1>}
      >
        <main className="flex flex-1 items-center justify-center p-6">
          <Empty className="max-w-md border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldAlert aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {t("无权访问权限管理", "Access restricted")}
              </EmptyTitle>
              <EmptyDescription>
                {t(
                  "当前角色未被分配权限管理权，请联系管理员。",
                  "Your role does not include permission to manage team access."
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

  function togglePermission(roleId: TeamRoleId, permission: PermissionKey) {
    void toggleTeamRolePermission(roleId, permission).then((ok) => {
      if (ok) {
        toast.success(
          t(
            "角色权限已更新并即时生效。",
            "Role permissions updated immediately."
          )
        )
      } else {
        toast.error(
          t("权限更新失败，请稍后重试。", "Could not update role permissions.")
        )
      }
    })
  }

  function resetRoles() {
    void resetTeamRolePermissions().then((ok) => {
      if (ok) {
        toast.success(
          t("已恢复默认角色权限。", "Default role permissions restored.")
        )
      } else {
        toast.error(
          t("恢复默认权限失败，请重试。", "Could not restore default roles.")
        )
      }
    })
  }

  function changeMemberRole(memberId: string, roleId: TeamRoleId) {
    if (memberId === member?.id && roleId !== "admin") {
      toast.error(
        t(
          "不能降级当前登录的管理员账号。",
          "You cannot downgrade your own active administrator account."
        )
      )
      return
    }
    void updateTeamMember(memberId, { roleId }).then((ok) => {
      if (ok) toast.success(t("成员角色已更新。", "Member role updated."))
      else
        toast.error(
          t("成员角色更新失败，请重试。", "Could not update member role.")
        )
    })
  }

  function toggleMemberActive(memberId: string, active: boolean) {
    if (memberId === member?.id && !active) {
      toast.error(
        t("不能停用当前登录的账号。", "You cannot disable your own account.")
      )
      return
    }
    void updateTeamMember(memberId, { active }).then((ok) => {
      if (ok) {
        toast.success(
          active
            ? t("成员账号已启用。", "Member account enabled.")
            : t("成员账号已停用。", "Member account disabled.")
        )
      } else {
        toast.error(
          t("账号状态更新失败，请重试。", "Could not update account status.")
        )
      }
    })
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = newName.trim()
    const cleanEmail = newEmail.trim().toLowerCase()
    if (!cleanName || !cleanEmail) return
    if (
      data.teamMembers.some((item) => item.email.toLowerCase() === cleanEmail)
    ) {
      toast.error(t("该工作邮箱已存在。", "This work email already exists."))
      return
    }
    const ok = await addTeamMember({
      name: cleanName,
      email: cleanEmail,
      roleId: newRoleId,
    })
    if (!ok) {
      toast.error(
        t("创建成员失败，请检查权限后重试。", "Could not create team member.")
      )
      return
    }
    setNewName("")
    setNewEmail("")
    setNewRoleId("producer")
    setAddOpen(false)
    toast.success(
      isLiveSupabase
        ? t(
            `已添加成员 ${cleanName}，对方用该邮箱注册后将自动绑定后台权限。`,
            `Added ${cleanName}. Permissions bind automatically once they sign up with this email.`
          )
        : t(`已创建成员 ${cleanName}。`, `Added ${cleanName}.`)
    )
  }

  const pagedMembers = data.teamMembers.slice(
    (memberPage - 1) * memberPageSize,
    memberPage * memberPageSize
  )

  const groupLabels: Record<PermissionMeta["group"], [string, string]> = {
    orders: ["订单管理", "Orders"],
    production: ["制作协同", "Production"],
    operations: ["运营配置", "Operations"],
    system: ["系统安全", "System"],
  }

  return (
    <TeamConsoleLayout
      activeNav="permissions"
      heading={<h1>{t("权限与成员", "Roles & access")}</h1>}
    >
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-6 sm:px-8">
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="roles">
                {t("角色权限矩阵", "Role permissions")}
              </TabsTrigger>
              <TabsTrigger value="members">
                {t("团队成员", "Team members")} ({data.teamMembers.length})
              </TabsTrigger>
            </TabsList>
            {tab === "roles" ? (
              <Button variant="outline" size="sm" onClick={resetRoles}>
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                {t("恢复默认", "Reset defaults")}
              </Button>
            ) : (
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus data-icon="inline-start" aria-hidden="true" />
                    {t("新增成员", "Add member")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {t("新增后台成员", "Add team member")}
                    </DialogTitle>
                    <DialogDescription>
                      {t(
                        "创建后可使用该工作邮箱从后台登录页进入系统。",
                        "Members sign in via the studio console login page."
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(event) => void addMember(event)}
                    className="flex flex-col gap-4"
                  >
                    <FieldGroup className="gap-4">
                      <Field>
                        <FieldLabel htmlFor="new-member-name">
                          {t("姓名", "Name")}
                        </FieldLabel>
                        <Input
                          id="new-member-name"
                          value={newName}
                          onChange={(event) => setNewName(event.target.value)}
                          placeholder="Liam"
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="new-member-email">
                          {t("工作邮箱", "Work email")}
                        </FieldLabel>
                        <Input
                          id="new-member-email"
                          type="email"
                          value={newEmail}
                          onChange={(event) => setNewEmail(event.target.value)}
                          placeholder="liam@nextgenstudio.io"
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="new-member-role">
                          {t("分配角色", "Role")}
                        </FieldLabel>
                        <Select
                          value={newRoleId}
                          onValueChange={(value) =>
                            setNewRoleId(value as TeamRoleId)
                          }
                        >
                          <SelectTrigger id="new-member-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {data.teamRoles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {zh ? role.zh : role.en}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>
                    <DialogFooter>
                      <Button type="submit">
                        {t("创建账号", "Create account")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <TabsContent value="roles">
            <FadeTransition key="roles">
              <Card className="gap-0 overflow-hidden py-0 shadow-xs">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-5">
                          {t("功能权限", "Permission")}
                        </TableHead>
                        {data.teamRoles.map((role) => (
                          <TableHead
                            key={role.id}
                            className="w-36 px-4 text-center"
                          >
                            <span className="font-medium text-foreground">
                              {zh ? role.zh : role.en}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPermissions.map((perm) => (
                        <TableRow key={perm.key}>
                          <TableCell className="px-5 py-3.5 whitespace-normal">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {zh ? perm.zh : perm.en}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ·{" "}
                                  {t(
                                    groupLabels[perm.group][0],
                                    groupLabels[perm.group][1]
                                  )}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {zh ? perm.descZh : perm.descEn}
                              </span>
                            </div>
                          </TableCell>
                          {data.teamRoles.map((role) => {
                            const checked =
                              role.locked || role.permissions.includes(perm.key)
                            return (
                              <TableCell
                                key={role.id}
                                className="px-4 text-center"
                              >
                                <div className="flex justify-center">
                                  <Switch
                                    checked={checked}
                                    disabled={role.locked}
                                    aria-label={`${zh ? role.zh : role.en} - ${zh ? perm.zh : perm.en}`}
                                    onCheckedChange={() =>
                                      togglePermission(role.id, perm.key)
                                    }
                                  />
                                </div>
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </FadeTransition>
          </TabsContent>

          <TabsContent value="members">
            <FadeTransition key="members">
              <Card className="gap-0 overflow-hidden py-0 shadow-xs">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-5">
                          {t("成员", "Member")}
                        </TableHead>
                        <TableHead>{t("工作邮箱", "Work email")}</TableHead>
                        <TableHead>{t("所属角色", "Role")}</TableHead>
                        <TableHead className="px-5 text-right">
                          {t("状态", "Status")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedMembers.map((item) => {
                        const isSelf = item.id === member?.id
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="px-5">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-8">
                                  <AvatarFallback className="bg-brand-navy text-xs font-semibold text-white">
                                    {item.name.slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{item.name}</span>
                                {isSelf && (
                                  <Badge variant="secondary">
                                    {t("当前登录", "You")}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {item.email}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.roleId}
                                disabled={isSelf}
                                onValueChange={(value) =>
                                  changeMemberRole(item.id, value as TeamRoleId)
                                }
                              >
                                <SelectTrigger
                                  size="sm"
                                  className="w-36 bg-card"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {data.teamRoles.map((role) => (
                                      <SelectItem key={role.id} value={role.id}>
                                        {zh ? role.zh : role.en}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="px-5">
                              <div className="flex items-center justify-end gap-2.5">
                                <span className="text-xs text-muted-foreground">
                                  {item.active
                                    ? t("启用", "Active")
                                    : t("停用", "Disabled")}
                                </span>
                                <Switch
                                  checked={item.active}
                                  disabled={isSelf}
                                  aria-label={t(
                                    `切换 ${item.name} 账号状态`,
                                    `Toggle ${item.name} status`
                                  )}
                                  onCheckedChange={(checked) =>
                                    toggleMemberActive(item.id, checked)
                                  }
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <DataPagination
                    page={memberPage}
                    pageSize={memberPageSize}
                    total={data.teamMembers.length}
                    onPageChange={setMemberPage}
                    onPageSizeChange={(size) => {
                      setMemberPageSize(size)
                      setMemberPage(1)
                    }}
                  />
                </CardContent>
              </Card>
            </FadeTransition>
          </TabsContent>
        </Tabs>
      </main>
    </TeamConsoleLayout>
  )
}
