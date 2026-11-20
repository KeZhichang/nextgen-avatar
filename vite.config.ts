import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { stripePreviewPlugin } from "./server/stripe-preview.ts"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    stripePreviewPlugin(
      loadEnv(mode, process.cwd(), "STRIPE_PREVIEW_").STRIPE_PREVIEW_SECRET_KEY
    ),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
}))
