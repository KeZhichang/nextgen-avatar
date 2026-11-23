import { getSupabaseClient } from "@/lib/supabase"

export const STORAGE_BUCKET = "order-media"
export const CLOUD_FILE_PREFIX = "sb:"

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

export function isCloudFileId(id?: string): id is string {
  return Boolean(id && id.startsWith(CLOUD_FILE_PREFIX))
}

export function extractCloudPath(id: string): string {
  return id.slice(CLOUD_FILE_PREFIX.length)
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
  if (isCloudFileId(id)) return undefined
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
  options?: { localOnly?: boolean }
): Promise<UploadedFileRecord[]> {
  if (!files.length) return []
  const sb = options?.localOnly ? null : getSupabaseClient()
  if (!sb) {
    const ids = await saveFiles(files)
    return files.map((file, index) => ({
      fileId: ids[index],
      storageKey: `local:${ids[index]}`,
      name: file.name,
      type: file.type,
      size: file.size,
    }))
  }

  const results: UploadedFileRecord[] = []
  for (const file of files) {
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
  }
  return results
}

export async function resolveFileSource(
  fileId: string
): Promise<ResolvedFileSource | null> {
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
