import { getSupabaseClient } from "@/lib/supabase"

export const STORAGE_BUCKET = "order-media"
export const CLOUD_FILE_PREFIX = "sb:"
export const R2_FILE_PREFIX = "r2:"
export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024 // 100 MB per material file
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024 // 500 MB per preview/final video

export type FileValidationResult =
  | { ok: true }
  | { ok: false; reason: "empty" | "too_large"; maxMb: number }

export function validateOrderFile(
  file: File,
  kind: "attachment" | "video"
): FileValidationResult {
  const maxBytes =
    kind === "video" ? MAX_VIDEO_BYTES : MAX_ATTACHMENT_BYTES
  const maxMb = Math.round(maxBytes / (1024 * 1024))
  if (file.size <= 0) {
    return { ok: false, reason: "empty", maxMb }
  }
  if (file.size > maxBytes) {
    return { ok: false, reason: "too_large", maxMb }
  }
  return { ok: true }
}

export type UploadedFileRecord = {
  fileId: string
  storageKey: string
  name: string
  type: string
  size: number
}

export type ResolvedFileSource = {
  url: string
  blob?: Blob
  revoke?: () => void
}

let database: Promise<IDBDatabase> | undefined
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()
let r2AvailabilityPromise: Promise<boolean> | null = null

export function isCloudFileId(id?: string): id is string {
  return Boolean(id && id.startsWith(CLOUD_FILE_PREFIX))
}

export function extractCloudPath(id: string): string {
  return id.slice(CLOUD_FILE_PREFIX.length)
}

export function isR2FileId(id?: string): id is string {
  return Boolean(id && id.startsWith(R2_FILE_PREFIX))
}

export function extractR2Path(id: string): string {
  return id.slice(R2_FILE_PREFIX.length)
}

async function checkR2Available(): Promise<boolean> {
  if (!r2AvailabilityPromise) {
    r2AvailabilityPromise = fetch("/api/storage/r2", {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) return false
        const data = (await res.json()) as { configured?: boolean }
        return Boolean(data.configured)
      })
      .catch(() => false)
  }
  return r2AvailabilityPromise
}

async function requestR2Presign<T>(
  payload: Record<string, unknown>
): Promise<T | null> {
  const sb = getSupabaseClient()
  if (!sb) return null
  const {
    data: { session },
  } = await sb.auth.getSession()
  const token = session?.access_token
  if (!token) return null

  const response = await fetch("/api/storage/r2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) return null
  return (await response.json()) as T
}

function uploadFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  onFileProgress?: (fraction: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", uploadUrl, true)
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    )
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onFileProgress?.(Math.min(1, event.loaded / event.total))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onFileProgress?.(1)
        resolve()
      } else {
        reject(new Error(`R2 upload failed with status ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error("R2 upload network error"))
    xhr.onabort = () => reject(new Error("R2 upload aborted"))
    xhr.send(file)
  })
}

function openFiles() {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("nextgen-portal-demo", 1)
    request.onupgradeneeded = () => request.result.createObjectStore("files")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      database = undefined
      reject(request.error)
    }
  })
  return database
}

function sanitizeStorageFileName(name: string): string {
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

export async function saveFile(file: File) {
  const [id] = await saveFiles([file])
  return id
}

export async function saveFiles(files: File[]) {
  if (!files.length) return []
  const db = await openFiles()
  const ids = files.map(() => crypto.randomUUID())
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite")
    transaction.oncomplete = () => resolve()
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Saving attachments was aborted"))
    const store = transaction.objectStore("files")
    try {
      files.forEach((file, index) => store.put(file, ids[index]))
    } catch (error) {
      transaction.abort()
      reject(error)
    }
  })
  return ids
}

export async function getFile(id: string) {
  if (isCloudFileId(id) || isR2FileId(id)) return undefined
  const db = await openFiles()
  return new Promise<File | undefined>((resolve, reject) => {
    const request = db.transaction("files").objectStore("files").get(id)
    request.onsuccess = () => resolve(request.result as File | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function uploadOrderFiles(
  orderId: string,
  folder: "attachments" | "videos",
  files: File[],
  options?: {
    localOnly?: boolean
    onProgress?: (percent: number, done: number, total: number) => void
  }
): Promise<UploadedFileRecord[]> {
  if (!files.length) return []
  const kind = folder === "videos" ? "video" : "attachment"
  for (const file of files) {
    const check = validateOrderFile(file, kind)
    if (!check.ok) {
      throw new Error(
        check.reason === "too_large"
          ? `File exceeds ${check.maxMb}MB limit`
          : "Empty file"
      )
    }
  }
  options?.onProgress?.(8, 0, files.length)
  const sb = options?.localOnly ? null : getSupabaseClient()
  if (!sb) {
    const ids = await saveFiles(files)
    options?.onProgress?.(100, files.length, files.length)
    return files.map((file, index) => ({
      fileId: ids[index],
      storageKey: `local:${ids[index]}`,
      name: file.name,
      type: file.type,
      size: file.size,
    }))
  }

  const useR2 = await checkR2Available()
  const results: UploadedFileRecord[] = []
  for (let idx = 0; idx < files.length; idx += 1) {
    const file = files[idx]
    if (useR2) {
      const signed = await requestR2Presign<{
        uploadUrl: string
        objectKey: string
        fileId: string
      }>({
        action: "presign_upload",
        orderId,
        folder,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      })
      if (signed?.uploadUrl && signed.fileId) {
        await uploadFileToPresignedUrl(signed.uploadUrl, file, (fraction) => {
          const overall = Math.round(((idx + fraction) / files.length) * 100)
          options?.onProgress?.(
            Math.max(5, Math.min(99, overall)),
            idx,
            files.length
          )
        })
        results.push({
          fileId: signed.fileId,
          storageKey: signed.fileId,
          name: file.name,
          type: file.type,
          size: file.size,
        })
        const percent = Math.round(((idx + 1) / files.length) * 100)
        options?.onProgress?.(percent, idx + 1, files.length)
        continue
      }
    }

    const safeName = sanitizeStorageFileName(file.name)
    const objectPath = `orders/${orderId}/${folder}/${crypto.randomUUID()}-${safeName}`
    const { error } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })
    if (error) throw error
    const fileId = `${CLOUD_FILE_PREFIX}${objectPath}`
    results.push({
      fileId,
      storageKey: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
    })
    const percent = Math.round(((idx + 1) / files.length) * 100)
    options?.onProgress?.(percent, idx + 1, files.length)
  }
  return results
}

export async function resolveFileSource(
  fileId: string
): Promise<ResolvedFileSource | null> {
  if (isR2FileId(fileId)) {
    const objectKey = extractR2Path(fileId)
    const cacheKey = `r2:${objectKey}`
    const cached = signedUrlCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return { url: cached.url }
    }
    const signed = await requestR2Presign<{ url: string }>({
      action: "presign_download",
      objectKey,
    })
    if (!signed?.url) return null
    signedUrlCache.set(cacheKey, {
      url: signed.url,
      expiresAt: Date.now() + 30 * 60_000,
    })
    return { url: signed.url }
  }

  if (isCloudFileId(fileId)) {
    const sb = getSupabaseClient()
    if (!sb) return null
    const objectPath = extractCloudPath(fileId)
    const cached = signedUrlCache.get(objectPath)
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return { url: cached.url }
    }
    const { data, error } = await sb.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(objectPath, 3600)
    if (error || !data?.signedUrl) return null
    signedUrlCache.set(objectPath, {
      url: data.signedUrl,
      expiresAt: Date.now() + 30 * 60_000,
    })
    return { url: data.signedUrl }
  }

  const local = await getFile(fileId)
  if (!local) return null
  const url = URL.createObjectURL(local)
  return {
    url,
    blob: local,
    revoke: () => URL.revokeObjectURL(url),
  }
}

export async function fetchFileBytes(
  fileId: string
): Promise<Uint8Array | null> {
  if (isR2FileId(fileId)) {
    const resolved = await resolveFileSource(fileId)
    if (!resolved?.url) return null
    const response = await fetch(resolved.url)
    if (!response.ok) return null
    return new Uint8Array(await response.arrayBuffer())
  }

  if (isCloudFileId(fileId)) {
    const sb = getSupabaseClient()
    if (!sb) return null
    const objectPath = extractCloudPath(fileId)
    const { data, error } = await sb.storage
      .from(STORAGE_BUCKET)
      .download(objectPath)
    if (error || !data) return null
    return new Uint8Array(await data.arrayBuffer())
  }

  const local = await getFile(fileId)
  if (!local) return null
  return new Uint8Array(await local.arrayBuffer())
}

export function downloadFile(file: Blob | string, name: string) {
  const link = document.createElement("a")
  link.href = typeof file === "string" ? file : URL.createObjectURL(file)
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  if (typeof file !== "string")
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export async function downloadOrderFile(
  fileId: string | undefined,
  fallbackUrl: string,
  name: string
) {
  if (!fileId) {
    downloadFile(fallbackUrl, name)
    return
  }
  if (isR2FileId(fileId)) {
    const objectKey = extractR2Path(fileId)
    const signed = await requestR2Presign<{ url: string }>({
      action: "presign_download",
      objectKey,
      downloadName: name,
    })
    if (!signed?.url) throw new Error("Download link unavailable")
    downloadFile(signed.url, name)
    return
  }
  if (isCloudFileId(fileId)) {
    const sb = getSupabaseClient()
    if (!sb) throw new Error("Storage unavailable")
    const objectPath = extractCloudPath(fileId)
    const { data, error } = await sb.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(objectPath, 300, { download: name })
    if (error || !data?.signedUrl) throw new Error("Download link unavailable")
    downloadFile(data.signedUrl, name)
    return
  }
  const local = await getFile(fileId)
  if (!local) throw new Error("Missing file")
  downloadFile(local, name)
}
