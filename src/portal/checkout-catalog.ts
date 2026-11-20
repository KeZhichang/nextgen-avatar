export type Plan = {
  id: string
  zh: string
  en: string
  tagZh?: string
  tagEn?: string
  count: number
  price: number
  regular?: number
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
    id: "pro",
    zh: "专业 5 条套餐",
    en: "Pro 5-Pack",
    tagZh: "最受欢迎",
    tagEn: "Most Popular",
    count: 5,
    price: 299,
    regular: 349,
    active: true,
  },
  {
    id: "trial",
    zh: "新用户尝鲜单条",
    en: "Starter Trial",
    tagZh: "首单尝鲜",
    tagEn: "Starter",
    count: 1,
    price: 59,
    active: true,
  },
  {
    id: "ent",
    zh: "企业 15 条套餐",
    en: "Enterprise 15-Pack",
    tagZh: "批量优惠",
    tagEn: "Best Value",
    count: 15,
    price: 765,
    regular: 899,
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
    zh: "英文口播脚本撰写",
    en: "Additional script copywriting",
    price: 49,
    active: true,
  },
  {
    id: "duration",
    zh: "单条时长扩容至 5 分钟",
    en: "Extended duration (5 min)",
    price: 79,
    active: true,
  },
]

export const defaultAddons = { script: 49, duration: 79 }
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
}
