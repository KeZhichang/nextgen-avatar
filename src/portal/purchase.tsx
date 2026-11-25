import { useEffect, useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { LayoutGroup, motion } from "motion/react"
import {
  Check,
  CheckCircle2,
  Clapperboard,
  Copy,
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckoutPayment } from "./checkout-payment"
import {
  defaultQuote,
  stripePreviewPlans,
  type StripePreviewReceipt,
} from "./checkout-catalog"
import {
  demoClientEmail,
  demoClientPassword,
  demoExperienceEnabled,
  formatDollars,
  isTestEnvironment,
  marketingSiteUrl,
  testEnvAccounts,
  useDemo,
  usePortal,
  type CustomQuoteRecord,
  type Plan,
} from "./demo"
import {
  StripePreviewPayment,
  StripePreviewStatus,
  stripeIsLiveMode,
  stripePreviewConfigured,
} from "./stripe-preview-payment"
import { BackLink, PageWidth, TopBar } from "./layout"

const authModes = ["login", "register", "forgot"] as const
type AuthMode = (typeof authModes)[number]

export function AuthPage() {
  const { href, t, locale } = usePortal()
  const [query] = useSearchParams()
  const navigate = useNavigate()
  const {
    update,
    data,
    isLiveSupabase,
    authLoading,
    authUser,
    signInClient,
    signUpClient,
    signInWithGoogle,
    signInDemoClient,
    sendPasswordReset,
  } = useDemo()
  const [mode, setMode] = useState<AuthMode>(() =>
    query.get("mode") === "register" ? "register" : "login"
  )
  const shouldPrefillDemo = !isLiveSupabase || demoExperienceEnabled
  const [email, setEmail] = useState(() =>
    shouldPrefillDemo && query.get("mode") !== "register"
      ? data.account.email || demoClientEmail
      : ""
  )
  const [password, setPassword] = useState(() =>
    shouldPrefillDemo && query.get("mode") !== "register"
      ? demoClientPassword
      : ""
  )
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const labels = {
    login: t("登录", "Sign in"),
    register: t("注册", "Create account"),
    forgot: t("找回密码", "Reset password"),
  }

  function resolveDestination() {
    const rawRedirect = query.get("redirect")
    if (rawRedirect && rawRedirect.startsWith(`/${locale}/`)) {
      return rawRedirect
    }
    const checkout =
      query.has("plan") || query.has("quote") || rawRedirect === "checkout"
    const next = new URLSearchParams(query)
    next.delete("redirect")
    next.delete("mode")
    return (
      href(checkout ? "checkout" : "workspace") +
      (checkout && next.size ? "?" + next.toString() : "")
    )
  }

  if (isLiveSupabase && authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  if (isLiveSupabase && authUser) {
    return <Navigate to={resolveDestination()} replace />
  }

  function finishDemo(address: string, displayName?: string) {
    update((current) => ({
      ...current,
      account: {
        ...current.account,
        email: address,
        name: displayName || current.account.name,
      },
    }))
    void navigate(resolveDestination())
  }

  async function handleGoogle() {
    setError("")
    const target = new URL(resolveDestination(), window.location.origin).href
    const res = await signInWithGoogle(target)
    if (!res.ok) {
      toast.info(
        res.reason === "not_configured"
          ? t(
              "当前环境尚未配置云端登录服务，请确认已配置环境变量并重新部署。",
              "Cloud sign-in is not configured in this environment yet."
            )
          : t(
              "Google 登录暂时不可用，请稍后重试或使用邮箱密码登录。",
              "Google sign-in is temporarily unavailable. Please try again or continue with email."
            )
      )
    }
  }

  async function quickSignInTestClient() {
    if (submitting) return
    setError("")
    const { email: testEmail, password: testPassword } = testEnvAccounts.client
    setEmail(testEmail)
    setPassword(testPassword)
    if (!isLiveSupabase) {
      finishDemo(testEmail, testEnvAccounts.client.name)
      return
    }
    setSubmitting(true)
    try {
      const res = await signInClient(testEmail, testPassword)
      if (!res.ok) {
        setError(
          t(
            "测试客户账号登录失败，请先在测试 Supabase 执行 supabase/seed_test_environment.sql 初始化账号。",
            "Test account sign-in failed. Run supabase/seed_test_environment.sql in your test Supabase SQL Editor first."
          )
        )
        return
      }
      toast.success(t("已登录测试客户工作台", "Signed in as test client"))
      void navigate(resolveDestination(), { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (submitting) return

    if (mode === "forgot") {
      setSubmitting(true)
      try {
        const redirectTo = new URL(href("auth"), window.location.origin).href
        const res = await sendPasswordReset(email.trim(), redirectTo)
        if (!res.ok) {
          setError(
            t(
              "重置邮件发送失败，请稍后重试。",
              "Could not send reset email. Please try again later."
            )
          )
          return
        }
        setResetSent(true)
        toast.success(
          t(
            "密码重置链接已发送至您的邮箱，请查收。",
            "Password reset link sent. Please check your inbox."
          )
        )
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!isLiveSupabase) {
      finishDemo(email.trim(), name.trim())
      return
    }

    if (
      mode === "login" &&
      demoExperienceEnabled &&
      email.trim().toLowerCase() === demoClientEmail &&
      password === demoClientPassword
    ) {
      signInDemoClient(demoClientEmail)
      toast.success(t("已进入演示工作台", "Signed in to demo workspace"))
      void navigate(resolveDestination(), { replace: true })
      return
    }

    setSubmitting(true)
    try {
      const res =
        mode === "register"
          ? await signUpClient(name.trim(), email.trim(), password)
          : await signInClient(email.trim(), password)
      if (!res.ok) {
        if (res.reason === "confirm_email_required") {
          toast.info(
            t(
              "注册成功，请前往邮箱点击验证链接后再登录。",
              "Account created. Please check your email to confirm before signing in."
            )
          )
          setMode("login")
          return
        }
        setError(
          mode === "register"
            ? t(
                "注册未能完成，该邮箱可能已注册或密码不符合要求。",
                "Could not create account. This email may already be registered."
              )
            : t(
                "邮箱或密码不正确，请检查后重试。",
                "Invalid email or password. Please try again."
              )
        )
        return
      }
      toast.success(
        mode === "register"
          ? t("欢迎加入 NextGen Avatar", "Welcome to NextGen Avatar")
          : t("已登录工作台", "Signed in to workspace")
      )
      void navigate(resolveDestination(), { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t("客户服务平台", "Client Service Platform")}>
        {marketingSiteUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={marketingSiteUrl}>{t("返回官网", "Back to website")}</a>
          </Button>
        ) : null}
      </TopBar>
      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="gap-1.5 text-center">
            <CardTitle className="text-xl font-bold tracking-tight">
              <h1>
                {mode === "login"
                  ? t("登录 NextGen Avatar", "Sign in to NextGen Avatar")
                  : labels[mode]}
              </h1>
            </CardTitle>
            <CardDescription>
              {t(
                "登录您的客户工作台，管理数字人视频订单与成片交付",
                "Manage your avatar video orders, reviews, and deliveries."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Tabs
              value={mode}
              onValueChange={(value) => {
                const nextMode = value as AuthMode
                setMode(nextMode)
                setShowPassword(false)
                setResetSent(false)
                setError("")
                if (
                  nextMode === "register" &&
                  email.trim().toLowerCase() === demoClientEmail &&
                  password === demoClientPassword
                ) {
                  setEmail("")
                  setPassword("")
                } else if (
                  nextMode === "login" &&
                  shouldPrefillDemo &&
                  !email.trim() &&
                  !password
                ) {
                  setEmail(demoClientEmail)
                  setPassword(demoClientPassword)
                }
              }}
            >
              <TabsList
                aria-label={t("账号操作", "Account actions")}
                className="grid w-full grid-cols-3"
              >
                {authModes.map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {labels[value]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {authModes.map((panel) => (
                <TabsContent
                  key={panel}
                  value={panel}
                  className="mt-5 flex flex-col gap-5"
                >
                  {panel !== "forgot" && (
                    <div className="flex flex-col gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full"
                        disabled={submitting}
                        onClick={() => void handleGoogle()}
                      >
                        <img
                          src="/portal-media/google-g.png"
                          width={16}
                          height={16}
                          alt=""
                          data-icon="inline-start"
                        />
                        {t("使用 Google 登录", "Continue with Google")}
                      </Button>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Separator className="min-w-0 flex-1" />
                        <span>
                          {t("或使用工作邮箱密码", "Or continue with email")}
                        </span>
                        <Separator className="min-w-0 flex-1" />
                      </div>
                    </div>
                  )}
                  <form onSubmit={(event) => void submit(event)}>
                    <FieldGroup className="gap-4">
                      {panel === "register" && (
                        <Field>
                          <FieldLabel htmlFor="auth-name">
                            {t("姓名", "Name")}
                          </FieldLabel>
                          <InputGroup className="h-10">
                            <InputGroupAddon>
                              <UserRound aria-hidden="true" />
                            </InputGroupAddon>
                            <InputGroupInput
                              id="auth-name"
                              value={name}
                              onChange={(event) => setName(event.target.value)}
                              autoComplete="name"
                              required
                            />
                          </InputGroup>
                        </Field>
                      )}
                      <Field>
                        <FieldLabel htmlFor={"auth-" + panel + "-email"}>
                          {t("邮箱地址", "Email address")}
                        </FieldLabel>
                        <InputGroup className="h-10">
                          <InputGroupAddon>
                            <Mail aria-hidden="true" />
                          </InputGroupAddon>
                          <InputGroupInput
                            id={"auth-" + panel + "-email"}
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
                      {panel !== "forgot" && (
                        <Field>
                          <FieldLabel htmlFor={"auth-" + panel + "-password"}>
                            {t("密码", "Password")}
                          </FieldLabel>
                          <InputGroup className="h-10">
                            <InputGroupAddon>
                              <LockKeyhole aria-hidden="true" />
                            </InputGroupAddon>
                            <InputGroupInput
                              id={"auth-" + panel + "-password"}
                              type={showPassword ? "text" : "password"}
                              autoComplete={
                                panel === "register"
                                  ? "new-password"
                                  : "current-password"
                              }
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
                                onClick={() =>
                                  setShowPassword((value) => !value)
                                }
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
                      )}
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
                        {submitting ? (
                          <Spinner data-icon="inline-start" />
                        ) : panel === "forgot" ? (
                          <Mail data-icon="inline-start" aria-hidden="true" />
                        ) : (
                          <LogIn data-icon="inline-start" aria-hidden="true" />
                        )}
                        {submitting
                          ? t("正在登录…", "Signing in…")
                          : panel === "login"
                            ? t("登录工作台", "Sign in to workspace")
                            : panel === "forgot"
                              ? t("发送重置链接", "Send reset link")
                              : labels.register}
                      </Button>
                      {panel === "login" && isTestEnvironment && (
                        <div className="flex flex-col gap-3 pt-1">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Separator className="min-w-0 flex-1" />
                            <span>
                              {t("测试环境快捷登录", "Test environment quick sign-in")}
                            </span>
                            <Separator className="min-w-0 flex-1" />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={submitting}
                            className="h-auto justify-between gap-3 px-3 py-2 text-left"
                            onClick={() => void quickSignInTestClient()}
                          >
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-sm font-medium">
                                {testEnvAccounts.client.name}
                              </span>
                              <span className="truncate font-mono text-[11px] text-muted-foreground">
                                {testEnvAccounts.client.email}
                              </span>
                            </span>
                            <Badge variant="secondary">
                              {t("测试客户", "Test client")}
                            </Badge>
                          </Button>
                        </div>
                      )}
                      {panel === "forgot" && resetSent && (
                        <Alert>
                          <CheckCircle2 aria-hidden="true" />
                          <AlertDescription>
                            {t(
                              "密码重置链接已发送至您的邮箱，请查收。",
                              "Password reset link sent. Please check your inbox."
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </FieldGroup>
                  </form>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
          {isTestEnvironment && (
            <CardFooter className="justify-between border-t bg-muted/25 py-3 text-xs text-muted-foreground">
              <span>{t("测试环境 · 内部制作后台", "Test env · Studio Console")}</span>
              <Link
                to={href("admin/login")}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("前往管理后台登录 →", "Studio Console sign in →")}
              </Link>
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  )
}

export function CheckoutPage() {
  const { href, t, zh, locale } = usePortal()
  const [query, setQuery] = useSearchParams()
  const { data, authUser, createOrder, loadCustomQuote } = useDemo()
  const amount = Number(query.get("amount"))
  const quota = Number(query.get("quota"))
  const quote = query.get("quote")?.trim() || ""
  const queryProject = query.get("project")?.trim().slice(0, 80) ?? ""
  const [termsAccepted, setTermsAccepted] = useState(
    () => query.get("terms") === "1" || Boolean(query.get("stripe_session"))
  )
  const [dbQuote, setDbQuote] = useState<CustomQuoteRecord | null>(null)

  useEffect(() => {
    if (!quote) return
    let active = true
    void loadCustomQuote(quote).then((record) => {
      if (active) setDbQuote(record)
    })
    return () => {
      active = false
    }
  }, [quote, loadCustomQuote])

  const activeDbQuote = dbQuote && dbQuote.id === quote ? dbQuote : null
  const quoteBlocked =
    activeDbQuote !== null && activeDbQuote.status !== "open"
  const resolvedQuoteAmount = activeDbQuote?.amountDollars ?? amount
  const resolvedQuoteQuota = activeDbQuote?.videoCount ?? quota
  const resolvedQuoteName = activeDbQuote?.projectName || queryProject || quote
  const quotedPlan: Plan | undefined =
    quote &&
    !quoteBlocked &&
    Number.isFinite(resolvedQuoteAmount) &&
    resolvedQuoteAmount > 0 &&
    Number.isSafeInteger(resolvedQuoteQuota) &&
    resolvedQuoteQuota > 0
      ? {
          id: "quote",
          zh: "定制报价 · " + resolvedQuoteName,
          en: "Custom quote · " + resolvedQuoteName,
          count: resolvedQuoteQuota,
          price: resolvedQuoteAmount,
          active: true,
        }
      : undefined
  const requestedPlanId = query.get("plan")?.trim() || ""
  const activePlans = data.plans.filter((item) => item.active !== false)
  const fallbackRequestedPlan =
    requestedPlanId &&
    !activePlans.some((item) => item.id === requestedPlanId)
      ? stripePreviewPlans.find(
          (item) => item.id === requestedPlanId && item.id !== "quote"
        )
      : undefined
  const basePlans = fallbackRequestedPlan
    ? [fallbackRequestedPlan, ...activePlans]
    : activePlans
  const plans = quotedPlan
    ? [...basePlans, quotedPlan]
    : basePlans.length
      ? basePlans
      : [defaultQuote]
  const ownOrders = data.orders.filter((value) =>
    authUser && !authUser.isDemo && value.clientId
      ? value.clientId === authUser.id
      : value.client === data.account.name
  )
  const isRepeatCustomer = ownOrders.length > 0
  const isTrialLocked = (item: Plan) =>
    item.id === "trial" && isRepeatCustomer
  const isRenewalApplied = (item: Plan) =>
    isRepeatCustomer &&
    item.id !== "quote" &&
    Boolean(item.renewal && item.renewal > 0 && item.renewal < item.price)
  const getEffectivePlanPrice = (item: Plan) =>
    isRenewalApplied(item) && item.renewal ? item.renewal : item.price

  const selectablePlans = plans.filter((item) => !isTrialLocked(item))
  const activeAddons = data.addons.filter((item) => item.active)
  const [choice, setChoice] = useState(() => {
    if (quotedPlan) return "quote"
    if (
      requestedPlanId &&
      selectablePlans.some((item) => item.id === requestedPlanId)
    ) {
      return requestedPlanId
    }
    return selectablePlans[0]?.id ?? plans[0]?.id ?? "presenter-5"
  })
  const requestedTrialWhileRepeat =
    requestedPlanId === "trial" && isRepeatCustomer && !quotedPlan
  const stripeSession = stripePreviewConfigured
    ? query.get("stripe_session")
    : null
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>(
    () => ({
      script: Boolean(stripeSession) && query.get("script") === "1",
      duration: Boolean(stripeSession) && query.get("duration") === "1",
    })
  )
  const [created, setCreated] = useState("")
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState<StripePreviewReceipt>()
  const locked = Boolean(created || stripeSession) || busy
  const chosenPlan = plans.find((item) => item.id === choice)
  const selected =
    (chosenPlan && !isTrialLocked(chosenPlan)
      ? chosenPlan
      : selectablePlans[0]) ?? plans[0]
  const plan =
    plans.find((item) => item.id === receipt?.planId) ??
    stripePreviewPlans.find((item) => item.id === receipt?.planId) ??
    selected
  const effectivePlanPrice = getEffectivePlanPrice(plan)
  const renewalDiscount = isRenewalApplied(plan)
    ? plan.price - effectivePlanPrice
    : 0
  const selectedAddonList = activeAddons.filter(
    (item) => selectedAddons[item.id]
  )
  const addonsTotal = selectedAddonList.reduce(
    (sum, item) => sum + item.price,
    0
  )
  const total = receipt?.total ?? effectivePlanPrice + addonsTotal
  const stripeExtras = {
    script: Boolean(selectedAddons.script),
    duration: Boolean(selectedAddons.duration),
  }
  const stripeAddonPayload = selectedAddonList.map((item) => ({
    name: zh ? item.zh : item.en,
    price: item.price,
  }))
  const useStripe = stripePreviewConfigured && total > 0

  function recordPayment(paid: StripePreviewReceipt) {
    const paidPlan =
      plans.find((item) => item.id === paid.planId) ??
      stripePreviewPlans.find((item) => item.id === paid.planId) ??
      plan
    setReceipt(paid)
    setChoice(paidPlan.id)
    setSelectedAddons(paid.extras)
    setCreated(
      createOrder(paidPlan, paid.total, paid.method, {
        paymentSession: paid.id,
        projectName:
          paidPlan.id === "quote"
            ? resolvedQuoteName
            : queryProject || undefined,
        addonIds: selectedAddonList.map((item) => item.id),
        customQuoteId: paidPlan.id === "quote" && quote ? quote : undefined,
        receiptUrl: paid.receiptUrl,
      })
    )
  }

  function resumeCheckout() {
    setQuery(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete("stripe_session")
        return next
      },
      { replace: true }
    )
  }

  async function copyOrderId(orderId: string) {
    try {
      await navigator.clipboard.writeText(orderId)
      setCopied(true)
      toast.success(t("订单号已复制", "Order ID copied"))
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.info(orderId)
    }
  }

  const trialPlan = plans.find((item) => item.id === "trial")
  const presenterPlans = plans
    .filter((item) => item.id.startsWith("presenter-"))
    .sort((a, b) => a.count - b.count)
  const cinematicPlans = plans
    .filter((item) => item.id.startsWith("cinematic-"))
    .sort((a, b) => a.count - b.count)
  const otherStandardPlans = plans
    .filter(
      (item) =>
        item.id !== "trial" &&
        item.id !== "quote" &&
        !item.id.startsWith("presenter-") &&
        !item.id.startsWith("cinematic-")
    )
    .sort((a, b) => a.count - b.count)

  type PlanFamily = "presenter" | "cinematic" | "other"
  const families: {
    id: PlanFamily
    title: string
    summary: string
    icon: typeof Video
    items: Plan[]
  }[] = [
    ...(presenterPlans.length > 0
      ? [
          {
            id: "presenter" as const,
            title: t("AI 标准版口播", "AI Standard Presenter"),
            summary: t(
              "固定机位自然口播 · 适合科普、教学与品牌日常更新",
              "Fixed-camera natural delivery · Ideal for explainers & FAQs"
            ),
            icon: Video,
            items: presenterPlans,
          },
        ]
      : []),
    ...(cinematicPlans.length > 0
      ? [
          {
            id: "cinematic" as const,
            title: t("AI 电影版口播", "AI Cinematic Presenter"),
            summary: t(
              "多场景多机位运镜 · 适合新品发布、商业广告与品牌片",
              "Multi-scene angles & transitions · Built for launches & brand films"
            ),
            icon: Clapperboard,
            items: cinematicPlans,
          },
        ]
      : []),
    ...(otherStandardPlans.length > 0
      ? [
          {
            id: "other" as const,
            title: t("更多标准套餐", "More Packages"),
            summary: t(
              "更多定制化制作配额方案",
              "Additional production packages"
            ),
            icon: Sparkles,
            items: otherStandardPlans,
          },
        ]
      : []),
  ]

  const derivedFamily: PlanFamily = plan.id.startsWith("cinematic-")
    ? "cinematic"
    : plan.id.startsWith("presenter-")
      ? "presenter"
      : otherStandardPlans.some((item) => item.id === plan.id)
        ? "other"
        : (families[0]?.id ?? "presenter")
  const [preferredFamily, setPreferredFamily] = useState<PlanFamily | null>(null)
  const activeFamilyId =
    plan.id === "trial" || plan.id === "quote"
      ? (preferredFamily ?? families[0]?.id ?? "presenter")
      : derivedFamily
  const activeFamily =
    families.find((f) => f.id === activeFamilyId) ?? families[0]
  const isQuoteSelected = Boolean(quotedPlan && plan.id === "quote")
  const springTransition = {
    type: "spring" as const,
    stiffness: 420,
    damping: 34,
    mass: 0.88,
  }

  function selectFamily(familyId: PlanFamily) {
    if (locked) return
    setPreferredFamily(familyId)
    const target = families.find((f) => f.id === familyId)
    if (target && target.items.length > 0) {
      setChoice(target.items[0].id)
    }
  }

  return (
    <>
      <TopBar title={t("套餐确认与支付 (USD)", "Package & payment (USD)")}>
        <BackLink to={href("workspace")}>
          {t("返回工作台", "Back to workspace")}
        </BackLink>
        <span className="hidden text-xs text-muted-foreground lg:inline">
          {data.account.email}
        </span>
      </TopBar>
      <PageWidth className="grid max-w-6xl items-start gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Left: Two-step Clean SaaS Package Configurator */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          {quoteBlocked && (
            <Alert variant="destructive">
              <AlertTitle>
                {t("该定制报价链接已失效", "This custom quote is no longer open")}
              </AlertTitle>
              <AlertDescription>
                {activeDbQuote?.status === "paid"
                  ? t(
                      "该报价单已完成支付，无需重复付款。您可以直接前往工作台查看订单，或选择下方标准套餐。",
                      "This quote has already been paid. Open your workspace to view the order, or pick a standard package below."
                    )
                  : t(
                      "该报价单已过期或取消，请联系制作团队重新生成链接。",
                      "This quote has expired or been cancelled. Contact the studio for an updated link."
                    )}
              </AlertDescription>
            </Alert>
          )}
          {requestedTrialWhileRepeat && (
            <Alert className="border-amber-300/70 bg-amber-50/70 text-amber-950">
              <AlertTitle>
                {t(
                  "体验单仅限新客首单购买",
                  "Trial video is for first-time customers only"
                )}
              </AlertTitle>
              <AlertDescription className="text-amber-900/90">
                {t(
                  "您的账号已有历史订单，已为您自动切换至月度套餐并开启老客续费优惠价。",
                  "Your account already has a previous order. We switched to a monthly package with your automatic renewal rate."
                )}
              </AlertDescription>
            </Alert>
          )}
          {query.get("profile") && (
            <Alert className="border-primary/20 bg-accent/60">
              <UserRound aria-hidden="true" className="text-primary" />
              <AlertTitle>
                {t("复用人物档案", "Reusing presenter profile")}
              </AlertTitle>
              <AlertDescription>{query.get("profile")}</AlertDescription>
            </Alert>
          )}

          {isQuoteSelected && quotedPlan ? (
            <Card className="gap-0 overflow-hidden py-0 shadow-xs">
              <div className="relative overflow-hidden px-6 py-5 text-white">
                <img
                  src="/portal-media/quote-header-bg.svg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 size-full object-cover"
                />
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium tracking-wider text-white/75 uppercase">
                      {t("专属定制报价单", "Cinematic Custom Quote")} · #{quote}
                    </span>
                    <h1 className="text-xl font-bold tracking-tight text-white">
                      {resolvedQuoteName}
                    </h1>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-mono text-2xl font-bold text-[#ffe8d1]">
                      {formatDollars(quotedPlan.price)}
                    </div>
                    <div className="text-xs text-white/75">
                      {t(
                        `${quotedPlan.count} 条 1080P 成片 · 约 ${formatDollars(Math.round((quotedPlan.price / quotedPlan.count) * 100) / 100)}/条`,
                        `${quotedPlan.count} × 1080P videos · ~${formatDollars(Math.round((quotedPlan.price / quotedPlan.count) * 100) / 100)}/vid`
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <CardFooter className="justify-between bg-card px-6 py-3 text-xs text-muted-foreground">
                <span>
                  {t(
                    "专属定制报价已锁定金额与交付配额。",
                    "Custom quote pricing and video credits are locked."
                  )}
                </span>
                {families.length > 0 && !locked && (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    className="h-auto px-0"
                    onClick={() => setChoice(families[0].items[0].id)}
                  >
                    {t("改选标准套餐", "Switch to standard plans")}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ) : (
            <Card className="shadow-xs">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b pb-4">
                <div className="flex flex-col gap-0.5">
                  <CardTitle className="text-base font-semibold">
                    <h1>
                      {t("配置您的制作套餐", "Configure your package")}
                    </h1>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t(
                      "按需单次结算，无强制自动续费 · 成片均为 1080P 高清交付",
                      "One-time purchase, no auto-renewal · All videos delivered in 1080P"
                    )}
                  </CardDescription>
                </div>
                {isRepeatCustomer ? (
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-emerald-200 bg-emerald-50/80 text-emerald-800"
                  >
                    <span
                      className="size-1.5 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    {t("老客续费价已生效", "Renewal pricing active")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {t("新客首单", "First-time order")}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="flex flex-col gap-6 pt-5">
                {/* Step 1: Production Style (Family Switcher) */}
                {families.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold tracking-wide text-muted-foreground uppercase">
                        {t("1. 选择制作风格", "1. Production style")}
                      </span>
                      {quotedPlan && !locked && (
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          className="h-auto px-0"
                          onClick={() => setChoice("quote")}
                        >
                          {t(`返回定制报价 #${quote}`, `Back to quote #${quote}`)}
                        </Button>
                      )}
                    </div>
                    <LayoutGroup id="checkout-family-cards-group">
                      <div
                        className={cn(
                          "grid gap-3",
                          families.length === 1
                            ? "grid-cols-1"
                            : "grid-cols-1 sm:grid-cols-2"
                        )}
                      >
                        {families.map((family) => {
                          const Icon = family.icon
                          const isFamilyActive =
                            plan.id !== "trial" &&
                            plan.id !== "quote" &&
                            activeFamily?.id === family.id
                          const lowestPerVideo = Math.min(
                            ...family.items.map(
                              (item) => getEffectivePlanPrice(item) / item.count
                            )
                          )
                          return (
                            <button
                              key={family.id}
                              type="button"
                              disabled={locked}
                              onClick={() => selectFamily(family.id)}
                              className={cn(
                                "relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors duration-200",
                                isFamilyActive
                                  ? "z-10 border-transparent bg-card"
                                  : "z-0 border-border bg-card hover:border-primary/40 hover:bg-accent/35",
                                locked && "cursor-not-allowed opacity-70"
                              )}
                            >
                              {isFamilyActive && (
                                <motion.span
                                  layoutId="checkout-family-active-card"
                                  aria-hidden="true"
                                  transition={springTransition}
                                  className="pointer-events-none absolute inset-0 z-0 rounded-xl border-2 border-primary bg-accent/55"
                                />
                              )}
                              <div className="relative z-10 flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                                  <span
                                    className={cn(
                                      "flex size-7 items-center justify-center rounded-lg border transition-colors",
                                      isFamilyActive
                                        ? "border-primary/25 bg-primary text-primary-foreground"
                                        : "border-border bg-muted/60 text-muted-foreground"
                                    )}
                                  >
                                    <Icon
                                      aria-hidden="true"
                                      className="size-3.5"
                                    />
                                  </span>
                                  <span className="text-sm">{family.title}</span>
                                </span>
                                <span className="font-mono text-xs font-medium text-primary tabular-nums">
                                  {formatDollars(
                                    Math.round(lowestPerVideo * 10) / 10
                                  )}
                                  {t("/条起", "/vid+")}
                                </span>
                              </div>
                              <p className="relative z-10 text-xs leading-relaxed text-muted-foreground">
                                {family.summary}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </LayoutGroup>
                  </div>
                )}

                {/* Step 2: Video Quantity Tier Grid */}
                {activeFamily && activeFamily.items.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold tracking-wide text-muted-foreground uppercase">
                        {t("2. 选择视频条数", "2. Video quantity")}
                      </span>
                      <span className="text-muted-foreground">
                        {isRepeatCustomer
                          ? t("以下均为老客续费实付价", "Returning-customer renewal rates shown")
                          : t("次月续购自动直降 $100", "Save $100 automatically on renewals")}
                      </span>
                    </div>
                    <LayoutGroup id={`checkout-tier-grid-${activeFamily.id}`}>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {activeFamily.items.map((item) => {
                          const isSelected = plan.id === item.id
                          const renewalActive = isRenewalApplied(item)
                          const displayPrice = getEffectivePlanPrice(item)
                          const strikePrice = renewalActive
                            ? item.price
                            : item.regular && item.regular > item.price
                              ? item.regular
                              : undefined
                          const perVideo = displayPrice / item.count
                          const showPopularBadge =
                            item.id === "presenter-5" ||
                            item.id === "cinematic-6"
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={locked}
                              onClick={() => setChoice(item.id)}
                              className={cn(
                                "relative flex flex-col justify-between gap-3 rounded-xl border p-4 text-left transition-colors duration-200",
                                isSelected
                                  ? "z-10 border-transparent bg-card"
                                  : "z-0 border-border bg-card hover:border-primary/40 hover:bg-accent/35",
                                locked && "cursor-not-allowed opacity-70"
                              )}
                            >
                              {isSelected && (
                                <motion.span
                                  layoutId={`checkout-tier-active-${activeFamily.id}`}
                                  aria-hidden="true"
                                  transition={springTransition}
                                  className="pointer-events-none absolute inset-0 z-0 rounded-xl border-2 border-primary bg-accent/60"
                                />
                              )}
                              <div className="relative z-10 flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {t(
                                    `${item.count} 条视频`,
                                    `${item.count} videos`
                                  )}
                                </span>
                                {showPopularBadge && (
                                  <Badge
                                    variant="outline"
                                    className="border-brand-gold/50 bg-brand-gold/15 px-1.5 py-0 text-[10px] text-amber-900"
                                  >
                                    {t("推荐", "Popular")}
                                  </Badge>
                                )}
                              </div>
                              <div className="relative z-10 flex items-baseline gap-1.5 tabular-nums">
                                <span className="text-2xl font-bold tracking-tight text-foreground">
                                  {formatDollars(displayPrice)}
                                </span>
                                {strikePrice && (
                                  <span className="text-xs text-muted-foreground line-through">
                                    {formatDollars(strikePrice)}
                                  </span>
                                )}
                              </div>
                              <div className="relative z-10 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground tabular-nums">
                                <span>
                                  {t("折合单条", "Per video")}
                                </span>
                                <span className="font-mono font-medium text-foreground">
                                  {formatDollars(
                                    Math.round(perVideo * 10) / 10
                                  )}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </LayoutGroup>
                  </div>
                )}

                {/* First-time Customer Trial Banner (hidden for returning customers to eliminate clutter) */}
                {trialPlan && !isRepeatCustomer && (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setChoice(trialPlan.id)}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
                      plan.id === trialPlan.id
                        ? "border-primary bg-accent/60 ring-1 ring-primary"
                        : "border-dashed border-border bg-muted/25 hover:border-primary/40 hover:bg-accent/30",
                      locked && "cursor-not-allowed opacity-70"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                          plan.id === trialPlan.id
                            ? "border-primary/30 bg-primary text-primary-foreground"
                            : "border-border bg-card text-primary"
                        )}
                      >
                        <Sparkles aria-hidden="true" className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                          <span>{zh ? trialPlan.zh : trialPlan.en}</span>
                          <Badge
                            variant="outline"
                            className="border-brand-gold/50 bg-brand-gold/15 px-1.5 py-0 text-[10px] text-amber-900"
                          >
                            {t("新客首单专享", "New customers")}
                          </Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(
                            "先用 1 条成片验证数字人形象与配音效果，后续首购月度套餐直享续费价",
                            "Test your digital presenter with 1 video first, then unlock renewal pricing on your first monthly pack"
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                      {formatDollars(trialPlan.price)}
                    </span>
                  </button>
                )}

                {/* Step 3: Optional Add-ons (Compact 2-col Grid inside same visual flow) */}
                {activeAddons.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2.5">
                      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {t("3. 可选加项服务", "3. Optional add-ons")}
                      </span>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {activeAddons.map((addon) => (
                          <Label
                            key={addon.id}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3 transition-colors hover:border-primary/40 hover:bg-accent/35 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/55",
                              locked && "cursor-not-allowed opacity-70"
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium">
                              <Checkbox
                                disabled={locked}
                                checked={Boolean(selectedAddons[addon.id])}
                                onCheckedChange={(checked) =>
                                  setSelectedAddons((value) => ({
                                    ...value,
                                    [addon.id]: checked === true,
                                  }))
                                }
                              />
                              <span className="truncate">
                                {zh ? addon.zh : addon.en}
                              </span>
                            </span>
                            <span className="shrink-0 font-mono text-xs font-semibold text-foreground tabular-nums">
                              +{formatDollars(addon.price)}
                            </span>
                          </Label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Sticky Stripe Checkout Summary Card */}
        <Card className="shadow-xs lg:sticky lg:top-20 lg:col-span-5">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">
              <h2>{t("订单结算", "Order summary")}</h2>
            </CardTitle>
            <CardDescription className="text-xs">
              {t("美元 (USD) · 安全加密支付", "US Dollars (USD) · Encrypted checkout")}
            </CardDescription>
            <CardAction>
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck aria-hidden="true" />
                Stripe
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-5">
            <div className="flex flex-col gap-2.5 rounded-xl border border-border/80 bg-muted/25 p-3.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold text-foreground">
                    {zh ? plan.zh : plan.en}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      `${plan.count} 条 1080P 成片配额`,
                      `${plan.count} × 1080P video ${plan.count === 1 ? "credit" : "credits"}`
                    )}
                  </span>
                </div>
                <span className="shrink-0 font-mono font-semibold text-foreground tabular-nums">
                  {formatDollars(
                    renewalDiscount > 0
                      ? plan.price
                      : plan.regular && plan.regular > plan.price
                        ? plan.regular
                        : effectivePlanPrice
                  )}
                </span>
              </div>
              {renewalDiscount > 0 ? (
                <div className="flex items-center justify-between text-xs text-emerald-700">
                  <span>{t("老客续费优惠", "Returning-customer renewal")}</span>
                  <span className="font-mono font-medium tabular-nums">
                    −{formatDollars(renewalDiscount)}
                  </span>
                </div>
              ) : (
                plan.regular &&
                plan.regular > plan.price && (
                  <div className="flex items-center justify-between text-xs text-emerald-700">
                    <span>{t("套餐立减", "Package discount")}</span>
                    <span className="font-mono font-medium tabular-nums">
                      −{formatDollars(plan.regular - plan.price)}
                    </span>
                  </div>
                )
              )}
              {selectedAddonList.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between text-xs text-muted-foreground"
                >
                  <span>{zh ? addon.zh : addon.en}</span>
                  <span className="font-mono tabular-nums">
                    +{formatDollars(addon.price)}
                  </span>
                </div>
              ))}
              <Separator className="my-0.5" />
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground">
                  {t("应付总额", "Total due")}
                </span>
                <strong className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {formatDollars(total)}
                </strong>
              </div>
            </div>

            {!created && !stripeSession && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/80 bg-muted/25 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <Checkbox
                  checked={termsAccepted}
                  disabled={locked}
                  onCheckedChange={(checked) =>
                    setTermsAccepted(checked === true)
                  }
                  className="mt-0.5"
                />
                <span>
                  {t("我已确认订单明细并同意 ", "I have reviewed this order and agree to the ")}
                  <a
                    href={`${marketingSiteUrl || "https://nextgenavatar.com"}/forms/nextgenavatar-standard-service-terms-2026-11-24-review.txt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline decoration-border underline-offset-2 hover:text-primary"
                  >
                    {t("标准制作服务条款", "Standard Production Terms")}
                  </a>
                  {t(" 及 ", " and ")}
                  <a
                    href={`${marketingSiteUrl || "https://nextgenavatar.com"}/refund-policy`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline decoration-border underline-offset-2 hover:text-primary"
                  >
                    {t("账单与退款说明", "Billing & refunds")}
                  </a>
                  {t("。", ".")}
                </span>
              </label>
            )}

            {created ? (
              <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  />
                  <div className="flex flex-col gap-1">
                    <strong className="text-sm font-semibold">
                      {t(
                        "付款成功，订单已创建",
                        "Payment complete. Your order is ready."
                      )}
                    </strong>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-card font-mono text-emerald-900"
                      >
                        #{created}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("复制订单号", "Copy order ID")}
                        onClick={() => void copyOrderId(created)}
                      >
                        {copied ? (
                          <Check aria-hidden="true" />
                        ) : (
                          <Copy aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <Button asChild size="lg" className="w-full">
                  <Link to={href("order-chat", { order: created })}>
                    {t(
                      "进入订单聊天传素材",
                      "Open order chat and upload materials"
                    )}
                  </Link>
                </Button>
              </div>
            ) : stripeSession && stripePreviewConfigured ? (
              <StripePreviewStatus
                key={stripeSession}
                sessionId={stripeSession}
                onPaid={recordPayment}
                reset={resumeCheckout}
              />
            ) : useStripe ? (
              <StripePreviewPayment
                key={`${locale}:${plan.id}:${effectivePlanPrice}:${total}`}
                planId={plan.id}
                planName={zh ? plan.zh : plan.en}
                planPrice={effectivePlanPrice}
                videoCount={plan.count}
                extras={stripeExtras}
                addons={stripeAddonPayload}
                addonIds={selectedAddonList.map((item) => item.id)}
                clientId={authUser && !authUser.isDemo ? authUser.id : undefined}
                customerEmail={authUser?.email || data.account.email || undefined}
                customQuoteId={plan.id === "quote" && quote ? quote : undefined}
                projectName={
                  plan.id === "quote"
                    ? resolvedQuoteName
                    : queryProject || undefined
                }
                canSubmit={termsAccepted}
                total={total}
                setBusy={setBusy}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {stripePreviewConfigured && !stripeIsLiveMode && (
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "测试支付模式，确认后将自动创建订单。",
                      "Test payment mode. Your order will be created upon confirmation."
                    )}
                  </p>
                )}
                <CheckoutPayment
                  total={total}
                  email={data.account.email}
                  onPay={(method) => {
                    if (!termsAccepted) {
                      toast.warning(
                        t(
                          "请先勾选同意服务条款后再完成支付。",
                          "Please accept the Standard Production Terms before paying."
                        )
                      )
                      return
                    }
                    setCreated(
                      createOrder(plan, total, method, {
                        projectName: queryProject || undefined,
                        addonIds: activeAddons
                          .filter((item) => selectedAddons[item.id])
                          .map((item) => item.id),
                      })
                    )
                  }}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center text-xs text-muted-foreground">
            {t(
              "付款确认后自动建单，可随时在工作台下载收据。",
              "Orders open automatically after payment. Receipts stay in Billing."
            )}
          </CardFooter>
        </Card>
      </PageWidth>
    </>
  )
}
