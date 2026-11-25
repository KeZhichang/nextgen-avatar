import type { SupabaseClient } from "@supabase/supabase-js"

import { defaultPlans, type Addon, type Plan } from "./checkout-catalog"
import type { Database, OrderStatus, PaymentMethodType } from "./database.types"
import type {
  ChatAttachment,
  Entry,
  EntryVersionRef,
  Order,
  Status,
  Version,
} from "./demo"
import {
  defaultTeamRoles,
  type PermissionKey,
  type TeamMember,
  type TeamRoleConfig,
  type TeamRoleId,
} from "./rbac"

export type SbClient = SupabaseClient<Database>

export type ClientDirectoryEntry = {
  id: string
  name: string
  email: string
  company: string
  avatarUrl?: string
}

export type NotificationItem = {
  id: string
  orderId?: string
  eventType: string
  titleZh: string
  titleEn: string
  bodyZh: string
  bodyEn: string
  isRead: boolean
  createdAt: string
}

export type CustomQuoteRecord = {
  id: string
  clientEmail?: string
  projectName: string
  videoCount: number
  amountDollars: number
  status: "open" | "paid" | "expired" | "cancelled"
  createdAt?: string
}

export type SupabaseSnapshot = {
  account: {
    id: string
    name: string
    email: string
    company: string
    avatarUrl?: string
  }
  teamMemberId: string | null
  teamRoles: TeamRoleConfig[]
  teamMembers: TeamMember[]
  orders: Order[]
  clients: ClientDirectoryEntry[]
  customQuotes: CustomQuoteRecord[]
  notifications: NotificationItem[]
  unread: boolean
}

function centsToDollars(cents: number | null | undefined): number {
  if (!cents || !Number.isFinite(cents)) return 0
  return Math.round(cents) / 100
}

function dollarsToCents(dollars: number): number {
  return Math.max(0, Math.round(dollars * 100))
}

export type MessageSenderMeta = {
  name: string
  roleId?: TeamRoleId
}

function parseSenderMeta(metadata: unknown): MessageSenderMeta | undefined {
  if (!metadata || typeof metadata !== "object") return undefined
  const raw = (metadata as Record<string, unknown>).sender
  if (!raw || typeof raw !== "object") return undefined
  const record = raw as Record<string, unknown>
  const name = typeof record.name === "string" ? record.name.trim() : ""
  if (!name) return undefined
  const roleId =
    record.roleId === "admin" ||
    record.roleId === "lead" ||
    record.roleId === "producer"
      ? record.roleId
      : undefined
  return { name, roleId }
}

function parseVersionRef(metadata: unknown): EntryVersionRef | undefined {
  if (!metadata || typeof metadata !== "object") return undefined
  const ref = (metadata as Record<string, unknown>).versionRef
  if (!ref || typeof ref !== "object") return undefined
  const record = ref as Record<string, unknown>
  const id = typeof record.id === "string" ? record.id : ""
  const type =
    record.type === "final"
      ? "final"
      : record.type === "preview"
        ? "preview"
        : null
  if (!id || !type) return undefined
  return {
    id,
    type,
    note: typeof record.note === "string" ? record.note : undefined,
    itemIndex:
      typeof record.itemIndex === "number" && record.itemIndex >= 1
        ? record.itemIndex
        : undefined,
  }
}

export async function fetchPublicCatalog(sb: SbClient): Promise<{
  plans: Plan[]
  addons: Addon[]
}> {
  const [
    { data: planRows, error: planErr },
    { data: addonRows, error: addonErr },
  ] = await Promise.all([
    sb.from("plans").select("*").order("sort_order", { ascending: true }),
    sb.from("addons").select("*").order("sort_order", { ascending: true }),
  ])

  if (planErr) throw planErr
  if (addonErr) throw addonErr

  const plans: Plan[] = (planRows ?? []).map((row) => {
    const preset = defaultPlans.find((item) => item.id === row.id)
    return {
      id: row.id,
      zh: row.name_zh,
      en: row.name_en,
      tagZh: row.tag_zh || "",
      tagEn: row.tag_en || "",
      count: row.video_count,
      price: centsToDollars(row.price_cents),
      regular: row.original_price_cents
        ? centsToDollars(row.original_price_cents)
        : undefined,
      renewal:
        typeof row.renewal_price_cents === "number" &&
        row.renewal_price_cents > 0
          ? centsToDollars(row.renewal_price_cents)
          : preset?.renewal,
      active: row.is_published,
    }
  })

  const addons: Addon[] = (addonRows ?? []).map((row) => ({
    id: row.id,
    zh: row.name_zh,
    en: row.name_en,
    price: centsToDollars(row.price_cents),
    active: row.is_active,
  }))

  return { plans, addons }
}

export async function fetchAuthenticatedSnapshot(
  sb: SbClient,
  userId: string,
  fallbackEmail: string,
  authMeta?: { fullName?: string; avatarUrl?: string }
): Promise<SupabaseSnapshot> {
  // Round 1 (parallel): profile, own team row, notifications, and direct orders
  const [
    { data: profile },
    { data: selfMemberRows },
    { data: notificationRows },
    { data: directOrderRows },
  ] = await Promise.all([
    sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sb
      .from("team_members")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true),
    sb
      .from("notifications")
      .select("*")
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    sb.from("orders").select("*").order("created_at", { ascending: false }),
  ])

  const selfMember = selfMemberRows?.[0] ?? null
  const isTeam = Boolean(selfMember)
  const resolvedEmail = profile?.email || fallbackEmail
  const emailPrefix = resolvedEmail.split("@")[0] || ""
  const dbName = profile?.full_name?.trim() || ""
  const metaName = authMeta?.fullName?.trim() || ""
  const metaAvatar = authMeta?.avatarUrl?.trim() || ""
  const dbAvatar = profile?.avatar_url?.trim() || ""

  const shouldSyncName = Boolean(metaName && (!dbName || dbName === emailPrefix))
  const shouldSyncAvatar = Boolean(metaAvatar && !dbAvatar)

  if (profile && (shouldSyncName || shouldSyncAvatar)) {
    const patch: Database["public"]["Tables"]["profiles"]["Update"] = {}
    if (shouldSyncName) patch.full_name = metaName
    if (shouldSyncAvatar) patch.avatar_url = metaAvatar
    void sb
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .then(() => undefined)
  }

  const account = {
    id: userId,
    name:
      (shouldSyncName ? metaName : dbName) ||
      metaName ||
      selfMember?.name ||
      emailPrefix ||
      "User",
    email: resolvedEmail,
    company: profile?.company || "",
    avatarUrl: dbAvatar || metaAvatar || undefined,
  }

  // Round 2 (parallel): team metadata + quotes + clients (if team) AND child rows for already-loaded orders
  const directOrderIds = (directOrderRows ?? []).map((o) => o.id)

  const [
    teamBundle,
    directChildrenBundle,
  ] = await Promise.all([
    isTeam && selfMember
      ? Promise.all([
          sb.from("team_roles").select("*"),
          sb.from("role_permissions").select("*"),
          sb
            .from("team_members")
            .select("*")
            .order("created_at", { ascending: true }),
          sb
            .from("profiles")
            .select("id, full_name, email, company, avatar_url")
            .order("created_at", { ascending: false }),
          sb
            .from("custom_quotes")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20),
        ])
      : Promise.resolve(null),
    directOrderIds.length > 0
      ? Promise.all([
          sb
            .from("order_messages")
            .select("*")
            .in("order_id", directOrderIds)
            .order("created_at", { ascending: true }),
          sb
            .from("order_attachments")
            .select("*")
            .in("order_id", directOrderIds)
            .eq("status", "ready")
            .order("created_at", { ascending: true }),
          sb
            .from("video_versions")
            .select("*")
            .in("order_id", directOrderIds)
            .order("created_at", { ascending: true }),
        ])
      : Promise.resolve(null),
  ])

  let teamRoles: TeamRoleConfig[] = defaultTeamRoles
  let teamMembers: TeamMember[] = []
  let canViewAllOrders = false
  let clients: ClientDirectoryEntry[] = []
  let customQuotes: CustomQuoteRecord[] = []
  const clientNameById = new Map<string, string>([[userId, account.name]])

  if (isTeam && selfMember && teamBundle) {
    const [
      { data: rolesRows },
      { data: permRows },
      { data: memberRows },
      { data: profileRows },
      { data: quoteRows },
    ] = teamBundle

    if (rolesRows && rolesRows.length > 0) {
      teamRoles = rolesRows.map((role) => ({
        id: role.id as TeamRoleId,
        zh: role.name_zh,
        en: role.name_en,
        descriptionZh: role.description_zh,
        descriptionEn: role.description_en,
        locked: role.locked,
        permissions: (permRows ?? [])
          .filter((perm) => perm.role_id === role.id)
          .map((perm) => perm.permission_key as PermissionKey),
      }))
    }

    if (memberRows && memberRows.length > 0) {
      teamMembers = memberRows.map((item) => ({
        id: item.id,
        userId: item.user_id ?? undefined,
        name: item.name,
        email: item.email,
        roleId: item.role_id as TeamRoleId,
        active: item.active,
      }))
    } else {
      teamMembers = [
        {
          id: selfMember.id,
          userId: selfMember.user_id ?? undefined,
          name: selfMember.name,
          email: selfMember.email,
          roleId: selfMember.role_id as TeamRoleId,
          active: selfMember.active,
        },
      ]
    }

    const myRole = teamRoles.find((r) => r.id === selfMember.role_id)
    canViewAllOrders = Boolean(
      myRole?.locked || myRole?.permissions.includes("orders:view_all")
    )
    const canViewClients = Boolean(
      myRole?.locked || myRole?.permissions.includes("settings:clients")
    )
    const canViewQuotes = Boolean(
      myRole?.locked || myRole?.permissions.includes("settings:quotes")
    )

    if ((canViewClients || canViewAllOrders) && profileRows) {
      clients = profileRows.map((p) => ({
        id: p.id,
        name: p.full_name || p.email.split("@")[0] || "Client",
        email: p.email,
        company: p.company || "",
        avatarUrl: p.avatar_url ?? undefined,
      }))
      for (const c of clients) {
        clientNameById.set(c.id, c.name)
      }
    }

    if (canViewQuotes && quoteRows) {
      customQuotes = quoteRows.map((row) => ({
        id: row.id,
        clientEmail: row.client_email ?? undefined,
        projectName: row.project_name,
        videoCount: row.video_count,
        amountDollars: centsToDollars(row.amount_cents),
        status: row.status,
        createdAt: row.created_at,
      }))
    }
  }

  const memberNameById = new Map<string, string>(
    teamMembers.map((m) => [m.id, m.name])
  )

  // Assemble accessible orders (privacy-preserving view for subcontractors)
  const rawOrders: Order[] = []
  let childrenBundle = directChildrenBundle

  if (isTeam && !canViewAllOrders) {
    const { data: viewRows } = await sb
      .from("producer_orders_view")
      .select("*")
      .order("created_at", { ascending: false })
    for (const row of viewRows ?? []) {
      rawOrders.push({
        id: row.id,
        zh: row.title_zh,
        en: row.title_en,
        client: row.client_first_name || "Client",
        status: row.status as Status,
        plan: "presenter-5",
        count: row.video_credits_total,
        total: 0,
        method: "card",
        owner: row.assigned_member_id
          ? (memberNameById.get(row.assigned_member_id) ??
            selfMember?.name ??
            "")
          : "",
        entries: [],
        versions: [],
        revision: row.latest_revision_note ?? undefined,
      })
    }
    const producerOrderIds = rawOrders.map((o) => o.id)
    childrenBundle =
      producerOrderIds.length > 0
        ? await Promise.all([
            sb
              .from("order_messages")
              .select("*")
              .in("order_id", producerOrderIds)
              .order("created_at", { ascending: true }),
            sb
              .from("order_attachments")
              .select("*")
              .in("order_id", producerOrderIds)
              .eq("status", "ready")
              .order("created_at", { ascending: true }),
            sb
              .from("video_versions")
              .select("*")
              .in("order_id", producerOrderIds)
              .order("created_at", { ascending: true }),
          ])
        : null
  } else {
    for (const row of directOrderRows ?? []) {
      rawOrders.push({
        id: row.id,
        zh: row.title_zh,
        en: row.title_en,
        client: clientNameById.get(row.client_id) ?? account.name,
        clientId: row.client_id,
        status: row.status as Status,
        plan: row.plan_id ?? (row.custom_quote_id ? "quote" : "presenter-5"),
        count: row.video_credits_total,
        total: centsToDollars(row.amount_cents),
        method: row.payment_method,
        paymentSession: row.stripe_checkout_session_id ?? undefined,
        receiptUrl: row.receipt_url ?? undefined,
        owner: row.assigned_member_id
          ? (memberNameById.get(row.assigned_member_id) ?? "")
          : "",
        entries: [],
        versions: [],
        revision: row.latest_revision_note ?? undefined,
      })
    }
  }

  // Merge messages, attachments & versions into orders
  if (rawOrders.length > 0 && childrenBundle) {
    const [{ data: msgRows }, { data: attRows }, { data: verRows }] =
      childrenBundle

    const attachmentsByMsg = new Map<string, ChatAttachment[]>()
    for (const a of attRows ?? []) {
      if (!a.message_id) continue
      const list = attachmentsByMsg.get(a.message_id) ?? []
      list.push({
        fileId: a.r2_key.startsWith("local:") ? a.r2_key.slice(6) : a.r2_key,
        name: a.file_name,
        type: a.mime_type || undefined,
        size: a.size_bytes || undefined,
      })
      attachmentsByMsg.set(a.message_id, list)
    }

    const teamMemberByUserId = new Map<string, TeamMember>()
    for (const member of teamMembers) {
      if (member.userId) teamMemberByUserId.set(member.userId, member)
    }

    const messagesByOrder = new Map<string, Entry[]>()
    for (const m of msgRows ?? []) {
      const list = messagesByOrder.get(m.order_id) ?? []
      const atts = attachmentsByMsg.get(m.id)
      const matchedMember = teamMemberByUserId.get(m.sender_user_id)
      const metaSender = parseSenderMeta(m.metadata)
      list.push({
        id: m.id,
        side: m.sender_side,
        text: m.body,
        attachments: atts?.length ? atts : undefined,
        versionRef: parseVersionRef(m.metadata),
        senderUserId: m.sender_user_id,
        senderName:
          m.sender_side === "studio"
            ? (matchedMember?.name ?? metaSender?.name)
            : undefined,
        senderRoleId:
          m.sender_side === "studio"
            ? (matchedMember?.roleId ?? metaSender?.roleId)
            : undefined,
      })
      messagesByOrder.set(m.order_id, list)
    }

    const versionsByOrder = new Map<string, Version[]>()
    for (const v of verRows ?? []) {
      const list = versionsByOrder.get(v.order_id) ?? []
      const resolvedFileId =
        v.r2_key?.startsWith("sb:") || v.r2_key?.startsWith("r2:")
          ? v.r2_key
          : v.r2_key?.startsWith("local:")
            ? v.r2_key.slice(6)
            : undefined
      const itemIndex =
        typeof v.item_index === "number" && v.item_index >= 1
          ? v.item_index
          : 1
      list.push({
        id: itemIndex > 1 ? `#${itemIndex}-${v.version_code}` : v.version_code,
        code: v.version_code,
        itemIndex,
        itemTitle: v.item_title || undefined,
        type: v.version_type,
        note: v.notes,
        file: v.file_name || undefined,
        fileId: resolvedFileId,
      })
      versionsByOrder.set(v.order_id, list)
    }

    for (const o of rawOrders) {
      o.entries = messagesByOrder.get(o.id) ?? []
      o.versions = versionsByOrder.get(o.id) ?? []
    }
  }

  const notifications: NotificationItem[] = (notificationRows ?? []).map(
    (row) => ({
      id: row.id,
      orderId: row.order_id ?? undefined,
      eventType: row.event_type,
      titleZh: row.title_zh,
      titleEn: row.title_en,
      bodyZh: row.body_zh,
      bodyEn: row.body_en,
      isRead: row.is_read,
      createdAt: row.created_at,
    })
  )

  return {
    account,
    teamMemberId: selfMember?.id ?? null,
    teamRoles,
    teamMembers,
    orders: rawOrders,
    clients,
    customQuotes,
    notifications,
    unread: notifications.some((item) => !item.isRead),
  }
}

export async function saveCatalogToDb(
  sb: SbClient,
  plans: Plan[],
  addons: Addon[]
) {
  const { data: existingPlans } = await sb.from("plans").select("id")
  const keepPlanIds = new Set(plans.map((p) => p.id))
  const removePlanIds = (existingPlans ?? [])
    .map((p) => p.id)
    .filter((id) => !keepPlanIds.has(id))

  if (removePlanIds.length > 0) {
    const { error } = await sb.from("plans").delete().in("id", removePlanIds)
    if (error) throw error
  }

  const planPayload = plans.map((plan, idx) => ({
    id: plan.id,
    name_zh: plan.zh,
    name_en: plan.en,
    tag_zh: plan.tagZh ?? "",
    tag_en: plan.tagEn ?? "",
    video_count: plan.count,
    price_cents: dollarsToCents(plan.price),
    original_price_cents:
      plan.regular && plan.regular > plan.price
        ? dollarsToCents(plan.regular)
        : null,
    renewal_price_cents:
      plan.renewal && plan.renewal > 0 ? dollarsToCents(plan.renewal) : null,
    is_published: plan.active !== false,
    sort_order: idx + 1,
  }))
  if (planPayload.length > 0) {
    const { error } = await sb
      .from("plans")
      .upsert(planPayload, { onConflict: "id" })
    if (error) {
      // Fallback gracefully if DB hasn't applied renewal_price_cents column yet
      if (error.code === "42703" || error.code === "PGRST204") {
        const legacyPayload = planPayload.map((item) => {
          const rest = { ...item }
          delete (rest as { renewal_price_cents?: number | null })
            .renewal_price_cents
          return rest
        })
        const { error: fallbackErr } = await sb
          .from("plans")
          .upsert(legacyPayload, { onConflict: "id" })
        if (fallbackErr) throw fallbackErr
      } else {
        throw error
      }
    }
  }

  const { data: existingAddons } = await sb.from("addons").select("id")
  const keepAddonIds = new Set(addons.map((a) => a.id))
  const removeAddonIds = (existingAddons ?? [])
    .map((a) => a.id)
    .filter((id) => !keepAddonIds.has(id))

  if (removeAddonIds.length > 0) {
    const { error } = await sb.from("addons").delete().in("id", removeAddonIds)
    if (error) throw error
  }

  const addonPayload = addons.map((addon, idx) => ({
    id: addon.id,
    name_zh: addon.zh,
    name_en: addon.en,
    price_cents: dollarsToCents(addon.price),
    is_active: addon.active,
    sort_order: idx + 1,
  }))
  if (addonPayload.length > 0) {
    const { error } = await sb
      .from("addons")
      .upsert(addonPayload, { onConflict: "id" })
    if (error) throw error
  }
}

export async function createOrderInDb(
  sb: SbClient,
  userId: string,
  order: Order,
  addonIds: string[] = [],
  options?: { customQuoteId?: string; receiptUrl?: string }
): Promise<{ orderId: string; existed: boolean }> {
  if (order.paymentSession) {
    const { data: existing } = await sb
      .from("orders")
      .select("id")
      .eq("stripe_checkout_session_id", order.paymentSession)
      .maybeSingle()
    if (existing?.id) {
      return { orderId: existing.id, existed: true }
    }
  }

  const method: PaymentMethodType =
    order.method === "apple" || order.method === "ach" ? order.method : "card"
  const { error } = await sb.from("orders").insert({
    id: order.id,
    client_id: userId,
    title_zh: order.zh,
    title_en: order.en,
    status: order.status as OrderStatus,
    plan_id: order.plan === "quote" ? null : order.plan,
    custom_quote_id: options?.customQuoteId ?? null,
    addon_ids: addonIds,
    video_credits_total: order.count,
    video_credits_used: 0,
    amount_cents: dollarsToCents(order.total),
    currency: "usd",
    payment_method: method,
    stripe_checkout_session_id: order.paymentSession ?? null,
    receipt_url: options?.receiptUrl ?? order.receiptUrl ?? null,
  })
  if (error) {
    // Handle race condition when Stripe Webhook inserted the order milliseconds earlier
    if (order.paymentSession && error.code === "23505") {
      const { data: existing } = await sb
        .from("orders")
        .select("id")
        .eq("stripe_checkout_session_id", order.paymentSession)
        .maybeSingle()
      if (existing?.id) {
        return { orderId: existing.id, existed: true }
      }
    }
    throw error
  }
  return { orderId: order.id, existed: false }
}

export async function updateOrderInDb(
  sb: SbClient,
  orderId: string,
  patch: Database["public"]["Tables"]["orders"]["Update"]
) {
  const { error } = await sb.from("orders").update(patch).eq("id", orderId)
  if (error) throw error
}

export async function insertMessageInDb(
  sb: SbClient,
  orderId: string,
  userId: string,
  side: "client" | "studio",
  body: string,
  versionRef?: EntryVersionRef,
  attachments?: ChatAttachment[],
  senderMeta?: MessageSenderMeta,
  messageId?: string
) {
  const metadata: Record<string, unknown> = {}
  if (versionRef) metadata.versionRef = versionRef
  if (senderMeta?.name) metadata.sender = senderMeta

  const { data: msgRow, error } = await sb
    .from("order_messages")
    .insert({
      ...(messageId ? { id: messageId } : {}),
      order_id: orderId,
      sender_user_id: userId,
      sender_side: side,
      body,
      metadata,
    })
    .select("id")
    .single()
  if (error) throw error

  if (attachments?.length && msgRow?.id) {
    const rows = attachments.map((att) => ({
      order_id: orderId,
      message_id: msgRow.id,
      uploader_user_id: userId,
      r2_key:
        att.fileId.startsWith("sb:") || att.fileId.startsWith("r2:")
          ? att.fileId
          : `local:${att.fileId}`,
      file_name: att.name,
      mime_type: att.type || "application/octet-stream",
      size_bytes: att.size ?? 0,
      status: "ready" as const,
    }))
    const { error: attErr } = await sb.from("order_attachments").insert(rows)
    if (attErr) throw attErr
  }
}

export async function insertVersionInDb(
  sb: SbClient,
  orderId: string,
  userId: string,
  version: Version
) {
  const r2Key = version.fileId
    ? version.fileId.startsWith("sb:") || version.fileId.startsWith("r2:")
      ? version.fileId
      : `local:${version.fileId}`
    : `sample:${version.id}`
  const itemIndex = version.itemIndex && version.itemIndex >= 1 ? version.itemIndex : 1
  const versionCode = version.code || version.id.replace(/^#\d+-/, "")
  const { error } = await sb.from("video_versions").insert({
    order_id: orderId,
    item_index: itemIndex,
    item_title: version.itemTitle ?? "",
    version_code: versionCode,
    version_type: version.type,
    r2_key: r2Key,
    file_name: version.file ?? `${orderId}-video${itemIndex}-${versionCode}.mp4`,
    notes: version.note,
    uploaded_by: userId,
  })
  if (error) throw error
}

export async function saveProfileInDb(
  sb: SbClient,
  userId: string,
  profile: { name: string; company: string }
) {
  const { error } = await sb
    .from("profiles")
    .update({
      full_name: profile.name,
      company: profile.company,
    })
    .eq("id", userId)
  if (error) throw error
}

export async function saveCustomQuoteInDb(
  sb: SbClient,
  userId: string,
  quote: {
    id: string
    clientEmail: string
    projectName: string
    videoCount: number
    amountDollars: number
  }
) {
  const { error } = await sb.from("custom_quotes").upsert(
    {
      id: quote.id,
      client_email: quote.clientEmail.includes("@") ? quote.clientEmail : null,
      project_name: quote.projectName,
      video_count: quote.videoCount,
      amount_cents: dollarsToCents(quote.amountDollars),
      status: "open",
      created_by: userId,
    },
    { onConflict: "id" }
  )
  if (error) throw error
}

export async function syncRolePermissionsInDb(
  sb: SbClient,
  roleId: TeamRoleId,
  permissions: PermissionKey[]
) {
  const { error: delErr } = await sb
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId)
  if (delErr) throw delErr
  if (permissions.length > 0) {
    const { error: insErr } = await sb.from("role_permissions").insert(
      permissions.map((permission_key) => ({
        role_id: roleId,
        permission_key,
      }))
    )
    if (insErr) throw insErr
  }
}

export async function addTeamMemberInDb(
  sb: SbClient,
  member: { name: string; email: string; roleId: TeamRoleId }
) {
  const { data, error } = await sb
    .from("team_members")
    .insert({
      name: member.name,
      email: member.email,
      role_id: member.roleId,
      active: true,
    })
    .select("*")
    .single()
  if (error) throw error
  return data
}

export async function updateTeamMemberInDb(
  sb: SbClient,
  memberId: string,
  patch: { role_id?: TeamRoleId; active?: boolean }
) {
  const { error } = await sb
    .from("team_members")
    .update(patch)
    .eq("id", memberId)
  if (error) throw error
}

export async function fetchCustomQuoteInDb(
  sb: SbClient,
  quoteId: string
): Promise<CustomQuoteRecord | null> {
  const { data, error } = await sb
    .from("custom_quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle()
  if (error || !data) return null
  return {
    id: data.id,
    clientEmail: data.client_email ?? undefined,
    projectName: data.project_name,
    videoCount: data.video_count,
    amountDollars: centsToDollars(data.amount_cents),
    status: data.status,
  }
}

export async function markCustomQuotePaidInDb(sb: SbClient, quoteId: string) {
  await sb
    .from("custom_quotes")
    .update({ status: "paid" })
    .eq("id", quoteId)
    .eq("status", "open")
}

export async function insertNotificationInDb(
  sb: SbClient,
  payload: {
    recipientUserId: string
    orderId?: string
    eventType: string
    titleZh: string
    titleEn: string
    bodyZh: string
    bodyEn: string
  }
) {
  await sb.from("notifications").insert({
    recipient_user_id: payload.recipientUserId,
    order_id: payload.orderId ?? null,
    event_type: payload.eventType,
    title_zh: payload.titleZh,
    title_en: payload.titleEn,
    body_zh: payload.bodyZh,
    body_en: payload.bodyEn,
    is_read: false,
  })
}

export async function markNotificationReadInDb(
  sb: SbClient,
  userId: string,
  notificationId: string
) {
  const { error } = await sb
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_user_id", userId)
    .eq("id", notificationId)
  if (error) throw error
}

export async function markNotificationsReadInDb(sb: SbClient, userId: string) {
  const { error } = await sb
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_user_id", userId)
    .eq("is_read", false)
  if (error) throw error
}

export function subscribeWorkspaceRealtime(sb: SbClient, onChange: () => void) {
  const channel = sb
    .channel("nextgen-workspace-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "order_messages" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "order_attachments" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "video_versions" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      onChange
    )
    .subscribe()

  return () => {
    void sb.removeChannel(channel)
  }
}
