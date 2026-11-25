import { createHmac, createHash } from "node:crypto"

export type R2EnvConfig = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  endpoint: string
}

export function readR2Config(
  env: Record<string, string | undefined> = process.env
): R2EnvConfig | null {
  const accountId = env.R2_ACCOUNT_ID?.trim() ?? ""
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() ?? ""
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() ?? ""
  const bucketName = env.R2_BUCKET_NAME?.trim() ?? ""
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null
  }
  const rawEndpoint =
    env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`
  const endpoint = rawEndpoint.replace(/\/+$/, "")
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
  }
}

export function isR2Configured(
  env: Record<string, string | undefined> = process.env
): boolean {
  return readR2Config(env) !== null
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

function encodeKeyPath(key: string): string {
  return key
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/")
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest()
}

function formatAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "")
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  }
}

function presignS3v4Url(params: {
  config: R2EnvConfig
  method: "GET" | "PUT"
  objectKey: string
  expiresSeconds: number
  extraQuery?: Record<string, string>
}): string {
  const { config, method, objectKey, expiresSeconds, extraQuery } = params
  const now = new Date()
  const { amzDate, dateStamp } = formatAmzDate(now)
  const region = "auto"
  const service = "s3"
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`

  const endpointUrl = new URL(config.endpoint)
  const host = endpointUrl.host
  const canonicalUri = `/${encodeRfc3986(config.bucketName)}/${encodeKeyPath(objectKey)}`

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(Math.max(60, Math.min(604800, Math.floor(expiresSeconds)))),
    "X-Amz-SignedHeaders": "host",
    ...(extraQuery ?? {}),
  }

  const canonicalQuery = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeRfc3986(k)}=${encodeRfc3986(queryParams[k])}`)
    .join("&")

  const canonicalHeaders = `host:${host}\n`
  const signedHeaders = "host"
  const payloadHash = "UNSIGNED-PAYLOAD"

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n")

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n")

  const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, service)
  const kSigning = hmacSha256(kService, "aws4_request")
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex")

  return `${config.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

export function signR2PutUrl(params: {
  config: R2EnvConfig
  objectKey: string
  expiresSeconds?: number
}): string {
  return presignS3v4Url({
    config: params.config,
    method: "PUT",
    objectKey: params.objectKey,
    expiresSeconds: params.expiresSeconds ?? 900,
  })
}

export function signR2GetUrl(params: {
  config: R2EnvConfig
  objectKey: string
  downloadName?: string
  expiresSeconds?: number
}): string {
  const extraQuery: Record<string, string> = {}
  if (params.downloadName) {
    const safeAscii = params.downloadName.replace(/["\\\r\n]/g, "_")
    const encoded = encodeRfc3986(params.downloadName)
    extraQuery["response-content-disposition"] =
      `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`
  }
  return presignS3v4Url({
    config: params.config,
    method: "GET",
    objectKey: params.objectKey,
    expiresSeconds: params.expiresSeconds ?? 3600,
    extraQuery,
  })
}

export function sanitizeR2FileName(name: string): string {
  const dot = name.lastIndexOf(".")
  const rawExt = dot > 0 ? name.slice(dot + 1) : ""
  const ext = rawExt
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(0, 10)
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 32)
  const base = stem || "file"
  return ext ? `${base}.${ext}` : base
}
