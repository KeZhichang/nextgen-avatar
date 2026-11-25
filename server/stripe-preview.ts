import type { IncomingMessage, ServerResponse } from "node:http"
import Stripe from "stripe"
import type { Plugin } from "vite"

import {
  verifyCheckoutEligibility,
  type CheckoutEligibilityEnv,
} from "../api/_lib/checkout-eligibility.ts"
import {
  defaultAddons,
  stripePreviewPlans,
  type CheckoutExtras,
  type StripePreviewReceipt,
} from "../src/portal/checkout-catalog.ts"

const purpose = "nextgen_avatar_checkout_preview"

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  })
  response.end(JSON.stringify(body))
}

async function readSelection(request: IncomingMessage): Promise<unknown> {
  let body = ""
  for await (const chunk of request) {
    body += chunk.toString()
    if (body.length > 4096) throw new Error("Request is too large")
  }
  return JSON.parse(body) as unknown
}

function extrasFrom(input: unknown): CheckoutExtras | undefined {
  if (!input || typeof input !== "object") return
  if (!("script" in input) || !("duration" in input)) return
  if (typeof input.script !== "boolean" || typeof input.duration !== "boolean")
    return
  return { script: input.script, duration: input.duration }
}

export function stripePreviewPlugin(
  secret: string | undefined,
  eligibilityEnv?: CheckoutEligibilityEnv
): Plugin {
  const stripe =
    secret && /^(?:sk|rk|rkcs)_test_/.test(secret)
      ? new Stripe(secret, { timeout: 15000, maxNetworkRetries: 1 })
      : undefined

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const host = request.headers.host
    if (
      !host ||
      !/^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(host) ||
      !stripe
    ) {
      sendJson(response, 503, { error: "preview_unavailable" })
      return
    }
    const origin = `http://${host}`
    if (request.headers.origin && request.headers.origin !== origin) {
      sendJson(response, 403, { error: "invalid_origin" })
      return
    }
    const path = new URL(request.url ?? "/", origin)

    if (path.pathname === "/session" && request.method === "POST") {
      let input: unknown
      try {
        input = await readSelection(request)
      } catch {
        sendJson(response, 400, { error: "invalid_selection" })
        return
      }
      if (
        !input ||
        typeof input !== "object" ||
        !("planId" in input) ||
        !("extras" in input)
      ) {
        sendJson(response, 400, { error: "invalid_selection" })
        return
      }
      const inputRecord = input as Record<string, unknown>
      const planId =
        typeof inputRecord.planId === "string" ? inputRecord.planId : ""
      const presetPlan = stripePreviewPlans.find((item) => item.id === planId)
      const extras = extrasFrom(inputRecord.extras) ?? {
        script: false,
        duration: false,
      }
      const locale = inputRecord.locale === "zh" ? "zh" : "en"
      const zh = locale === "zh"
      const clientId =
        typeof inputRecord.clientId === "string" && inputRecord.clientId.trim()
          ? inputRecord.clientId.trim().slice(0, 64)
          : ""
      const eligibility = await verifyCheckoutEligibility({
        planId,
        locale,
        authorizationHeader: request.headers.authorization,
        clientId,
        env: eligibilityEnv ?? {},
      })
      if (!eligibility.ok) {
        sendJson(response, eligibility.status ?? 403, {
          error: eligibility.error ?? "checkout_blocked",
        })
        return
      }

      const customName =
        typeof inputRecord.planName === "string" && inputRecord.planName.trim()
          ? inputRecord.planName.trim().slice(0, 80)
          : undefined
      const customPrice =
        typeof inputRecord.planPrice === "number" &&
        Number.isFinite(inputRecord.planPrice) &&
        inputRecord.planPrice > 0
          ? inputRecord.planPrice
          : undefined
      const baseName =
        eligibility.authoritativeName ??
        customName ??
        (presetPlan
          ? zh
            ? presetPlan.zh
            : presetPlan.en
          : "Production Package")
      const resolvedName = eligibility.appliedRenewal
        ? zh
          ? `${baseName}（老客续费价）`
          : `${baseName} (Renewal Rate)`
        : baseName
      const resolvedPrice =
        planId === "quote"
          ? (customPrice ?? presetPlan?.price)
          : (eligibility.authoritativePrice ?? customPrice ?? presetPlan?.price)
      if (!planId || !resolvedPrice || resolvedPrice <= 0) {
        sendJson(response, 400, { error: "invalid_selection" })
        return
      }

      const details: { name: string; price: number }[] = [
        { name: resolvedName, price: resolvedPrice },
      ]
      const customAddons = Array.isArray(inputRecord.addons)
        ? (inputRecord.addons as unknown[]).filter(
            (item): item is { name: string; price: number } =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof (item as Record<string, unknown>).name === "string" &&
              typeof (item as Record<string, unknown>).price === "number" &&
              (item as Record<string, number>).price > 0
          )
        : null
      if (customAddons) {
        for (const addon of customAddons.slice(0, 10)) {
          details.push({ name: addon.name.slice(0, 80), price: addon.price })
        }
      } else {
        if (extras.script)
          details.push({
            name: zh ? "额外口播脚本" : "Additional script",
            price: defaultAddons.script,
          })
        if (extras.duration)
          details.push({
            name: zh ? "延长视频时长" : "Extended duration",
            price: defaultAddons.duration,
          })
      }
      const expected = details.reduce(
        (sum, item) => sum + Math.round(item.price * 100),
        0
      )
      const returnQuery = new URLSearchParams({ plan: planId })
      if (extras.script) returnQuery.set("script", "1")
      if (extras.duration) returnQuery.set("duration", "1")
      const customQuoteId =
        typeof inputRecord.customQuoteId === "string" &&
        inputRecord.customQuoteId.trim()
          ? inputRecord.customQuoteId.trim().slice(0, 64)
          : ""
      const projectName =
        typeof inputRecord.projectName === "string" &&
        inputRecord.projectName.trim()
          ? inputRecord.projectName.trim().slice(0, 100)
          : ""
      const videoCount =
        eligibility.authoritativeCount && planId !== "quote"
          ? String(eligibility.authoritativeCount)
          : typeof inputRecord.videoCount === "number" &&
              Number.isFinite(inputRecord.videoCount) &&
              inputRecord.videoCount > 0
            ? String(Math.floor(inputRecord.videoCount))
            : presetPlan
              ? String(presetPlan.count)
              : ""
      const addonIds = Array.isArray(inputRecord.addonIds)
        ? (inputRecord.addonIds as unknown[])
            .filter(
              (v): v is string => typeof v === "string" && Boolean(v.trim())
            )
            .map((v) => v.trim().slice(0, 32))
            .slice(0, 10)
            .join(",")
        : ""
      const customerEmail =
        typeof inputRecord.customerEmail === "string" &&
        inputRecord.customerEmail.includes("@")
          ? inputRecord.customerEmail.trim().slice(0, 120)
          : "checkout-preview@example.com"
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
        customer_email: customerEmail,
        line_items: details.map(({ name, price }) => ({
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
        session.livemode ||
        !session.client_secret ||
        session.amount_total !== expected
      ) {
        sendJson(response, 502, { error: "invalid_session" })
        return
      }
      sendJson(response, 200, {
        id: session.id,
        clientSecret: session.client_secret,
      })
      return
    }

    if (path.pathname === "/session" && request.method === "GET") {
      const id = path.searchParams.get("id")
      if (!id || !/^cs_test_[A-Za-z0-9_]{1,180}$/.test(id)) {
        sendJson(response, 400, { error: "invalid_session" })
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
        session.livemode ||
        metadata?.purpose !== purpose ||
        !planId ||
        session.currency !== "usd"
      ) {
        sendJson(response, 404, { error: "invalid_session" })
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
      const result: StripePreviewReceipt = {
        id,
        planId,
        extras,
        total: (session.amount_total ?? 0) / 100,
        method,
        status,
        receiptUrl: latestCharge?.receipt_url ?? undefined,
      }
      sendJson(response, 200, result)
      return
    }

    sendJson(response, 404, { error: "not_found" })
  }

  const middleware = (request: IncomingMessage, response: ServerResponse) => {
    void handle(request, response).catch((error: unknown) => {
      if (error instanceof Stripe.errors.StripeError) {
        console.warn(
          "Stripe preview request failed",
          error.type,
          error.code ?? "unspecified"
        )
      }
      sendJson(response, 502, { error: "stripe_unavailable" })
    })
  }

  return {
    name: "nextgen-stripe-checkout-preview",
    configureServer(server) {
      server.middlewares.use("/api/stripe-preview", middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/stripe-preview", middleware)
    },
  }
}
