import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useSearchParams } from "react-router"
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout"
import { loadStripe } from "@stripe/stripe-js/pure"
import type {
  Appearance,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseClient } from "@/lib/supabase"
import {
  type CheckoutExtras,
  type StripePreviewReceipt,
} from "./checkout-catalog"
import { formatDollars, usePortal } from "./demo"

const publishableKey = (
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_STRIPE_PREVIEW_PUBLISHABLE_KEY as string | undefined)
)?.trim()

export const stripeIsLiveMode = Boolean(publishableKey?.startsWith("pk_live_"))
export const stripePreviewConfigured = Boolean(
  publishableKey &&
    (publishableKey.startsWith("pk_test_") ||
      publishableKey.startsWith("pk_live_"))
)

const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#1f4bc4",
    colorBackground: "#fbfcfe",
    colorText: "#111c30",
    colorTextSecondary: "#45536b",
    colorDanger: "#dc2626",
    fontFamily:
      '"Manrope Variable", "PingFang SC", "Noto Sans SC", system-ui, sans-serif',
    fontSizeBase: "14px",
    spacingUnit: "4px",
    borderRadius: "8px",
  },
  rules: { ".Input": { border: "1px solid #cbd4e2", boxShadow: "none" } },
}

const expressCheckoutOptions = {
  buttonHeight: 44,
  buttonTheme: { applePay: "black" as const },
  buttonType: { applePay: "buy" as const },
  layout: { maxColumns: 1, maxRows: 1 },
  paymentMethodOrder: ["apple_pay"],
  paymentMethods: {
    applePay: "auto" as const,
    googlePay: "never" as const,
    link: "never" as const,
    paypal: "never" as const,
    amazonPay: "never" as const,
    klarna: "never" as const,
  },
}

const paymentElementOptions = {
  layout: { type: "accordion" as const, defaultCollapsed: false },
  paymentMethodOrder: ["card", "us_bank_account"],
  wallets: { applePay: "never" as const, googlePay: "never" as const },
}

type Session = { id: string; clientSecret: string }

function PaymentLoading() {
  return (
    <div aria-busy="true" className="grid gap-3">
      <Skeleton className="h-10 w-full motion-reduce:animate-none" />
      <Skeleton className="h-24 w-full motion-reduce:animate-none" />
    </div>
  )
}

function StripeForm({
  session,
  total,
  canSubmit = true,
  setBusy,
  retry,
}: {
  session: Session
  total: number
  canSubmit?: boolean
  setBusy: (busy: boolean) => void
  retry: () => void
}) {
  const { t } = usePortal()
  const [, setQuery] = useSearchParams()
  const result = useCheckoutElements()
  const [error, setError] = useState("")
  const [busy, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)
  const [walletVisible, setWalletVisible] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const submitting = useRef(false)

  async function confirm(wallet?: StripeExpressCheckoutElementConfirmEvent) {
    if (result.type !== "success" || submitting.current || !canSubmit) return
    submitting.current = true
    setSubmitting(true)
    setBusy(true)
    setError("")
    try {
      const response = await result.checkout.confirm({
        redirect: "if_required",
        expressCheckoutConfirmEvent: wallet,
      })
      if (response.type === "error") {
        setError(
          t(
            "付款未能完成，请检查支付信息后重试。",
            "Payment couldn't be completed. Please check your details and try again."
          )
        )
      } else {
        setQuery(
          (current) => {
            const next = new URLSearchParams(current)
            next.set("stripe_session", session.id)
            return next
          },
          { replace: true }
        )
      }
    } catch {
      setError(
        t(
          "暂时无法确认付款，请重试。",
          "Couldn't verify the payment. Please try again."
        )
      )
    } finally {
      submitting.current = false
      setSubmitting(false)
      setBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void confirm()
  }

  if (result.type === "loading") return <PaymentLoading />
  if (result.type === "error" || loadFailed) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="grid gap-3">
          {t(
            "暂时无法载入 Stripe 付款表单。",
            "Couldn't load the Stripe payment form."
          )}
          <Button
            variant="outline"
            className="justify-self-start"
            type="button"
            onClick={retry}
          >
            {t("重试", "Retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form className="relative grid min-w-0 gap-4" onSubmit={submit}>
      <div
        className={
          walletVisible ? "" : "absolute inset-x-0 h-0 overflow-hidden"
        }
        aria-hidden={!walletVisible}
      >
        <ExpressCheckoutElement
          options={expressCheckoutOptions}
          onReady={(event) =>
            setWalletVisible(Boolean(event.availablePaymentMethods?.applePay))
          }
          onConfirm={(event) => void confirm(event)}
        />
      </div>
      {walletVisible && <Separator />}
      {!ready && <PaymentLoading />}
      <PaymentElement
        options={paymentElementOptions}
        onReady={() => setReady(true)}
        onLoadError={() => setLoadFailed(true)}
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!stripeIsLiveMode && (
        <p className="text-xs text-muted-foreground">
          {t(
            "测试支付模式，请使用测试卡完成验证。",
            "Test payment mode. Use a test card to complete checkout."
          )}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="min-h-11"
        disabled={!ready || busy || !canSubmit}
      >
        {busy
          ? t("正在确认付款…", "Confirming payment…")
          : t(`支付 ${formatDollars(total)}`, `Pay ${formatDollars(total)}`)}
      </Button>
    </form>
  )
}

export function StripePreviewPayment({
  planId,
  planName,
  planPrice,
  videoCount,
  extras,
  addons,
  addonIds,
  clientId,
  customerEmail,
  customQuoteId,
  projectName,
  canSubmit = true,
  total,
  setBusy,
}: {
  planId: string
  planName?: string
  planPrice?: number
  videoCount?: number
  extras: CheckoutExtras
  addons?: { name: string; price: number }[]
  addonIds?: string[]
  clientId?: string
  customerEmail?: string
  customQuoteId?: string
  projectName?: string
  canSubmit?: boolean
  total: number
  setBusy: (busy: boolean) => void
}) {
  const { t, locale } = usePortal()
  const [session, setSession] = useState<Session>()
  const [failedCode, setFailedCode] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const { script, duration } = extras
  const requestBody = JSON.stringify({
    planId,
    planName,
    planPrice,
    videoCount,
    extras: { script, duration },
    addons: addons?.length ? addons : undefined,
    addonIds: addonIds?.length ? addonIds : undefined,
    clientId: clientId || undefined,
    customerEmail: customerEmail || undefined,
    customQuoteId: customQuoteId || undefined,
    projectName: projectName || undefined,
    locale,
  })
  const [stripe] = useState(() => loadStripe(publishableKey!, { locale }))

  useEffect(() => {
    const abort = new AbortController()
    const start = window.setTimeout(async () => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        }
        const sb = getSupabaseClient()
        if (sb) {
          const {
            data: { session: sbSession },
          } = await sb.auth.getSession()
          if (sbSession?.access_token) {
            headers.Authorization = `Bearer ${sbSession.access_token}`
          }
        }
        const response = await fetch("/api/stripe-preview/session", {
          method: "POST",
          headers,
          body: requestBody,
          signal: abort.signal,
        })
        if (!response.ok) {
          const payload = (await response
            .json()
            .catch(() => null)) as { error?: string } | null
          if (!abort.signal.aborted) {
            setFailedCode(payload?.error ?? "session_failed")
          }
          return
        }
        const result = (await response.json()) as Session
        if (!abort.signal.aborted) {
          setFailedCode(null)
          setSession(result)
        }
      } catch {
        if (!abort.signal.aborted) setFailedCode("session_failed")
      }
    }, 180)
    return () => {
      window.clearTimeout(start)
      abort.abort()
    }
  }, [requestBody, attempt])

  const providerOptions = useMemo(
    () =>
      session
        ? {
            clientSecret: session.clientSecret,
            elementsOptions: { appearance },
          }
        : null,
    [session]
  )

  function retry() {
    setFailedCode(null)
    setSession(undefined)
    setAttempt((value) => value + 1)
  }

  if (failedCode) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="grid gap-3">
          {failedCode === "trial_new_customers_only"
            ? t(
                "体验视频（$59）仅限新客户首单购买，请选择其他月度套餐（已为您自动启用老客续费优惠价）。",
                "The $59 Trial Video is only available for first-time customers. Please pick a monthly package with your automatic renewal rate."
              )
            : stripeIsLiveMode
              ? t(
                  "暂时无法连接 Stripe 支付服务，请稍后重试。",
                  "Couldn't connect to Stripe checkout. Please try again."
                )
              : t(
                  "暂时无法连接 Stripe 测试环境。",
                  "Couldn't connect to the Stripe sandbox."
                )}
          {failedCode !== "trial_new_customers_only" && (
            <Button
              variant="outline"
              className="justify-self-start"
              onClick={retry}
            >
              {t("重试", "Retry")}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }
  if (!session || !providerOptions) return <PaymentLoading />
  return (
    <CheckoutElementsProvider
      key={session.id}
      stripe={stripe}
      options={providerOptions}
    >
      <StripeForm
        session={session}
        total={total}
        canSubmit={canSubmit}
        setBusy={setBusy}
        retry={retry}
      />
    </CheckoutElementsProvider>
  )
}

export function StripePreviewStatus({
  sessionId,
  onPaid,
  reset,
}: {
  sessionId: string
  onPaid: (receipt: StripePreviewReceipt) => void
  reset: () => void
}) {
  const { t } = usePortal()
  const [status, setStatus] = useState<StripePreviewReceipt["status"]>()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const finish = useEffectEvent(onPaid)

  useEffect(() => {
    const abort = new AbortController()
    let timer: number | undefined
    async function check() {
      try {
        const response = await fetch(
          `/api/stripe-preview/session?id=${encodeURIComponent(sessionId)}`,
          { signal: abort.signal }
        )
        if (!response.ok) throw new Error("Status request failed")
        const receipt = (await response.json()) as StripePreviewReceipt
        if (abort.signal.aborted) return
        setStatus(receipt.status)
        if (receipt.status === "paid") finish(receipt)
        if (receipt.status === "processing")
          timer = window.setTimeout(() => void check(), 5000)
      } catch {
        if (!abort.signal.aborted) setFailed(true)
      }
    }
    void check()
    return () => {
      abort.abort()
      window.clearTimeout(timer)
    }
  }, [sessionId, attempt])

  if (failed)
    return (
      <Alert variant="destructive">
        <AlertDescription className="grid gap-3">
          {t("暂时无法读取付款结果。", "Couldn't retrieve the payment status.")}
          <Button
            variant="outline"
            className="justify-self-start"
            onClick={() => {
              setFailed(false)
              setAttempt((value) => value + 1)
            }}
          >
            {t("重新检查", "Check again")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  if (status === "processing")
    return (
      <Alert>
        <AlertDescription>
          {t(
            "付款处理中，确认到账后将自动创建订单。",
            "Payment is processing. Your order will be created when payment is confirmed."
          )}
        </AlertDescription>
      </Alert>
    )
  if (status && status !== "paid")
    return (
      <Alert>
        <AlertDescription className="grid gap-3">
          {t("付款尚未完成。", "Payment wasn't completed.")}
          <Button
            variant="outline"
            className="justify-self-start"
            onClick={reset}
          >
            {t("返回付款", "Return to checkout")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  return <PaymentLoading />
}
