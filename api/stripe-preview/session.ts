import type { IncomingMessage, ServerResponse } from "node:http"
import Stripe from "stripe"

import { verifyCheckoutEligibility } from "../_lib/checkout-eligibility.js"

const purpose = "nextgen_avatar_checkout_preview"
const defaultAddons = { script: 50, duration: 25 }
const defaultPlans = [
  { id: "trial", zh: "体验视频（单条）", en: "Trial Video (1 video)", price: 59, count: 1 },
  { id: "presenter-5", zh: "AI 标准版口播 · 5 条套餐", en: "AI Standard Presenter · 5 Videos", price: 459, count: 5 },
  { id: "presenter-10", zh: "AI 标准版口播 · 10 条套餐", en: "AI Standard Presenter · 10 Videos", price: 759, count: 10 },
  { id: "presenter-15", zh: "AI 标准版口播 · 15 条套餐", en: "AI Standard Presenter · 15 Videos", price: 999, count: 15 },
  { id: "cinematic-4", zh: "AI 电影版口播 · 4 条套餐", en: "AI Cinematic Presenter · 4 Videos", price: 459, count: 4 },
  { id: "cinematic-6", zh: "AI 电影版口播 · 6 条套餐", en: "AI Cinematic Presenter · 6 Videos", price: 599, count: 6 },
  { id: "cinematic-8", zh: "AI 电影版口播 · 8 条套餐", en: "AI Cinematic Presenter · 8 Videos", price: 739, count: 8 },
  { id: "pro", zh: "专业 5 条套餐", en: "Pro 5-Pack", price: 299, count: 5 },
  { id: "ent", zh: "企业 15 条套餐", en: "Enterprise 15-Pack", price: 765, count: 15 },
  { id: "quote", zh: "定制报价单", en: "Custom quote", price: 1250, count: 10 },
]

type CheckoutExtras = { script: boolean; duration: boolean }
type StripePreviewReceipt = {
  id: string
  planId: string
  extras: CheckoutExtras
  total: number
  method: "card" | "apple" | "ach"
  status: "paid" | "processing" | "open" | "expired" | "failed"
  receiptUrl?: string
  livemode?: boolean
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
  return cleanHost ? `${proto}://${cleanHost}` : "https://nextgenavatar.com"
}

export default async function handler(req: Req, res: ServerResponse) {
  const secret = (
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_PREVIEW_SECRET_KEY ||
    ""
  ).trim()
  const isLiveKey = /^(?:sk|rk)_live_/.test(secret)
  const isTestKey = /^(?:sk|rk|rkcs)_test_/.test(secret)
  if (!secret || (!isLiveKey && !isTestKey)) {
    sendJson(res, 503, { error: "stripe_unavailable" })
    return
  }

  const stripe = new Stripe(secret, { timeout: 15000, maxNetworkRetries: 1 })
  const origin = resolveOrigin(req)

  try {
    if (req.method === "POST") {
      const input = (await readBody(req)) as Record<string, unknown>
      const planId = typeof input?.planId === "string" ? input.planId.trim() : ""
      const extras = extrasFrom(input?.extras) ?? {
        script: false,
        duration: false,
      }
      const locale = input?.locale === "zh" ? "zh" : "en"
      const zh = locale === "zh"

      const clientId =
        typeof input?.clientId === "string" && input.clientId.trim()
          ? input.clientId.trim().slice(0, 64)
          : ""

      const eligibility = await verifyCheckoutEligibility({
        planId,
        locale,
        authorizationHeader: req.headers.authorization,
        clientId,
        env: {
          supabaseUrl:
            process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
          supabaseAnonKey:
            process.env.SUPABASE_ANON_KEY ||
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      })
      if (!eligibility.ok) {
        sendJson(res, eligibility.status, { error: eligibility.error })
        return
      }

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

      const basePlanName =
        eligibility.authoritativeName ??
        customName ??
        (presetPlan
          ? zh
            ? presetPlan.zh
            : presetPlan.en
          : "Production Package")
      const resolvedPlanName = eligibility.appliedRenewal
        ? zh
          ? `${basePlanName}（老客续费价）`
          : `${basePlanName} (Renewal Rate)`
        : basePlanName
      const resolvedPlanPrice =
        planId === "quote"
          ? (customPrice ?? presetPlan?.price)
          : (eligibility.authoritativePrice ?? customPrice ?? presetPlan?.price)

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
            name: zh ? "定制口播脚本撰写" : "Custom script copywriting",
            price: defaultAddons.script,
          })
        }
        if (extras.duration) {
          lineItems.push({
            name: zh ? "单条延长时长 (+30 秒)" : "Extra runtime (+30 seconds)",
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

      const customQuoteId =
        typeof input?.customQuoteId === "string" && input.customQuoteId.trim()
          ? input.customQuoteId.trim().slice(0, 64)
          : ""
      const projectName =
        typeof input?.projectName === "string" && input.projectName.trim()
          ? input.projectName.trim().slice(0, 100)
          : ""
      const videoCount =
        eligibility.authoritativeCount && planId !== "quote"
          ? String(eligibility.authoritativeCount)
          : typeof input?.videoCount === "number" &&
              Number.isFinite(input.videoCount) &&
              input.videoCount > 0
            ? String(Math.floor(input.videoCount))
            : presetPlan
              ? String(presetPlan.count)
              : ""
      const addonIds = Array.isArray(input?.addonIds)
        ? (input.addonIds as unknown[])
          .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
          .map((v) => v.trim().slice(0, 32))
          .slice(0, 10)
          .join(",")
        : ""
      const customerEmail =
        typeof input?.customerEmail === "string" &&
          input.customerEmail.includes("@")
          ? input.customerEmail.trim().slice(0, 120)
          : undefined

      if (customQuoteId) returnQuery.set("quote", customQuoteId)

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
        ...(customerEmail
          ? { customer_email: customerEmail }
          : !isLiveKey
            ? { customer_email: "checkout-preview@example.com" }
            : {}),
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
          locale,
          script: extras.script ? "1" : "0",
          duration: extras.duration ? "1" : "0",
          ...(clientId ? { clientId } : {}),
          ...(customQuoteId ? { customQuoteId } : {}),
          ...(projectName ? { projectName } : {}),
          ...(videoCount ? { videoCount } : {}),
          ...(addonIds ? { addonIds } : {}),
        },
      })

      if (
        session.livemode !== isLiveKey ||
        !session.client_secret ||
        session.amount_total !== expectedCents
      ) {
        sendJson(res, 502, { error: "invalid_session" })
        return
      }

      sendJson(res, 200, {
        id: session.id,
        clientSecret: session.client_secret,
        livemode: session.livemode,
      })
      return
    }

    if (req.method === "GET") {
      const urlObj = new URL(req.url ?? "/", origin)
      const id = urlObj.searchParams.get("id")
      const sessionPattern = isLiveKey
        ? /^cs_live_[A-Za-z0-9_]{1,180}$/
        : /^cs_test_[A-Za-z0-9_]{1,180}$/
      if (!id || !sessionPattern.test(id)) {
        sendJson(res, 400, { error: "invalid_session" })
        return
      }
      const session = await stripe.checkout.sessions.retrieve(id, {
        expand: ["payment_intent.payment_method", "payment_intent.latest_charge"],
      })
      const metadata = session.metadata
      const planId = metadata?.planId ?? ""
      const extras = {
        script: metadata?.script === "1",
        duration: metadata?.duration === "1",
      }
      if (
        session.livemode !== isLiveKey ||
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
      const latestCharge =
        intent &&
          typeof intent.latest_charge === "object" &&
          intent.latest_charge !== null
          ? intent.latest_charge
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

      const receipt: StripePreviewReceipt = {
        id,
        planId,
        extras,
        total: (session.amount_total ?? 0) / 100,
        method,
        status,
        receiptUrl: latestCharge?.receipt_url ?? undefined,
        livemode: session.livemode,
      }
      sendJson(res, 200, receipt)
      return
    }

    sendJson(res, 405, { error: "method_not_allowed" })
  } catch {
    sendJson(res, 502, { error: "stripe_request_failed" })
  }
}
