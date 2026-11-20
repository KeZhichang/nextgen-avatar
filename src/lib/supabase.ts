import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/portal/database.types"

const dataMode = (import.meta.env.VITE_DATA_MODE as string | undefined)
  ?.trim()
  .toLowerCase()
const dataMode = (
  import.meta.env.VITE_DATA_MODE as string | undefined
)?.trim().toLowerCase()
const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL as string | undefined
)?.trim()
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
)?.trim()

export const supabaseConfigured =
  dataMode !== "mock" && Boolean(supabaseUrl && supabasePublishableKey)

let client: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!supabaseConfigured) return null
  if (!client) {
    client = createClient<Database>(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
