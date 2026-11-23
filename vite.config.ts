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
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            {
              name: "vendor-supabase",
              test: /node_modules[\\/]@supabase[\\/]/,
            },
            {
              name: "vendor-ui",
              test: /node_modules[\\/](radix-ui|@radix-ui|lucide-react|motion|sonner|i18next|react-i18next)[\\/]/,
            },
            {
              name: "vendor-stripe",
              test: /node_modules[\\/]@stripe[\\/]/,
            },
          ],
        },
      },
    },
  },
}))
