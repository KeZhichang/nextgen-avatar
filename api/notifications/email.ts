import type { IncomingMessage, ServerResponse } from "node:http"

import {
  sendTransactionalEmail,
  type EmailTemplateKind,
} from "../_lib/email.js"

type Req = IncomingMessage & { body?: unknown }

const allowedKinds = new Set<EmailTemplateKind>([
  "order_created",
  "draft_ready",
  "revision_requested",
  "final_delivered",
])

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(body))
}

async function readBody(req: Req): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === "object") {
    return req.body as Record<string, unknown>
  }
  let raw = ""
  for await (const chunk of req) {
    raw += chunk.toString()
    if (raw.length > 16384) throw new Error("Payload too large")
  }
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" })
    return
  }

  const internalSecret = process.env.INTERNAL_API_SECRET?.trim()
  const authHeader = req.headers.authorization || ""
  if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
    sendJson(res, 401, { error: "unauthorized" })
    return
  }

  try {
    const body = await readBody(req)
    const to = typeof body.to === "string" ? body.to.trim() : ""
    const kind = typeof body.kind === "string" ? body.kind : ""
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : ""
    const projectTitle =
      typeof body.projectTitle === "string" ? body.projectTitle.trim() : ""
    const actionUrl =
      typeof body.actionUrl === "string" ? body.actionUrl.trim() : ""
    const locale = body.locale === "zh" ? "zh" : "en"
    const note = typeof body.note === "string" ? body.note.trim() : undefined

    if (
      !to.includes("@") ||
      !allowedKinds.has(kind as EmailTemplateKind) ||
      !orderId ||
      !projectTitle ||
      !actionUrl
    ) {
      sendJson(res, 400, { error: "invalid_payload" })
      return
    }

    const result = await sendTransactionalEmail({
      to,
      locale,
      kind: kind as EmailTemplateKind,
      orderId,
      projectTitle,
      actionUrl,
      note,
    })

    sendJson(res, 200, result)
  } catch {
    sendJson(res, 500, { error: "email_dispatch_failed" })
  }
}
