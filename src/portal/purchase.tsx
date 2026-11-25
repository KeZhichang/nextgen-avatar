import { useEffect, useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { LayoutGroup, motion } from "motion/react"
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  UserRound,
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
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
      <PageWidth className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <Card className="shadow-xs">
            <CardHeader className="flex-row items-baseline justify-between">
              <CardTitle>
                <h1>
                  {t("确认或调整制作套餐", "Confirm your production package")}
                </h1>
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {t("按需单次购买", "One-time purchase")}
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
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
                      "新客体验单仅限首单购买",
                      "Trial video is for first-time customers only"
                    )}
                  </AlertTitle>
                  <AlertDescription className="text-amber-900/90">
                    {t(
                      "检测到您的账号已有历史订单，已为您自动切换至月度套餐并开启老客续费优惠价（立省 $100）。",
                      "Your account already has a previous order. We switched to a monthly package with your automatic renewal rate (save $100)."
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {isRepeatCustomer && !requestedTrialWhileRepeat && !quotedPlan && (
                <Alert className="border-emerald-200 bg-emerald-50/60 text-emerald-950">
                  <CheckCircle2 aria-hidden="true" className="text-emerald-600" />
                  <AlertTitle>
                    {t(
                      "已自动启用老客续费优惠价",
                      "Renewal pricing automatically applied"
                    )}
                  </AlertTitle>
                  <AlertDescription className="text-emerald-900/85">
                    {t(
                      "感谢回访！选购下方任意月度套餐将直接按续费月价结算（首单尝鲜体验价仅限新客）。",
                      "Welcome back! Eligible monthly packages below are automatically discounted to your renewal rate (Starter Trial is for new customers only)."
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
              <FieldSet>
                <FieldLegend className="sr-only">
                  {t("制作套餐", "Production package")}
                </FieldLegend>
                <LayoutGroup id="checkout-plan-cards-group">
                  <RadioGroup
                    value={plan.id}
                    onValueChange={setChoice}
                    disabled={locked}
                    aria-label={t("制作套餐", "Production package")}
                    className="gap-3"
                  >
                    {plans.map((item) => {
                      const itemLocked = isTrialLocked(item)
                      const isSelected = !itemLocked && item.id === plan.id
                      const renewalActive = isRenewalApplied(item)
                      const displayPrice = getEffectivePlanPrice(item)
                      const original = renewalActive
                        ? item.price
                        : item.regular && item.regular > item.price
                          ? item.regular
                          : undefined
                      const savings = original ? original - displayPrice : 0
                      const tag = zh
                        ? item.tagZh || item.tagEn
                        : item.tagEn || item.tagZh
                      return (
                        <Label
                          key={item.id}
                          htmlFor={`plan-${item.id}`}
                          className={cn(
                            "relative flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors duration-200",
                            itemLocked
                              ? "cursor-not-allowed border-border/70 bg-muted/35 opacity-60"
                              : isSelected
                                ? "cursor-pointer border-transparent bg-card"
                                : "cursor-pointer border-border bg-card hover:border-primary/40 hover:bg-accent/40",
                            locked && "cursor-not-allowed opacity-70"
                          )}
                        >
                          {isSelected && (
                            <motion.span
                              layoutId="checkout-plan-active-card"
                              aria-hidden="true"
                              transition={{
                                type: "spring",
                                stiffness: 420,
                                damping: 34,
                                mass: 0.88,
                              }}
                              className="pointer-events-none absolute inset-0 z-0 rounded-xl border border-primary bg-accent/60 ring-1 ring-primary"
                            />
                          )}
                          <span className="relative z-10 flex min-w-0 items-start gap-3">
                          <RadioGroupItem
                            id={`plan-${item.id}`}
                            value={item.id}
                            disabled={locked || itemLocked}
                            className="mt-0.5"
                          />
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                              <span>{zh ? item.zh : item.en}</span>
                              {itemLocked ? (
                                <Badge variant="secondary">
                                  {t("仅限新客首单", "New customers only")}
                                </Badge>
                              ) : renewalActive ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-300 bg-emerald-50 text-emerald-800"
                                >
                                  {t(
                                    `老客续费价 · 立省 ${formatDollars(savings)}`,
                                    `Renewal rate · Save ${formatDollars(savings)}`
                                  )}
                                </Badge>
                              ) : (
                                <>
                                  {tag && (
                                    <Badge
                                      variant="outline"
                                      className="border-brand-gold/40 bg-brand-gold/15 text-amber-900"
                                    >
                                      {tag}
                                    </Badge>
                                  )}
                                  {savings > 0 && (
                                    <Badge variant="secondary">
                                      {t(
                                        `立省 ${formatDollars(savings)}`,
                                        `Save ${formatDollars(savings)}`
                                      )}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {t(
                                `${item.count} 条 1080P 成片配额`,
                                `${item.count} 1080P video ${item.count === 1 ? "credit" : "credits"}`
                              )}
                              {itemLocked
                                ? t(
                                    " · 您已完成首单，请选择月度套餐享续费价",
                                    " · Already ordered; pick a monthly tier for renewal pricing"
                                  )
                                : renewalActive
                                  ? t(
                                      " · 已自动应用老客续费优惠价（无自动扣费）",
                                      " · Automatic returning-customer renewal rate (no auto-charge)"
                                    )
                                  : item.renewal
                                    ? t(
                                        ` · 次月起续费 ${formatDollars(item.renewal)}/月（无自动扣费）`,
                                        ` · Renew ${formatDollars(item.renewal)}/mo next order (no auto-charge)`
                                      )
                                    : ""}
                            </span>
                          </span>
                        </span>
                        <span className="relative z-10 shrink-0 text-right tabular-nums">
                          <span className="block text-base font-semibold text-foreground">
                            {formatDollars(displayPrice)}
                          </span>
                          {original && (
                            <span className="block text-xs font-normal text-muted-foreground line-through">
                              {formatDollars(original)}
                            </span>
                          )}
                        </span>
                      </Label>
                    )
                  })}
                  </RadioGroup>
                </LayoutGroup>
              </FieldSet>
            </CardContent>
          </Card>

          {activeAddons.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>
                  <h2>{t("可选加项服务", "Optional add-ons")}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                {activeAddons.map((addon) => (
                  <Label
                    key={addon.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3.5 transition-colors hover:bg-accent/40 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-accent/50",
                      locked && "cursor-not-allowed opacity-70"
                    )}
                  >
                    <span className="flex items-center gap-3 font-medium">
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
                      <span>{zh ? addon.zh : addon.en}</span>
                    </span>
                    <span className="font-mono text-sm font-medium text-muted-foreground tabular-nums">
                      +{formatDollars(addon.price)}
                    </span>
                  </Label>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="shadow-xs lg:sticky lg:top-20 lg:col-span-5">
          <CardHeader className="border-b">
            <CardTitle>
              <h2>{t("订单结算", "Order summary")}</h2>
            </CardTitle>
            <CardDescription>
              {t("结算币种为美元 (USD)", "Billed in US Dollars (USD)")}
            </CardDescription>
            <CardAction>
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck aria-hidden="true" />
                Stripe
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {zh ? plan.zh : plan.en}
                </span>
                <span className="font-medium tabular-nums">
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
                  <span className="font-medium tabular-nums">
                    −{formatDollars(renewalDiscount)}
                  </span>
                </div>
              ) : (
                plan.regular &&
                plan.regular > plan.price && (
                  <div className="flex items-center justify-between text-xs text-emerald-700">
                    <span>{t("套餐立减", "Package discount")}</span>
                    <span className="font-medium tabular-nums">
                      −{formatDollars(plan.regular - plan.price)}
                    </span>
                  </div>
                )
              )}
              {addonsTotal > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("加项费用", "Add-ons")}</span>
                  <span className="tabular-nums">
                    +{formatDollars(addonsTotal)}
                  </span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">
                {t("应付总额", "Total due")}
              </span>
              <strong className="text-2xl font-bold tracking-tight tabular-nums">
                {formatDollars(total)}
              </strong>
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
