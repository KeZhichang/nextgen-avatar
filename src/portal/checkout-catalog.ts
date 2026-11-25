export type Plan = {
  id: string
  zh: string
  en: string
  tagZh?: string
  tagEn?: string
  count: number
  price: number
  regular?: number
  renewal?: number
  active?: boolean
}

export type Addon = {
  id: string
  zh: string
  en: string
  price: number
  active: boolean
}

export type CheckoutExtras = { script: boolean; duration: boolean }

export const defaultPlans: Plan[] = [
  {
    id: "trial",
    zh: "体验视频（单条）",
    en: "Trial Video (1 video)",
    tagZh: "首单尝鲜",
    tagEn: "Starter Trial",
    count: 1,
    price: 59,
    active: true,
  },
  {
    id: "presenter-5",
    zh: "AI 标准版口播 · 5 条套餐",
    en: "AI Standard Presenter · 5 Videos",
    tagZh: "最受欢迎",
    tagEn: "Most Popular",
    count: 5,
    price: 459,
    renewal: 359,
    active: true,
  },
  {
    id: "presenter-10",
    zh: "AI 标准版口播 · 10 条套餐",
    en: "AI Standard Presenter · 10 Videos",
    tagZh: "标准版",
    tagEn: "Standard",
    count: 10,
    price: 759,
    renewal: 659,
    active: true,
  },
  {
    id: "presenter-15",
    zh: "AI 标准版口播 · 15 条套餐",
    en: "AI Standard Presenter · 15 Videos",
    tagZh: "批量优惠",
    tagEn: "Best Value",
    count: 15,
    price: 999,
    renewal: 899,
    active: true,
  },
  {
    id: "cinematic-4",
    zh: "AI 电影版口播 · 4 条套餐",
    en: "AI Cinematic Presenter · 4 Videos",
    tagZh: "电影版",
    tagEn: "Cinematic",
    count: 4,
    price: 459,
    renewal: 359,
    active: true,
  },
  {
    id: "cinematic-6",
    zh: "AI 电影版口播 · 6 条套餐",
    en: "AI Cinematic Presenter · 6 Videos",
    tagZh: "电影版",
    tagEn: "Cinematic",
    count: 6,
    price: 599,
    renewal: 499,
    active: true,
  },
  {
    id: "cinematic-8",
    zh: "AI 电影版口播 · 8 条套餐",
    en: "AI Cinematic Presenter · 8 Videos",
    tagZh: "电影版",
    tagEn: "Cinematic",
    count: 8,
    price: 739,
    renewal: 639,
    active: true,
  },
]

export const defaultQuote: Plan = {
  id: "quote",
  zh: "定制报价单 #QUOTE-8842",
  en: "Custom quote #QUOTE-8842",
  count: 10,
  price: 1250,
  active: true,
}

export const defaultAddonItems: Addon[] = [
  {
    id: "script",
    zh: "定制口播脚本撰写",
    en: "Custom script copywriting",
    price: 50,
    active: true,
  },
  {
    id: "duration",
    zh: "单条延长时长 (+30 秒)",
    en: "Extra runtime (+30 seconds)",
    price: 25,
    active: true,
  },
]

export const defaultAddons = { script: 50, duration: 25 }
export const stripePreviewPlans = [...defaultPlans, defaultQuote]

export function stripePreviewTotal(plan: Plan, extras: CheckoutExtras) {
  return (
    plan.price +
    (extras.script ? defaultAddons.script : 0) +
    (extras.duration ? defaultAddons.duration : 0)
  )
}

export type StripePreviewReceipt = {
  id: string
  planId: string
  extras: CheckoutExtras
  total: number
  method: "card" | "apple" | "ach"
  status: "paid" | "processing" | "open" | "expired" | "failed"
  receiptUrl?: string
  livemode?: boolean
}
