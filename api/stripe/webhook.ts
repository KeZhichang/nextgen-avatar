import type { IncomingMessage, ServerResponse } from "node:http"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

import { sendTransactionalEmail } from "../_lib/email.js"

export const config = {
  api: {
    bodyParser: false,
  },
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(body))
}

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > 1024 * 1024) throw new Error("Payload too large")
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" })
    return
  }

  const stripeSecret = (
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_PREVIEW_SECRET_KEY ||
    ""
  ).trim()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  ).trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    sendJson(res, 503, { error: "webhook_not_configured" })
    return
  }

  const signature = req.headers["stripe-signature"]
  if (typeof signature !== "string" || !signature) {
    sendJson(res, 400, { error: "missing_signature" })
    return
  }

  const stripe = new Stripe(stripeSecret, {
    timeout: 15000,
    maxNetworkRetries: 1,
  })

  let event: Stripe.Event
  try {
    const raw = await readRawBody(req)
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret)
  } catch {
    sendJson(res, 400, { error: "invalid_signature" })
    return
  }

  if (event.type !== "checkout.session.completed") {
    sendJson(res, 200, { received: true, ignored: event.type })
    return
  }

  const sessionObj = event.data.object as Stripe.Checkout.Session
  const session = await stripe.checkout.sessions.retrieve(sessionObj.id, {
    expand: ["payment_intent.payment_method", "payment_intent.latest_charge"],
  })

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Idempotency check by stripe_checkout_session_id
  const { data: existingOrder } = await sb
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle()

  if (existingOrder?.id) {
    sendJson(res, 200, { received: true, orderId: existingOrder.id })
    return
  }

  const meta = session.metadata ?? {}
  const customerEmail = (
    session.customer_details?.email ||
    session.customer_email ||
    ""
  )
    .trim()
    .toLowerCase()

  let clientId = meta.clientId?.trim() || ""
  let preferredLocale: "en" | "zh" = meta.locale === "zh" ? "zh" : "en"

  if (!clientId && customerEmail) {
    const { data: profile } = await sb
      .from("profiles")
      .select("id, preferred_locale")
      .ilike("email", customerEmail)
      .maybeSingle()
    if (profile?.id) {
      clientId = profile.id
      if (profile.preferred_locale === "zh") preferredLocale = "zh"
    }
  }

  if (!clientId) {
    sendJson(res, 200, { received: true, warning: "client_not_matched" })
    return
  }

  const planId = meta.planId && meta.planId !== "quote" ? meta.planId : null
  const customQuoteId = meta.customQuoteId?.trim() || null
  const addonIds = meta.addonIds
    ? meta.addonIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  let videoCreditsTotal = Math.max(1, Number(meta.videoCount) || 1)
  let titleZh = meta.projectName?.trim() || "数字人视频制作"
  let titleEn = meta.projectName?.trim() || "Digital avatar video production"

  if (planId) {
    const { data: planRow } = await sb
      .from("plans")
      .select("name_zh, name_en, video_count")
      .eq("id", planId)
      .maybeSingle()
    if (planRow) {
      videoCreditsTotal = planRow.video_count
      if (!meta.projectName?.trim()) {
        titleZh = planRow.name_zh
        titleEn = planRow.name_en
      }
    }
  } else if (customQuoteId) {
    const { data: quoteRow } = await sb
      .from("custom_quotes")
      .select("project_name, video_count")
      .eq("id", customQuoteId)
      .maybeSingle()
    if (quoteRow) {
      videoCreditsTotal = quoteRow.video_count
      if (!meta.projectName?.trim()) {
        titleZh = quoteRow.project_name
        titleEn = quoteRow.project_name
      }
    }
  }

  const intent =
    typeof session.payment_intent === "object" ? session.payment_intent : null
  const latestCharge =
    intent &&
    typeof intent.latest_charge === "object" &&
    intent.latest_charge !== null
      ? intent.latest_charge
      : null
  const paymentMethod =
    intent && typeof intent.payment_method === "object"
      ? intent.payment_method
      : null
  const method =
    paymentMethod?.type === "us_bank_account"
      ? "ach"
      : paymentMethod?.card?.wallet?.type === "apple_pay"
        ? "apple"
        : "card"

  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "")
  const orderId = `NGA-${datePart}-${session.id.slice(-8).toUpperCase()}`
  const amountCents = session.amount_total ?? 0

  const { error: insertErr } = await sb.from("orders").insert({
    id: orderId,
    client_id: clientId,
    title_zh: titleZh,
    title_en: titleEn,
    status: "waiting_assets",
    plan_id: planId,
    custom_quote_id: customQuoteId,
    addon_ids: addonIds,
    video_credits_total: videoCreditsTotal,
    video_credits_used: 0,
    amount_cents: amountCents,
    currency: session.currency || "usd",
    payment_method: method,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: intent?.id ?? null,
    receipt_url: latestCharge?.receipt_url ?? null,
  })

  if (insertErr) {
    sendJson(res, 500, { error: "order_insert_failed" })
    return
  }

  await sb.from("credit_ledger").insert({
    order_id: orderId,
    client_id: clientId,
    delta: videoCreditsTotal,
    reason: "purchase",
    note: `Stripe session ${session.id}`,
  })

  if (customQuoteId) {
    await sb
      .from("custom_quotes")
      .update({ status: "paid" })
      .eq("id", customQuoteId)
  }

  await sb.from("notifications").insert({
    recipient_user_id: clientId,
    order_id: orderId,
    event_type: "order_created",
    title_zh: "新订单已付款，请上传制作素材",
    title_en: "Order paid — upload materials to begin",
    body_zh: `${titleZh} (#${orderId})`,
    body_en: `${titleEn} (#${orderId})`,
    is_read: false,
  })

  if (customerEmail) {
    const appOrigin = (
      process.env.APP_PUBLIC_URL || "https://nextgenavatar.com"
    ).replace(/\/$/, "")
    await sendTransactionalEmail({
      to: customerEmail,
      locale: preferredLocale,
      kind: "order_created",
      orderId,
      projectTitle: preferredLocale === "zh" ? titleZh : titleEn,
      actionUrl: `${appOrigin}/${preferredLocale}/order-chat?order=${encodeURIComponent(orderId)}`,
      amountDollars: amountCents / 100,
    }).catch(() => undefined)
  }

  sendJson(res, 200, { received: true, orderId })
}
