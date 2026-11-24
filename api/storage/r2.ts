import { randomUUID } from "node:crypto"
import type { IncomingMessage, ServerResponse } from "node:http"
import { createClient } from "@supabase/supabase-js"

import {
  readR2Config,
  sanitizeR2FileName,
  signR2GetUrl,
  signR2PutUrl,
} from "../_lib/r2.js"

const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024
const MAX_VIDEO_BYTES = 500 * 1024 * 1024

type Req = IncomingMessage & {
  body?: unknown
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.end(JSON.stringify(body))
}

async function readJsonBody(req: Req): Promise<Record<string, unknown>> {
  if (req.body !== undefined) {
    const parsed =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body
    return (parsed && typeof parsed === "object"
      ? parsed
      : {}) as Record<string, unknown>
  }
  let raw = ""
  for await (const chunk of req) {
    raw += chunk.toString()
    if (raw.length > 16384) throw new Error("Request body too large")
  }
  if (!raw.trim()) return {}
  const parsed = JSON.parse(raw) as unknown
  return (parsed && typeof parsed === "object"
    ? parsed
    : {}) as Record<string, unknown>
}

async function verifyOrderAccess(params: {
  token: string
  orderCode: string
  env: Record<string, string | undefined>
}): Promise<boolean> {
  const supabaseUrl = (
    params.env.SUPABASE_URL ?? params.env.VITE_SUPABASE_URL
  )?.trim()
  const supabaseAnonKey = (
    params.env.SUPABASE_ANON_KEY ?? params.env.VITE_SUPABASE_PUBLISHABLE_KEY
  )?.trim()
  if (!supabaseUrl || !supabaseAnonKey) return false

  const userSb = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
    },
  })

  const { data: userData, error: userError } = await userSb.auth.getUser(
    params.token
  )
  if (userError || !userData.user) return false

  const direct = await userSb
    .from("orders")
    .select("id")
    .eq("id", params.orderCode)
    .maybeSingle()
  if (!direct.error && direct.data) return true

  const producerView = await userSb
    .from("producer_orders_view")
    .select("id")
    .eq("id", params.orderCode)
    .maybeSingle()
  if (!producerView.error && producerView.data) return true

  return false
}

export async function handleR2StorageRequest(
  req: Req,
  res: ServerResponse,
  env: Record<string, string | undefined> = process.env
) {
  const r2Config = readR2Config(env)

  if (req.method === "GET") {
    sendJson(res, 200, {
      configured: Boolean(r2Config),
      provider: r2Config ? "r2" : "supabase",
    })
    return
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" })
    return
  }

  if (!r2Config) {
    sendJson(res, 503, { error: "r2_not_configured" })
    return
  }

  const authHeader = req.headers.authorization
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : ""
  if (!token) {
    sendJson(res, 401, { error: "unauthorized" })
    return
  }

  let body: Record<string, unknown>
  try {
    body = await readJsonBody(req)
  } catch {
    sendJson(res, 400, { error: "invalid_json" })
    return
  }

  const action = typeof body.action === "string" ? body.action : ""

  if (action === "presign_upload") {
    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : ""
    const folder =
      body.folder === "videos" || body.folder === "attachments"
        ? body.folder
        : null
    const fileName =
      typeof body.fileName === "string" ? body.fileName.trim() : ""
    const sizeBytes =
      typeof body.sizeBytes === "number" && Number.isFinite(body.sizeBytes)
        ? body.sizeBytes
        : 0

    if (!/^[A-Za-z0-9_-]{3,40}$/.test(orderId) || !folder || !fileName) {
      sendJson(res, 400, { error: "invalid_upload_request" })
      return
    }
    const maxBytes =
      folder === "videos" ? MAX_VIDEO_BYTES : MAX_ATTACHMENT_BYTES
    if (sizeBytes <= 0 || sizeBytes > maxBytes) {
      sendJson(res, 413, { error: "file_size_out_of_range" })
      return
    }

    const allowed = await verifyOrderAccess({
      token,
      orderCode: orderId,
      env,
    })
    if (!allowed) {
      sendJson(res, 403, { error: "forbidden_order" })
      return
    }

    const safeName = sanitizeR2FileName(fileName)
    const objectKey = `orders/${orderId}/${folder}/${randomUUID()}-${safeName}`
    const uploadUrl = signR2PutUrl({
      config: r2Config,
      objectKey,
      expiresSeconds: 900,
    })

    sendJson(res, 200, {
      uploadUrl,
      objectKey,
      fileId: `r2:${objectKey}`,
    })
    return
  }

  if (action === "presign_download") {
    const rawKey =
      typeof body.objectKey === "string" ? body.objectKey.trim() : ""
    const objectKey = rawKey.startsWith("r2:") ? rawKey.slice(3) : rawKey
    const match = /^orders\/([A-Za-z0-9_-]{3,40})\/(attachments|videos)\/([A-Za-z0-9._-]+)$/.exec(
      objectKey
    )
    if (!match) {
      sendJson(res, 400, { error: "invalid_object_key" })
      return
    }

    const orderCode = match[1]
    const allowed = await verifyOrderAccess({
      token,
      orderCode,
      env,
    })
    if (!allowed) {
      sendJson(res, 403, { error: "forbidden_order" })
      return
    }

    const downloadName =
      typeof body.downloadName === "string" && body.downloadName.trim()
        ? body.downloadName.trim().slice(0, 140)
        : undefined
    const url = signR2GetUrl({
      config: r2Config,
      objectKey,
      downloadName,
      expiresSeconds: downloadName ? 300 : 3600,
    })

    sendJson(res, 200, { url })
    return
  }

  sendJson(res, 400, { error: "unsupported_action" })
}

export default async function handler(req: Req, res: ServerResponse) {
  try {
    await handleR2StorageRequest(req, res, process.env)
  } catch (err) {
    console.error("[api/storage/r2] unhandled error:", err)
    sendJson(res, 500, { error: "storage_signing_failed" })
  }
}
