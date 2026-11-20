let database: Promise<IDBDatabase> | undefined

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
  const db = await openFiles()
  return new Promise<File | undefined>((resolve, reject) => {
    const request = db.transaction("files").objectStore("files").get(id)
    request.onsuccess = () => resolve(request.result as File | undefined)
    request.onerror = () => reject(request.error)
  })
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
