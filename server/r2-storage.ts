import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vite"

import { handleR2StorageRequest } from "../api/storage/r2.ts"

export function r2StoragePlugin(env: Record<string, string | undefined>): Plugin {
  const mergedEnv: Record<string, string | undefined> = {
    ...process.env,
    ...env,
  }

  const mount = (req: IncomingMessage, res: ServerResponse) => {
    void handleR2StorageRequest(req, res, mergedEnv).catch((err) => {
      console.error("[vite/r2-storage] unhandled error:", err)
      res.statusCode = 500
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      res.end(JSON.stringify({ error: "storage_signing_failed" }))
    })
  }

  return {
    name: "nextgen-r2-storage",
    configureServer(server) {
      server.middlewares.use("/api/storage/r2", mount)
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/storage/r2", mount)
    },
  }
}
