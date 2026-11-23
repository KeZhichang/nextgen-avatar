import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { User } from "@supabase/supabase-js"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router"

import { getSupabaseClient, supabaseConfigured } from "@/lib/supabase"
import { isLocale } from "./i18n"
import {
  defaultAddonItems,
  defaultPlans,
  type Addon,
  type Plan,
} from "./checkout-catalog"
import {
  defaultTeamMembers,
  defaultTeamRoles,
  getRoleConfig,
  hasPermission,
  type PermissionKey,
  type TeamMember,
  type TeamRoleConfig,
  type TeamRoleId,
} from "./rbac"
import {
  addTeamMemberInDb,
  createOrderInDb,
  fetchAuthenticatedSnapshot,
  fetchCustomQuoteInDb,
  fetchPublicCatalog,
  insertMessageInDb,
  insertNotificationInDb,
  insertVersionInDb,
  markCustomQuotePaidInDb,
  markNotificationReadInDb,
  markNotificationsReadInDb,
  saveCatalogToDb,
  saveCustomQuoteInDb,
  saveProfileInDb,
  subscribeWorkspaceRealtime,
  syncRolePermissionsInDb,
  updateOrderInDb,
  updateTeamMemberInDb,
  type ClientDirectoryEntry,
  type CustomQuoteRecord,
  type NotificationItem,
} from "./supabase-sync"

export type { Addon, Plan } from "./checkout-catalog"
export type {
  PermissionKey,
  TeamMember,
  TeamRoleConfig,
  TeamRoleId,
} from "./rbac"
export type {
  ClientDirectoryEntry,
  CustomQuoteRecord,
  NotificationItem,
} from "./supabase-sync"

export const sampleOrder = "NGA-20261108"
const storageKey = "nextgen-avatar-demo-v1"
const hideSampleData =
  (import.meta.env.VITE_HIDE_SAMPLE_DATA as string | undefined)
    ?.trim()
    .toLowerCase() === "true"

export const demoExperienceEnabled = !hideSampleData
export const demoClientEmail = "sarah.lin@gmail.com"
export const demoClientPassword = "nextgen-demo"
export const demoTeamPassword = "studio-demo"

export type AuthUser = {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  isDemo?: boolean
}

function readStringField(
  record: Record<string, unknown> | undefined,
  keys: string[]
): string | undefined {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function mapSupabaseUser(user: User, fallbackEmail = ""): AuthUser {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const googleIdentity = user.identities?.find(
    (item) => item.provider === "google"
  )?.identity_data as Record<string, unknown> | undefined
  const firstIdentity = user.identities?.[0]?.identity_data as
    | Record<string, unknown>
    | undefined

  const fullName =
    readStringField(meta, ["full_name", "name", "user_name"]) ??
    readStringField(googleIdentity, ["full_name", "name"]) ??
    readStringField(firstIdentity, ["full_name", "name"])

  const avatarUrl =
    readStringField(meta, ["avatar_url", "picture"]) ??
    readStringField(googleIdentity, ["avatar_url", "picture"]) ??
    readStringField(firstIdentity, ["avatar_url", "picture"])

  return {
    id: user.id,
    email: user.email ?? fallbackEmail,
    fullName,
    avatarUrl,
  }
}

export type Status =
  | "waiting_assets"
  | "producing"
  | "waiting_confirm"
  | "revision"
  | "approved"
  | "completed"
export type Role = "admin" | "producer"
export type ChatAttachment = {
  fileId: string
  name: string
  type?: string
  size?: number
}

export type EntryVersionRef = {
  id: string
  type: "preview" | "final"
  note?: string
}

export type Entry = {
  id: string
  side: "client" | "studio"
  text: string
  attachments?: ChatAttachment[]
  attachment?: string
  fileId?: string
  versionRef?: EntryVersionRef
}
export type Version = {
  id: string
  type: "preview" | "final"
  note: string
  file?: string
  fileId?: string
}
export type Order = {
  id: string
  zh: string
  en: string
  client: string
  clientId?: string
  status: Status
  plan: string
  count: number
  total: number
  method: string
  paymentSession?: string
  receiptUrl?: string
  owner: string
  entries: Entry[]
  versions: Version[]
  revision?: string
  demo?: boolean
}

function order(
  id: string,
  zh: string,
  en: string,
  client: string,
  status: Status,
  owner: string
): Order {
  return {
    id,
    zh,
    en,
    client,
    status,
    plan: "pro",
    count: 5,
    total: 299,
    method: "card",
    owner,
    entries: [],
    versions: [],
  }
}

const sample: Order = {
  ...order(
    sampleOrder,
    "Q4 新品发布会口播",
    "Q4 product launch video",
    "Sarah Lin",
    "waiting_confirm",
    "Leo"
  ),
  versions: [
    { id: "v1", type: "preview", note: "Initial review version" },
    { id: "v2", type: "preview", note: "Updated pacing and opening shot" },
  ],
}

type DemoState = {
  plans: Plan[]
  orders: Order[]
  role: Role
  unread: boolean
  notifications: NotificationItem[]
  account: { name: string; email: string; company: string; avatarUrl?: string }
  addons: Addon[]
  teamRoles: TeamRoleConfig[]
  teamMembers: TeamMember[]
  teamSession: string | null
  clients: ClientDirectoryEntry[]
  customQuotes: CustomQuoteRecord[]
}

const defaultDemoQuotes: CustomQuoteRecord[] = [
  {
    id: "QUOTE-9021",
    clientEmail: "michael@eduscale.io",
    projectName: "EduScale Q4 Course Series",
    videoCount: 10,
    amountDollars: 1250,
    status: "open",
    createdAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
  },
  {
    id: "QUOTE-8842",
    clientEmail: "sarah@apexlabs.io",
    projectName: "Apex Labs Launch Pack",
    videoCount: 15,
    amountDollars: 1650,
    status: "paid",
    createdAt: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(),
  },
]

const defaultDemoNotifications: NotificationItem[] = [
  {
    id: "demo-notif-review",
    orderId: sampleOrder,
    eventType: "draft_ready",
    titleZh: "修订版 v2 已上传，等待审片",
    titleEn: "Revision v2 is ready for review",
    bodyZh: "Q4 新品发布会口播 · 请在线审片确认或提交修改意见",
    bodyEn: "Q4 product launch video · Review and approve or request changes",
    isRead: false,
    createdAt: new Date(Date.now() - 25 * 60_000).toISOString(),
  },
  {
    id: "demo-notif-assets",
    orderId: "NGA-20261115",
    eventType: "awaiting_assets",
    titleZh: "请上传素材以启动制作",
    titleEn: "Upload materials to start production",
    bodyZh: "Black Friday 大促口播 · 发送照片、干声与台词即可开工",
    bodyEn: "Black Friday campaign · Share photos, audio, and script in chat",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "demo-notif-delivered",
    orderId: "NGA-20261024",
    eventType: "final_delivered",
    titleZh: "正式无水印成片已交付",
    titleEn: "Watermark-free final video delivered",
    bodyZh: "创始人年度致辞 · 可在工作台随时下载 1080P 成片",
    bodyEn: "Founder's annual message · Download your 1080P final anytime",
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 3600_000).toISOString(),
  },
]

const initialDemo: DemoState = {
  plans: defaultPlans,
  orders: [
    sample,
    order(
      "NGA-20261115",
      "Black Friday 大促口播",
      "Black Friday campaign",
      "Sarah Lin",
      "waiting_assets",
      ""
    ),
    {
      ...order(
        "NGA-20261024",
        "创始人年度致辞",
        "Founder’s annual message",
        "Sarah Lin",
        "completed",
        "Mia"
      ),
      versions: [{ id: "final", type: "final", note: "Final delivery" }],
    },
    order(
      "NGA-20261105",
      "企业品牌介绍",
      "Company introduction",
      "Michael Ross",
      "revision",
      "Mia"
    ),
    order(
      "NGA-20261112",
      "产品功能介绍",
      "Product walkthrough",
      "Emily Clark",
      "producing",
      "Leo"
    ),
  ],
  role: "admin",
  unread: true,
  notifications: defaultDemoNotifications,
  account: {
    name: "Sarah Lin",
    email: "sarah.lin@gmail.com",
    company: "Apex Labs (US)",
  },
  addons: defaultAddonItems,
  teamRoles: defaultTeamRoles,
  teamMembers: defaultTeamMembers,
  teamSession: null,
  clients: [],
  customQuotes: defaultDemoQuotes,
}

const initialLive: DemoState = {
  plans: defaultPlans,
  orders: [],
  role: "producer",
  unread: false,
  notifications: [],
  account: { name: "", email: "", company: "" },
  addons: defaultAddonItems,
  teamRoles: defaultTeamRoles,
  teamMembers: [],
  teamSession: null,
  clients: [],
  customQuotes: [],
}

function normalizePlans(raw: unknown): Plan[] {
  if (!Array.isArray(raw) || raw.length === 0) return initialDemo.plans
  return raw.map((item) => {
    const plan = item as Partial<Plan>
    const fallback = defaultPlans.find((preset) => preset.id === plan.id)
    return {
      id: typeof plan.id === "string" && plan.id ? plan.id : "plan",
      zh: typeof plan.zh === "string" ? plan.zh : (fallback?.zh ?? ""),
      en: typeof plan.en === "string" ? plan.en : (fallback?.en ?? ""),
      tagZh:
        typeof plan.tagZh === "string" ? plan.tagZh : (fallback?.tagZh ?? ""),
      tagEn:
        typeof plan.tagEn === "string" ? plan.tagEn : (fallback?.tagEn ?? ""),
      count:
        typeof plan.count === "number" && plan.count > 0
          ? plan.count
          : (fallback?.count ?? 1),
      price:
        typeof plan.price === "number" && plan.price > 0
          ? plan.price
          : (fallback?.price ?? 99),
      regular:
        typeof plan.regular === "number" &&
        plan.regular > (plan.price ?? fallback?.price ?? 0)
          ? plan.regular
          : undefined,
      active: typeof plan.active === "boolean" ? plan.active : true,
    }
  })
}

function normalizeAddons(raw: unknown): Addon[] {
  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      const addon = item as Partial<Addon>
      return {
        id:
          typeof addon.id === "string" && addon.id
            ? addon.id
            : `addon-${idx + 1}`,
        zh: typeof addon.zh === "string" ? addon.zh : "",
        en: typeof addon.en === "string" ? addon.en : "",
        price:
          typeof addon.price === "number" && addon.price >= 0 ? addon.price : 0,
        active: typeof addon.active === "boolean" ? addon.active : true,
      }
    })
  }
  if (raw && typeof raw === "object") {
    const legacy = raw as { script?: number; duration?: number }
    return defaultAddonItems.map((item) => ({
      ...item,
      price:
        item.id === "script" && typeof legacy.script === "number"
          ? legacy.script
          : item.id === "duration" && typeof legacy.duration === "number"
            ? legacy.duration
            : item.price,
    }))
  }
  return initialDemo.addons
}

function restore(): DemoState {
  if (supabaseConfigured) return initialLive
  try {
    const saved = sessionStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<DemoState>
      return {
        ...initialDemo,
        ...parsed,
        plans: normalizePlans(parsed.plans),
        addons: normalizeAddons(parsed.addons),
        teamRoles:
          Array.isArray(parsed.teamRoles) && parsed.teamRoles.length
            ? parsed.teamRoles
            : initialDemo.teamRoles,
        teamMembers:
          Array.isArray(parsed.teamMembers) && parsed.teamMembers.length
            ? parsed.teamMembers
            : initialDemo.teamMembers,
        teamSession:
          typeof parsed.teamSession === "string" || parsed.teamSession === null
            ? parsed.teamSession
            : initialDemo.teamSession,
      }
    }
  } catch {
    // The sample pages work in memory when storage is unavailable.
  }
  return initialDemo
}

function buildDemoOrdersForAccount(
  accountName: string,
  includeTeamSamples: boolean
): Order[] {
  const displayClient = accountName.trim() || "Client"
  const source = includeTeamSamples
    ? initialDemo.orders
    : initialDemo.orders.filter((item) => item.client === "Sarah Lin")

  return source.map((item) => ({
    ...item,
    client: item.client === "Sarah Lin" ? displayClient : item.client,
    entries: item.entries.map((entry) => ({ ...entry })),
    versions: item.versions.map((ver) => ({ ...ver })),
    demo: true,
  }))
}

function mergeWithSampleOrders(
  realOrders: Order[],
  existingOrders: Order[],
  accountName: string,
  includeTeamSamples: boolean
): Order[] {
  if (hideSampleData) return realOrders
  const realIds = new Set(realOrders.map((item) => item.id))
  const existingDemosById = new Map(
    existingOrders.filter((item) => item.demo).map((item) => [item.id, item])
  )
  const displayClient = accountName.trim() || "Client"
  const defaults = buildDemoOrdersForAccount(displayClient, includeTeamSamples)
  const demoOrders = defaults
    .filter((item) => !realIds.has(item.id))
    .map((item) => {
      const existing = existingDemosById.get(item.id)
      if (!existing) return item
      const isOwnSample = initialDemo.orders.some(
        (preset) => preset.id === item.id && preset.client === "Sarah Lin"
      )
      return {
        ...existing,
        client: isOwnSample ? displayClient : existing.client,
        demo: true,
      }
    })
  return [...realOrders, ...demoOrders]
}

export type AuthResult = { ok: true } | { ok: false; reason: string }

type DemoContextValue = {
  isLiveSupabase: boolean
  authLoading: boolean
  authUser: AuthUser | null
  data: DemoState
  update: (fn: (current: DemoState) => DemoState) => void
  updateOrder: (id: string, fn: (value: Order) => Order) => void
  createOrder: (
    plan: Plan,
    total: number,
    method: string,
    options?: {
      paymentSession?: string
      projectName?: string
      addonIds?: string[]
      customQuoteId?: string
      receiptUrl?: string
    }
  ) => string
  refreshFromSupabase: () => Promise<void>
  loadCustomQuote: (quoteId: string) => Promise<CustomQuoteRecord | null>
  // Auth
  signInClient: (email: string, password: string) => Promise<AuthResult>
  signUpClient: (
    name: string,
    email: string,
    password: string
  ) => Promise<AuthResult>
  signInWithGoogle: (redirectTo: string) => Promise<AuthResult>
  sendPasswordReset: (email: string, redirectTo: string) => Promise<AuthResult>
  signInTeamWithPassword: (
    email: string,
    password: string
  ) => Promise<AuthResult>
  signInDemoClient: (email?: string, name?: string) => void
  signInDemoTeam: (memberId: string) => boolean
  signOutAll: () => Promise<void>
  // Persisted domain mutations
  saveCatalog: (plans: Plan[], addons: Addon[]) => Promise<boolean>
  saveAccountProfile: (profile: {
    name: string
    email: string
    company: string
  }) => Promise<boolean>
  renameOrder: (orderId: string, title: string) => Promise<boolean>
  assignOrderOwner: (orderId: string, ownerName: string) => Promise<boolean>
  startOrderProduction: (
    orderId: string,
    messageText: string
  ) => Promise<boolean>
  sendChatMessage: (
    orderId: string,
    side: Entry["side"],
    text: string,
    attachments?: ChatAttachment[]
  ) => Promise<boolean>
  publishOrderVersion: (
    orderId: string,
    version: Version,
    messageText: string
  ) => Promise<boolean>
  submitOrderReview: (
    orderId: string,
    action: "approve" | "revision",
    messageText: string,
    revisionNote?: string
  ) => Promise<boolean>
  saveCustomQuote: (quote: {
    id: string
    clientEmail: string
    projectName: string
    videoCount: number
    amountDollars: number
  }) => Promise<boolean>
  toggleTeamRolePermission: (
    roleId: TeamRoleId,
    permission: PermissionKey
  ) => Promise<boolean>
  resetTeamRolePermissions: () => Promise<boolean>
  addTeamMember: (member: {
    name: string
    email: string
    roleId: TeamRoleId
  }) => Promise<boolean>
  updateTeamMember: (
    memberId: string,
    patch: { roleId?: TeamRoleId; active?: boolean }
  ) => Promise<boolean>
  markNotificationRead: (notificationId: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoState>(restore)
  const [authLoading, setAuthLoading] = useState(supabaseConfigured)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const authUserRef = useRef<AuthUser | null>(null)
  const dataRef = useRef(data)

  function isDemoOrder(orderId: string): boolean {
    return Boolean(
      dataRef.current.orders.find((item) => item.id === orderId)?.demo
    )
  }

  function getLiveDbUser() {
    const sb = getSupabaseClient()
    const user = authUserRef.current
    if (!sb || !user || user.isDemo) return null
    return { sb, user }
  }

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    if (supabaseConfigured) return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(data))
    } catch {
      // The change is still available in the current page session.
    }
  }, [data])

  const loadCatalog = useCallback(async () => {
    const sb = getSupabaseClient()
    if (!sb) return
    try {
      const catalog = await fetchPublicCatalog(sb)
      setData((current) => ({
        ...current,
        plans: catalog.plans.length > 0 ? catalog.plans : current.plans,
        addons: catalog.addons.length > 0 ? catalog.addons : current.addons,
      }))
    } catch {
      // Keep fallback catalog until DB is seeded
    }
  }, [])

  const loadSnapshotForUser = useCallback(async (user: AuthUser | null) => {
    const sb = getSupabaseClient()
    if (!sb) return
    if (!user) {
      setData((current) => ({
        ...initialLive,
        plans: current.plans,
        addons: current.addons,
      }))
      return
    }
    try {
      const [catalog, snapshot] = await Promise.all([
        fetchPublicCatalog(sb).catch(() => null),
        fetchAuthenticatedSnapshot(sb, user.id, user.email, {
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
        }),
      ])
      setData((current) => {
        const mergedOrders = mergeWithSampleOrders(
          snapshot.orders,
          current.orders,
          snapshot.account.name,
          Boolean(snapshot.teamMemberId)
        )
        return {
          ...current,
          plans:
            catalog && catalog.plans.length > 0 ? catalog.plans : current.plans,
          addons:
            catalog && catalog.addons.length > 0
              ? catalog.addons
              : current.addons,
          account: {
            name: snapshot.account.name,
            email: snapshot.account.email,
            company: snapshot.account.company,
            avatarUrl: snapshot.account.avatarUrl,
          },
          orders: mergedOrders,
          teamRoles: snapshot.teamRoles,
          teamMembers: snapshot.teamMembers,
          teamSession: snapshot.teamMemberId,
          role:
            snapshot.teamMembers.find((m) => m.id === snapshot.teamMemberId)
              ?.roleId === "admin"
              ? "admin"
              : "producer",
          clients: snapshot.clients,
          customQuotes:
            snapshot.customQuotes.length > 0
              ? snapshot.customQuotes
              : !hideSampleData
                ? current.customQuotes.length > 0
                  ? current.customQuotes
                  : defaultDemoQuotes
                : [],
          notifications:
            snapshot.notifications.length > 0
              ? snapshot.notifications
              : !hideSampleData
                ? current.notifications.length > 0
                  ? current.notifications
                  : defaultDemoNotifications
                : [],
          unread:
            snapshot.notifications.length > 0
              ? snapshot.unread
              : !hideSampleData &&
                (current.notifications.length > 0
                  ? current.notifications.some((item) => !item.isRead)
                  : defaultDemoNotifications.some((item) => !item.isRead)),
        }
      })
    } catch {
      // Ignore transient sync errors; user can retry or refresh
    }
  }, [])

  const refreshFromSupabase = useCallback(async () => {
    await loadSnapshotForUser(authUserRef.current)
  }, [loadSnapshotForUser])

  useEffect(() => {
    if (!supabaseConfigured) return
    const sb = getSupabaseClient()
    if (!sb) return

    let active = true

    void fetchPublicCatalog(sb)
      .then((catalog) => {
        if (!active) return
        setData((current) => ({
          ...current,
          plans: catalog.plans.length > 0 ? catalog.plans : current.plans,
          addons: catalog.addons.length > 0 ? catalog.addons : current.addons,
        }))
      })
      .catch(() => undefined)

    void sb.auth.getSession().then(async ({ data: sessionData }) => {
      if (!active) return
      const user = sessionData.session?.user
      const mapped = user ? mapSupabaseUser(user) : null
      authUserRef.current = mapped
      setAuthUser(mapped)
      if (mapped) {
        await loadSnapshotForUser(mapped)
      }
      if (active) setAuthLoading(false)
    })

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      const mapped = user ? mapSupabaseUser(user) : null
      authUserRef.current = mapped
      setAuthUser(mapped)
      void loadSnapshotForUser(mapped)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadSnapshotForUser])

  useEffect(() => {
    if (!supabaseConfigured || !authUser || authUser.isDemo) return
    const sb = getSupabaseClient()
    if (!sb) return
    let timer: number | undefined
    const unsubscribe = subscribeWorkspaceRealtime(sb, () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void loadSnapshotForUser(authUserRef.current)
      }, 220)
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [authUser, loadSnapshotForUser])

  function updateOrder(id: string, fn: (value: Order) => Order) {
    setData((current) => ({
      ...current,
      orders: current.orders.map((value) =>
        value.id === id ? fn(value) : value
      ),
    }))
  }

  function createOrder(
    plan: Plan,
    total: number,
    method: string,
    options?: {
      paymentSession?: string
      projectName?: string
      addonIds?: string[]
      customQuoteId?: string
      receiptUrl?: string
    }
  ) {
    const paymentSession = options?.paymentSession
    const cleanProject = options?.projectName?.trim()
    const existing =
      paymentSession &&
      dataRef.current.orders.find(
        (value) => value.paymentSession === paymentSession
      )
    if (existing) return existing.id

    const now = new Date()
    const date = now.toISOString().slice(0, 10).replaceAll("-", "")
    const shortDate = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const suffix = paymentSession?.slice(-12) ?? crypto.randomUUID().slice(0, 4)
    const id = `NGA-${date}-${suffix.toUpperCase()}`
    const titleZh = cleanProject || `${plan.zh} · ${shortDate}`
    const titleEn = cleanProject || `${plan.en} · ${shortDate}`

    const live = getLiveDbUser()
    const createdOrder: Order = {
      ...order(
        id,
        titleZh,
        titleEn,
        dataRef.current.account.name || authUserRef.current?.email || "Client",
        "waiting_assets",
        ""
      ),
      clientId: live?.user.id,
      plan: plan.id,
      count: plan.count,
      total,
      method,
      paymentSession,
      receiptUrl: options?.receiptUrl,
      ...(!live && supabaseConfigured ? { demo: true } : {}),
    }

    const orderNotif: NotificationItem = {
      id: "notif-" + crypto.randomUUID().slice(0, 8),
      orderId: id,
      eventType: "order_created",
      titleZh: "新订单已创建，请上传制作素材",
      titleEn: "Order created — upload materials to begin",
      bodyZh: `${titleZh} (#${id})`,
      bodyEn: `${titleEn} (#${id})`,
      isRead: false,
      createdAt: now.toISOString(),
    }

    setData((current) =>
      paymentSession &&
      current.orders.some((value) => value.paymentSession === paymentSession)
        ? current
        : {
            ...current,
            unread: true,
            notifications: [orderNotif, ...current.notifications].slice(0, 20),
            orders: [createdOrder, ...current.orders],
          }
    )

    if (live) {
      void createOrderInDb(
        live.sb,
        live.user.id,
        createdOrder,
        options?.addonIds ?? [],
        {
          customQuoteId: options?.customQuoteId,
          receiptUrl: options?.receiptUrl,
        }
      )
        .then(async () => {
          if (options?.customQuoteId) {
            await markCustomQuotePaidInDb(live.sb, options.customQuoteId).catch(
              () => undefined
            )
          }
          await insertNotificationInDb(live.sb, {
            recipientUserId: live.user.id,
            orderId: id,
            eventType: "order_created",
            titleZh: orderNotif.titleZh,
            titleEn: orderNotif.titleEn,
            bodyZh: orderNotif.bodyZh,
            bodyEn: orderNotif.bodyEn,
          }).catch(() => undefined)
          await loadSnapshotForUser(live.user)
        })
        .catch(() => undefined)
    }

    return id
  }

  async function loadCustomQuote(
    quoteId: string
  ): Promise<CustomQuoteRecord | null> {
    const sb = getSupabaseClient()
    if (!sb || !quoteId.trim()) return null
    try {
      return await fetchCustomQuoteInDb(sb, quoteId.trim())
    } catch {
      return null
    }
  }

  async function signInClient(
    email: string,
    password: string
  ): Promise<AuthResult> {
    const sb = getSupabaseClient()
    if (!sb) return { ok: true }
    const { data: res, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error || !res.user) {
      return { ok: false, reason: "invalid_credentials" }
    }
    const mapped = mapSupabaseUser(res.user, email.trim())
    authUserRef.current = mapped
    setAuthUser(mapped)
    await loadSnapshotForUser(mapped)
    return { ok: true }
  }

  async function signUpClient(
    name: string,
    email: string,
    password: string
  ): Promise<AuthResult> {
    const sb = getSupabaseClient()
    if (!sb) return { ok: true }
    const { data: res, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
      },
    })
    if (error) {
      return { ok: false, reason: error.message }
    }
    if (res.session && res.user) {
      const mapped = mapSupabaseUser(res.user, email.trim())
      authUserRef.current = mapped
      setAuthUser(mapped)
      await loadSnapshotForUser(mapped)
      return { ok: true }
    }
    return { ok: false, reason: "confirm_email_required" }
  }

  async function signInWithGoogle(redirectTo: string): Promise<AuthResult> {
    const sb = getSupabaseClient()
    if (!sb) return { ok: false, reason: "not_configured" }
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (error) return { ok: false, reason: "oauth_unavailable" }
    return { ok: true }
  }

  async function sendPasswordReset(
    email: string,
    redirectTo: string
  ): Promise<AuthResult> {
    const sb = getSupabaseClient()
    if (!sb) return { ok: true }
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })
    if (error) return { ok: false, reason: "reset_failed" }
    return { ok: true }
  }

  async function signInTeamWithPassword(
    email: string,
    password: string
  ): Promise<AuthResult> {
    const sb = getSupabaseClient()
    if (!sb) return { ok: false, reason: "not_configured" }
    const { data: res, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error || !res.user) {
      return { ok: false, reason: "invalid_credentials" }
    }

    const { data: memberRows } = await sb
      .from("team_members")
      .select("id, active")
      .eq("user_id", res.user.id)

    const member = memberRows?.[0]
    if (!member) {
      await sb.auth.signOut()
      return { ok: false, reason: "not_team_member" }
    }
    if (!member.active) {
      await sb.auth.signOut()
      return { ok: false, reason: "account_disabled" }
    }

    const mapped = mapSupabaseUser(res.user, email.trim())
    authUserRef.current = mapped
    setAuthUser(mapped)
    await loadSnapshotForUser(mapped)
    return { ok: true }
  }

  function signInDemoClient(email?: string, name?: string) {
    const resolvedEmail = email?.trim() || demoClientEmail
    const resolvedName = name?.trim() || initialDemo.account.name
    const demoUser: AuthUser = {
      id: "demo-client",
      email: resolvedEmail,
      fullName: resolvedName,
      isDemo: true,
    }
    authUserRef.current = demoUser
    setAuthUser(demoUser)
    setData((current) => ({
      ...current,
      account: {
        name: resolvedName,
        email: resolvedEmail,
        company: initialDemo.account.company,
      },
      orders: buildDemoOrdersForAccount(resolvedName, false),
      notifications: defaultDemoNotifications,
      unread: true,
    }))
  }

  function signInDemoTeam(memberId: string) {
    const pool =
      dataRef.current.teamMembers.length > 0
        ? dataRef.current.teamMembers
        : defaultTeamMembers
    const target = pool.find((item) => item.id === memberId && item.active)
    if (!target) return false
    setData((current) => {
      const members =
        current.teamMembers.length > 0
          ? current.teamMembers
          : defaultTeamMembers
      const accountName = current.account.name || initialDemo.account.name
      return {
        ...current,
        teamMembers: members,
        teamRoles:
          current.teamRoles.length > 0 ? current.teamRoles : defaultTeamRoles,
        teamSession: target.id,
        role: target.roleId === "admin" ? "admin" : "producer",
        orders:
          current.orders.length > 0
            ? current.orders
            : buildDemoOrdersForAccount(accountName, true),
        customQuotes:
          current.customQuotes.length > 0
            ? current.customQuotes
            : defaultDemoQuotes,
        unread: true,
      }
    })
    return true
  }

  async function signOutAll() {
    const sb = getSupabaseClient()
    const isRealUser = Boolean(authUserRef.current && !authUserRef.current.isDemo)
    if (sb && isRealUser) {
      await sb.auth.signOut()
    }
    authUserRef.current = null
    setAuthUser(null)
    setData((current) =>
      supabaseConfigured
        ? { ...initialLive, plans: current.plans, addons: current.addons }
        : { ...current, teamSession: null }
    )
  }

  async function saveCatalog(plans: Plan[], addons: Addon[]) {
    setData((current) => ({ ...current, plans, addons }))
    const live = getLiveDbUser()
    if (!live) return true
    try {
      await saveCatalogToDb(live.sb, plans, addons)
      return true
    } catch {
      await loadCatalog()
      return false
    }
  }

  async function saveAccountProfile(profile: {
    name: string
    email: string
    company: string
  }) {
    setData((current) => ({
      ...current,
      account: {
        ...profile,
        avatarUrl: current.account.avatarUrl,
      },
      orders: current.orders.map((value) =>
        value.client === current.account.name
          ? { ...value, client: profile.name }
          : value
      ),
    }))
    const live = getLiveDbUser()
    if (!live) return true
    try {
      await saveProfileInDb(live.sb, live.user.id, {
        name: profile.name,
        company: profile.company,
      })
      return true
    } catch {
      return false
    }
  }

  async function renameOrder(orderId: string, title: string) {
    const demoOnly = isDemoOrder(orderId)
    updateOrder(orderId, (value) => ({ ...value, zh: title, en: title }))
    const live = getLiveDbUser()
    if (!live || demoOnly) return true
    try {
      await updateOrderInDb(live.sb, orderId, {
        title_zh: title,
        title_en: title,
      })
      return true
    } catch {
      await refreshFromSupabase()
      return false
    }
  }

  async function assignOrderOwner(orderId: string, ownerName: string) {
    const demoOnly = isDemoOrder(orderId)
    const nextOwner = ownerName === "unassigned" ? "" : ownerName
    updateOrder(orderId, (value) => ({ ...value, owner: nextOwner }))
    const live = getLiveDbUser()
    if (!live || demoOnly) return true
    const matchedMember = dataRef.current.teamMembers.find(
      (m) => m.name === nextOwner
    )
    try {
      await updateOrderInDb(live.sb, orderId, {
        assigned_member_id: matchedMember?.id ?? null,
      })
      if (matchedMember?.userId && matchedMember.userId !== live.user.id) {
        const targetOrder = dataRef.current.orders.find((o) => o.id === orderId)
        await insertNotificationInDb(live.sb, {
          recipientUserId: matchedMember.userId,
          orderId,
          eventType: "order_assigned",
          titleZh: "你收到一个新的制作任务指派",
          titleEn: "New production order assigned to you",
          bodyZh: `${targetOrder?.zh ?? orderId} (#${orderId})`,
          bodyEn: `${targetOrder?.en ?? orderId} (#${orderId})`,
        }).catch(() => undefined)
      }
      return true
    } catch {
      await refreshFromSupabase()
      return false
    }
  }

  async function startOrderProduction(orderId: string, messageText: string) {
    const demoOnly = isDemoOrder(orderId)
    const targetOrder = dataRef.current.orders.find((o) => o.id === orderId)
    updateOrder(orderId, (value) =>
      appendEntry({ ...value, status: "producing" }, "studio", messageText)
    )
    const live = getLiveDbUser()
    if (!live || demoOnly) return true
    try {
      await updateOrderInDb(live.sb, orderId, { status: "producing" })
      await insertMessageInDb(
        live.sb,
        orderId,
        live.user.id,
        "studio",
        messageText
      )
      if (targetOrder?.clientId && targetOrder.clientId !== live.user.id) {
        await insertNotificationInDb(live.sb, {
          recipientUserId: targetOrder.clientId,
          orderId,
          eventType: "production_started",
          titleZh: "制作团队已确认素材并开始制作",
          titleEn: "Production has started on your order",
          bodyZh: `${targetOrder.zh} (#${orderId})`,
          bodyEn: `${targetOrder.en} (#${orderId})`,
        }).catch(() => undefined)
      }
      return true
    } catch {
      await refreshFromSupabase()
      return false
    }
  }

  async function sendChatMessage(
    orderId: string,
    side: Entry["side"],
    text: string,
    attachments?: ChatAttachment[]
  ) {
    const target = dataRef.current.orders.find((o) => o.id === orderId)
    const demoOnly = Boolean(target?.demo)
    const shouldAdvance = Boolean(
      side === "client" &&
      attachments?.length &&
      target?.status === "waiting_assets"
    )
    updateOrder(orderId, (current) =>
      appendEntry(
        shouldAdvance ? { ...current, status: "producing" } : current,
        side,
        text,
        attachments
      )
    )
    const live = getLiveDbUser()
    if (!live || demoOnly) return true
    try {
      await insertMessageInDb(
        live.sb,
        orderId,
        live.user.id,
        side,
        text,
        undefined,
        attachments
      )
      if (shouldAdvance) {
        await updateOrderInDb(live.sb, orderId, { status: "producing" })
      }
      return true
    } catch {
      await refreshFromSupabase()
      return false
    }
  }

  async function publishOrderVersion(
    orderId: string,
    version: Version,
    messageText: string
  ) {
    const demoOnly = isDemoOrder(orderId)
    const nextStatus: Status =
      version.type === "final" ? "completed" : "waiting_confirm"
    const versionRef: EntryVersionRef = {
      id: version.id,
      type: version.type,
      note: version.note || undefined,
    }
    updateOrder(orderId, (value) =>
      appendEntry(
        {
          ...value,
          status: nextStatus,
          versions: [...value.versions, version],
          revision: undefined,
        },
        "studio",
        messageText,
        undefined,
        versionRef
      )
    )
    setData((state) => ({ ...state, unread: true }))

    const targetOrder = dataRef.current.orders.find((o) => o.id === orderId)
    const live = getLiveDbUser()
    if (!live || demoOnly) return true
    try {
      await insertVersionInDb(live.sb, orderId, live.user.id, version)
      await updateOrderInDb(live.sb, orderId, {
        status: nextStatus,
        latest_revision_note: null,
        ...(version.type === "final" ? { video_credits_used: 1 } : {}),
      })
      await insertMessageInDb(
        live.sb,
        orderId,
        live.user.id,
        "studio",
        messageText,
        versionRef
      )
      if (targetOrder?.clientId && targetOrder.clientId !== live.user.id) {
        await insertNotificationInDb(live.sb, {
          recipientUserId: targetOrder.clientId,
          orderId,
          eventType:
            version.type === "final" ? "final_delivered" : "draft_ready",
          titleZh:
            version.type === "final"
              ? "正式无水印成片已交付"
              : `预览版 ${version.id} 已上传，等待审片`,
          titleEn:
            version.type === "final"
              ? "Your final video has been delivered"
              : `Preview ${version.id} is ready for review`,
          bodyZh: `${targetOrder.zh} (#${orderId})`,
          bodyEn: `${targetOrder.en} (#${orderId})`,
        }).catch(() => undefined)
      }
      return true
    } catch {
      await refreshFromSupabase()
      return false
    }
  }

  async function submitOrderReview(
    orderId: string,
    action: "approve" | "revision",
    messageText: string,
    revisionNote?: string
  ) {
    const demoOnly = isDemoOrder(orderId)
    const nextStatus: Status = action === "approve" ? "approved" : "revision"
    updateOrder(orderId, (value) =>
      appendEntry(
        {
          ...value,
          status: nextStatus,
          revision: action === "revision" ? revisionNote : undefined,
        },
        "client",
        messageText
      )
    )
    if (action === "approve") {
      setData((state) => ({ ...state, unread: true }))
    }

    const live = getLiveDbUser()
    if (!live || demoOnly) return true
    try {
      await updateOrderInDb(live.sb, orderId, {
        status: nextStatus,
        latest_revision_note:
          action === "revision" ? (revisionNote ?? null) : null,
      })
      await insertMessageInDb(
        live.sb,
        orderId,
        live.user.id,
        "client",
        messageText
      )
      return true
    } catch {
      await refreshFromSupabase()
      return false
    }
  }

  async function saveCustomQuote(quote: {
    id: string
    clientEmail: string
    projectName: string
    videoCount: number
    amountDollars: number
  }) {
    const localRecord: CustomQuoteRecord = {
      id: quote.id,
      clientEmail: quote.clientEmail.includes("@")
        ? quote.clientEmail
        : undefined,
      projectName: quote.projectName || quote.id,
      videoCount: quote.videoCount,
      amountDollars: quote.amountDollars,
      status: "open",
      createdAt: new Date().toISOString(),
    }
    setData((current) => ({
      ...current,
      customQuotes: [
        localRecord,
        ...current.customQuotes.filter((item) => item.id !== quote.id),
      ],
    }))
    const live = getLiveDbUser()
    if (!live) return true
    try {
      await saveCustomQuoteInDb(live.sb, live.user.id, quote)
      return true
    } catch {
      return false
    }
  }

  async function toggleTeamRolePermission(
    roleId: TeamRoleId,
    permission: PermissionKey
  ) {
    const targetRole = dataRef.current.teamRoles.find((r) => r.id === roleId)
    if (!targetRole || targetRole.locked) return false
    const has = targetRole.permissions.includes(permission)
    const nextPermissions = has
      ? targetRole.permissions.filter((item) => item !== permission)
      : [...targetRole.permissions, permission]

    setData((current) => ({
      ...current,
      teamRoles: current.teamRoles.map((role) =>
        role.id === roleId ? { ...role, permissions: nextPermissions } : role
      ),
    }))

    const live = getLiveDbUser()
    if (!live) return true
    try {
      await syncRolePermissionsInDb(live.sb, roleId, nextPermissions)
      return true
    } catch {
      await refreshFromSupabase()
      return false
    }
  }

  async function resetTeamRolePermissions() {
    setData((current) => ({ ...current, teamRoles: defaultTeamRoles }))
    const live = getLiveDbUser()
    if (!live) return true
    try {
      for (const role of defaultTeamRoles) {
        if (!role.locked) {
          await syncRolePermissionsInDb(live.sb, role.id, role.permissions)
        }
      }
      return true
    } catch {
      await refreshFromSupabase()
      return false
    }
  }

  async function addTeamMember(member: {
    name: string
    email: string
    roleId: TeamRoleId
  }) {
    const live = getLiveDbUser()
    if (!live) {
      setData((current) => ({
        ...current,
        teamMembers: [
          ...current.teamMembers,
          {
            id: "member-" + crypto.randomUUID().slice(0, 8),
            name: member.name,
            email: member.email,
            roleId: member.roleId,
            active: true,
          },
        ],
      }))
      return true
    }
    try {
      const inserted = await addTeamMemberInDb(live.sb, member)
      setData((current) => ({
        ...current,
        teamMembers: [
          ...current.teamMembers,
          {
            id: inserted.id,
            name: inserted.name,
            email: inserted.email,
            roleId: inserted.role_id as TeamRoleId,
            active: inserted.active,
          },
        ],
      }))
      return true
    } catch {
      return false
    }
  }

  async function updateTeamMember(
    memberId: string,
    patch: { roleId?: TeamRoleId; active?: boolean }
  ) {
    setData((current) => ({
      ...current,
      teamMembers: current.teamMembers.map((item) =>
        item.id === memberId ? { ...item, ...patch } : item
      ),
    }))
    const live = getLiveDbUser()
    if (!live) return true
    try {
      await updateTeamMemberInDb(live.sb, memberId, {
        ...(patch.roleId !== undefined ? { role_id: patch.roleId } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
      })
      return true
    } catch {
      await refreshFromSupabase()
      return false
    }
  }

  async function markNotificationRead(notificationId: string) {
    setData((current) => {
      const next = current.notifications.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item
      )
      return {
        ...current,
        notifications: next,
        unread: next.some((item) => !item.isRead),
      }
    })
    if (notificationId.startsWith("demo-") || notificationId.startsWith("notif-"))
      return
    const live = getLiveDbUser()
    if (!live) return
    try {
      await markNotificationReadInDb(live.sb, live.user.id, notificationId)
    } catch {
      // Ignore
    }
  }

  async function markAllNotificationsRead() {
    setData((current) => ({
      ...current,
      unread: false,
      notifications: current.notifications.map((item) => ({
        ...item,
        isRead: true,
      })),
    }))
    const live = getLiveDbUser()
    if (!live) return
    try {
      await markNotificationsReadInDb(live.sb, live.user.id)
    } catch {
      // Ignore
    }
  }

  return (
    <DemoContext.Provider
      value={{
        isLiveSupabase: supabaseConfigured,
        authLoading,
        authUser,
        data,
        update: setData,
        updateOrder,
        createOrder,
        refreshFromSupabase,
        loadCustomQuote,
        signInClient,
        signUpClient,
        signInWithGoogle,
        sendPasswordReset,
        signInTeamWithPassword,
        signInDemoClient,
        signInDemoTeam,
        signOutAll,
        saveCatalog,
        saveAccountProfile,
        renameOrder,
        assignOrderOwner,
        startOrderProduction,
        sendChatMessage,
        publishOrderVersion,
        submitOrderReview,
        saveCustomQuote,
        toggleTeamRolePermission,
        resetTeamRolePermissions,
        addTeamMember,
        updateTeamMember,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const demo = useContext(DemoContext)
  if (!demo) throw new Error("DemoProvider is missing")
  return demo
}

export function useTeamAuth() {
  const {
    data,
    update,
    isLiveSupabase,
    authLoading,
    signInTeamWithPassword,
    signInDemoTeam,
    signOutAll,
  } = useDemo()
  const member = data.teamSession
    ? data.teamMembers.find(
        (item) => item.id === data.teamSession && item.active
      )
    : undefined
  const roleConfig = member
    ? getRoleConfig(data.teamRoles, member.roleId)
    : undefined

  function can(permission: PermissionKey) {
    return hasPermission(member, data.teamRoles, permission)
  }

  function signInTeam(memberId: string) {
    if (isLiveSupabase) {
      return signInDemoTeam(memberId)
    }
    const target = data.teamMembers.find(
      (item) => item.id === memberId && item.active
    )
    if (!target) return false
    update((current) => ({
      ...current,
      teamSession: target.id,
      role: target.roleId === "admin" ? "admin" : "producer",
    }))
    return true
  }

  function signOutTeam() {
    if (isLiveSupabase) {
      void signOutAll()
      return
    }
    update((current) => ({
      ...current,
      teamSession: null,
    }))
  }

  return {
    member,
    roleConfig,
    isAuthenticated: Boolean(member),
    isLiveSupabase,
    authLoading,
    can,
    signInTeam,
    signInTeamWithPassword,
    signOutTeam,
  }
}

export function usePortal() {
  const { locale: parameter } = useParams()
  const locale = isLocale(parameter) ? parameter : "en"
  const zh = locale === "zh"
  const { t: translate } = useTranslation(undefined, { lng: locale })
  return {
    locale,
    zh,
    translate,
    t: (chinese: string, english: string) => (zh ? chinese : english),
    href: (page = "", params?: Record<string, string>) => {
      const query = params ? new URLSearchParams(params).toString() : ""
      return `/${locale}${page ? `/${page}` : ""}${query ? `?${query}` : ""}`
    },
  }
}

export function appendEntry(
  value: Order,
  side: Entry["side"],
  text: string,
  attachments?: ChatAttachment[],
  versionRef?: EntryVersionRef
) {
  return {
    ...value,
    entries: [
      ...value.entries,
      { id: crypto.randomUUID(), side, text, attachments, versionRef },
    ],
  }
}

export function entryAttachments(entry: Entry): ChatAttachment[] {
  if (entry.attachments) return entry.attachments
  if (entry.fileId && entry.attachment) {
    return [{ fileId: entry.fileId, name: entry.attachment }]
  }
  return []
}

export function formatDollars(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)
}

export const coverImage = "/portal-media/review.jpg"
export const clientImage = "/portal-media/client.jpg"
export const studioImage = "/portal-media/studio.jpg"
export const sampleVideo =
  "/marketing/assets/media/6a985fcdcf28d63365089e91.mp4"
export const sampleMaterials = [
  { src: clientImage, zh: "Sarah_正面照.jpg", en: "Sarah_Headshot.jpg" },
  {
    src: "/portal-media/voice-sample.wav",
    zh: "干声样本_48kHz.wav",
    en: "Voice_Sample_48kHz.wav",
  },
  {
    src: "/portal-media/sample-script.txt",
    zh: "Q4_新品口播台词.txt",
    en: "Q4_Presenter_Script.txt",
  },
]
