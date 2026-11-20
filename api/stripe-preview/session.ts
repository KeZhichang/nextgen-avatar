import type { IncomingMessage, ServerResponse } from "node:http"
import Stripe from "stripe"

const purpose = "nextgen_avatar_checkout_preview"
const defaultAddons = { script: 49, duration: 79 }
const defaultPlans = [
  { id: "pro", zh: "专业 5 条套餐", en: "Pro 5-Pack", price: 299 },
  { id: "trial", zh: "新用户尝鲜单条", en: "Starter Trial", price: 59 },
  { id: "ent", zh: "企业 15 条套餐", en: "Enterprise 15-Pack", price: 765 },
  { id: "quote", zh: "定制报价单", en: "Custom quote", price: 1250 },
]

type CheckoutExtras = { script: boolean; duration: boolean }
type StripePreviewReceipt = {
  id: string
  planId: string
  extras: CheckoutExtras
  total: number
  method: "card" | "apple" | "ach"
  status: "paid" | "processing" | "open" | "expired" | "failed"
}

type Req = IncomingMessage & {
  body?: unknown
  query?: Record<string, string | string[] | undefined>
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.end(JSON.stringify(body))
}

async function readBody(req: Req): Promise<unknown> {
  if (req.body !== undefined) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body
  }
  let raw = ""
  for await (const chunk of req) {
    raw += chunk.toString()
    if (raw.length > 8192) throw new Error("Request too large")
  }
  return raw ? (JSON.parse(raw) as unknown) : {}
}

function extrasFrom(input: unknown): CheckoutExtras | undefined {
  if (!input || typeof input !== "object") return
  const record = input as Record<string, unknown>
  if (
    typeof record.script !== "boolean" ||
    typeof record.duration !== "boolean"
  )
    return
  return { script: record.script, duration: record.duration }
}

function resolveOrigin(req: IncomingMessage) {
  const protoHeader = req.headers["x-forwarded-proto"]
  const proto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : (protoHeader ?? "https")
  const host = req.headers["x-forwarded-host"] ?? req.headers.host
  const cleanHost = Array.isArray(host) ? host[0] : host
  return cleanHost ? `${proto}://${cleanHost}` : "https://localhost"
}

export default async function handler(req: Req, res: ServerResponse) {
  const secret = process.env.STRIPE_PREVIEW_SECRET_KEY?.trim()
  if (!secret || !/^(?:sk|rk|rkcs)_test_/.test(secret)) {
    sendJson(res, 503, { error: "preview_unavailable" })
    return
  }

  const stripe = new Stripe(secret, { timeout: 15000, maxNetworkRetries: 1 })
  const origin = resolveOrigin(req)

  try {
    if (req.method === "POST") {
      const input = (await readBody(req)) as Record<string, unknown>
      const planId = typeof input?.planId === "string" ? input.planId : ""
      const extras = extrasFrom(input?.extras) ?? {
        script: false,
        duration: false,
      }
      const locale = input?.locale === "zh" ? "zh" : "en"
      const zh = locale === "zh"

      const presetPlan = defaultPlans.find((item) => item.id === planId)
      const customName =
        typeof input?.planName === "string" && input.planName.trim()
          ? input.planName.trim().slice(0, 80)
          : undefined
      const customPrice =
        typeof input?.planPrice === "number" &&
        Number.isFinite(input.planPrice) &&
        input.planPrice > 0
          ? input.planPrice
          : undefined

      const resolvedPlanName =
        customName ??
        (presetPlan
          ? zh
            ? presetPlan.zh
            : presetPlan.en
          : "Production Package")
      const resolvedPlanPrice = customPrice ?? presetPlan?.price

      if (!planId || !resolvedPlanPrice || resolvedPlanPrice <= 0) {
        sendJson(res, 400, { error: "invalid_selection" })
        return
      }

      const lineItems: { name: string; price: number }[] = [
        { name: resolvedPlanName, price: resolvedPlanPrice },
      ]

      const customAddons = Array.isArray(input?.addons)
        ? (input.addons as unknown[])
            .filter(
              (item): item is { name: string; price: number } =>
                Boolean(item) &&
                typeof item === "object" &&
                typeof (item as Record<string, unknown>).name === "string" &&
                typeof (item as Record<string, unknown>).price === "number" &&
                (item as Record<string, number>).price > 0
            )
            .slice(0, 10)
        : null

      if (customAddons) {
        for (const addon of customAddons) {
          lineItems.push({
            name: addon.name.slice(0, 80),
            price: addon.price,
          })
        }
      } else {
        if (extras.script) {
          lineItems.push({
            name: zh ? "额外口播脚本" : "Additional script",
            price: defaultAddons.script,
          })
        }
        if (extras.duration) {
          lineItems.push({
            name: zh ? "延长视频时长" : "Extended duration",
            price: defaultAddons.duration,
          })
        }
      }

      const expectedCents = lineItems.reduce(
        (sum, item) => sum + Math.round(item.price * 100),
        0
      )
      const returnQuery = new URLSearchParams({ plan: planId })
      if (extras.script) returnQuery.set("script", "1")
      if (extras.duration) returnQuery.set("duration", "1")

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "elements",
        excluded_payment_method_types: [
          "affirm",
          "amazon_pay",
          "cashapp",
          "klarna",
        ],
        locale,
        return_url: `${origin}/${locale}/checkout?${returnQuery}&stripe_session={CHECKOUT_SESSION_ID}`,
        customer_email: "checkout-preview@example.com",
        line_items: lineItems.map(({ name, price }) => ({
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: { name },
            unit_amount: Math.round(price * 100),
          },
        })),
        metadata: {
          purpose,
          planId,
          script: extras.script ? "1" : "0",
          duration: extras.duration ? "1" : "0",
        },
      })

      if (
        session.livemode ||
        !session.client_secret ||
        session.amount_total !== expectedCents
      ) {
        sendJson(res, 502, { error: "invalid_session" })
        return
      }

      sendJson(res, 200, {
        id: session.id,
        clientSecret: session.client_secret,
      })
      return
    }

    if (req.method === "GET") {
      const urlObj = new URL(req.url ?? "/", origin)
      const id = urlObj.searchParams.get("id")
      if (!id || !/^cs_test_[A-Za-z0-9_]{1,180}$/.test(id)) {
        sendJson(res, 400, { error: "invalid_session" })
        return
      }
      const session = await stripe.checkout.sessions.retrieve(id, {
        expand: ["payment_intent.payment_method"],
      })
      const metadata = session.metadata
      const planId = metadata?.planId ?? ""
      const extras = {
        script: metadata?.script === "1",
        duration: metadata?.duration === "1",
      }
      if (
        session.livemode ||
        metadata?.purpose !== purpose ||
        !planId ||
        session.currency !== "usd"
      ) {
        sendJson(res, 404, { error: "invalid_session" })
        return
      }
      const intent =
        typeof session.payment_intent === "object"
          ? session.payment_intent
          : null
      const payment =
        intent && typeof intent.payment_method === "object"
          ? intent.payment_method
          : null
      const method =
        payment?.type === "us_bank_account"
          ? "ach"
          : payment?.card?.wallet?.type === "apple_pay"
            ? "apple"
            : "card"
      const status =
        session.payment_status === "paid"
          ? "paid"
          : session.status === "expired"
            ? "expired"
            : intent?.status === "processing"
              ? "processing"
              : session.status === "complete"
                ? "failed"
                : "open"
      const preset = defaultPlans.find((item) => item.id === planId)
      const total =
        typeof session.amount_total === "number"
          ? session.amount_total / 100
          : (preset?.price ?? 0)
      const result: StripePreviewReceipt = {
        id,
        planId,
        extras,
        total,
        method,
        status,
      }
      sendJson(res, 200, result)
      return
    }

    sendJson(res, 405, { error: "method_not_allowed" })
  } catch {
    sendJson(res, 502, { error: "stripe_request_failed" })
  }
}
