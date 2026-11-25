export type CheckoutEligibilityEnv = {
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseServiceRoleKey?: string
}

export type ServerPlanPricing = {
  id: string
  nameZh: string
  nameEn: string
  videoCount: number
  priceDollars: number
  renewalDollars?: number
}

export type EligibilityCheckResult =
  | {
      ok: true
      isRepeatCustomer: boolean
      appliedRenewal: boolean
      authoritativePrice?: number
      authoritativeName?: string
      authoritativeCount?: number
    }
  | {
      ok: false
      status: number
      error: string
    }

const fallbackPlans: Record<string, ServerPlanPricing> = {
  trial: {
    id: "trial",
    nameZh: "体验视频（单条）",
    nameEn: "Trial Video (1 video)",
    videoCount: 1,
    priceDollars: 59,
  },
  "presenter-5": {
    id: "presenter-5",
    nameZh: "AI 标准版口播 · 5 条套餐",
    nameEn: "AI Standard Presenter · 5 Videos",
    videoCount: 5,
    priceDollars: 459,
    renewalDollars: 359,
  },
  "presenter-10": {
    id: "presenter-10",
    nameZh: "AI 标准版口播 · 10 条套餐",
    nameEn: "AI Standard Presenter · 10 Videos",
    videoCount: 10,
    priceDollars: 759,
    renewalDollars: 659,
  },
  "presenter-15": {
    id: "presenter-15",
    nameZh: "AI 标准版口播 · 15 条套餐",
    nameEn: "AI Standard Presenter · 15 Videos",
    videoCount: 15,
    priceDollars: 999,
    renewalDollars: 899,
  },
  "cinematic-4": {
    id: "cinematic-4",
    nameZh: "AI 电影版口播 · 4 条套餐",
    nameEn: "AI Cinematic Presenter · 4 Videos",
    videoCount: 4,
    priceDollars: 459,
    renewalDollars: 359,
  },
  "cinematic-6": {
    id: "cinematic-6",
    nameZh: "AI 电影版口播 · 6 条套餐",
    nameEn: "AI Cinematic Presenter · 6 Videos",
    videoCount: 6,
    priceDollars: 599,
    renewalDollars: 499,
  },
  "cinematic-8": {
    id: "cinematic-8",
    nameZh: "AI 电影版口播 · 8 条套餐",
    nameEn: "AI Cinematic Presenter · 8 Videos",
    videoCount: 8,
    priceDollars: 739,
    renewalDollars: 639,
  },
}

function readBearerToken(authorizationHeader: string | string[] | undefined) {
  const raw = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader
  if (!raw) return ""
  const match = raw.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ""
}

export async function verifyCheckoutEligibility(options: {
  planId: string
  locale: "zh" | "en"
  authorizationHeader?: string | string[]
  clientId?: string
  env: CheckoutEligibilityEnv
}): Promise<EligibilityCheckResult> {
  const { planId, locale, authorizationHeader, clientId, env } = options
  if (!planId || planId === "quote") {
    return { ok: true, isRepeatCustomer: false, appliedRenewal: false }
  }

  const supabaseUrl = env.supabaseUrl?.trim().replace(/\/+$/, "") ?? ""
  const anonKey = env.supabaseAnonKey?.trim() ?? ""
  const serviceRoleKey = env.supabaseServiceRoleKey?.trim() ?? ""
  const userToken = readBearerToken(authorizationHeader)

  let isRepeatCustomer = false
  let dbPlan: ServerPlanPricing | null = null

  if (supabaseUrl && (anonKey || serviceRoleKey)) {
    // 1. Authoritatively check whether the authenticated user already has >= 1 order
    try {
      if (userToken && anonKey) {
        const rpcRes = await fetch(
          `${supabaseUrl}/rest/v1/rpc/is_repeat_customer`,
          {
            method: "POST",
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${userToken}`,
              "Content-Type": "application/json",
            },
            body: "{}",
          }
        )
        if (rpcRes.ok) {
          const parsed = (await rpcRes.json()) as unknown
          if (typeof parsed === "boolean") {
            isRepeatCustomer = parsed
          }
        }
      } else if (serviceRoleKey && clientId) {
        const rpcRes = await fetch(
          `${supabaseUrl}/rest/v1/rpc/is_repeat_customer`,
          {
            method: "POST",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ target_user_id: clientId }),
          }
        )
        if (rpcRes.ok) {
          const parsed = (await rpcRes.json()) as unknown
          if (typeof parsed === "boolean") {
            isRepeatCustomer = parsed
          }
        }
      }
    } catch {
      // Fail open on transient lookup issues only for non-critical metadata
    }

    // 2. Fetch authoritative plan pricing from database (supports dynamic admin edits)
    try {
      const apiKey = serviceRoleKey || anonKey
      const authBearer = serviceRoleKey || userToken || anonKey
      const planRes = await fetch(
        `${supabaseUrl}/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&select=id,name_zh,name_en,video_count,price_cents,renewal_price_cents&limit=1`,
        {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${authBearer}`,
          },
        }
      )
      if (planRes.ok) {
        const rows = (await planRes.json()) as Array<{
          id: string
          name_zh: string
          name_en: string
          video_count: number
          price_cents: number
          renewal_price_cents?: number | null
        }>
        const row = rows[0]
        if (row && row.price_cents > 0) {
          dbPlan = {
            id: row.id,
            nameZh: row.name_zh,
            nameEn: row.name_en,
            videoCount: row.video_count,
            priceDollars: Math.round(row.price_cents) / 100,
            renewalDollars:
              typeof row.renewal_price_cents === "number" &&
              row.renewal_price_cents > 0
                ? Math.round(row.renewal_price_cents) / 100
                : fallbackPlans[row.id]?.renewalDollars,
          }
        }
      }
    } catch {
      // Fall back to static catalog if DB lookup fails
    }
  }

  // Rule 1: Starter Trial ($59) is strictly limited to new customers (first order only)
  if (planId === "trial" && isRepeatCustomer) {
    return {
      ok: false,
      status: 403,
      error: "trial_new_customers_only",
    }
  }

  // Rule 2: Repeat customers automatically receive renewal pricing; new customers pay first-month price
  const authoritative = dbPlan ?? fallbackPlans[planId]
  if (!authoritative) {
    return { ok: true, isRepeatCustomer, appliedRenewal: false }
  }

  const canApplyRenewal =
    isRepeatCustomer &&
    typeof authoritative.renewalDollars === "number" &&
    authoritative.renewalDollars > 0 &&
    authoritative.renewalDollars < authoritative.priceDollars

  return {
    ok: true,
    isRepeatCustomer,
    appliedRenewal: canApplyRenewal,
    authoritativePrice: canApplyRenewal
      ? authoritative.renewalDollars
      : authoritative.priceDollars,
    authoritativeName:
      locale === "zh" ? authoritative.nameZh : authoritative.nameEn,
    authoritativeCount: authoritative.videoCount,
  }
}
