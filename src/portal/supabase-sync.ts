import type { SupabaseClient } from "@supabase/supabase-js"

import type { Addon, Plan } from "./checkout-catalog"
import type { Database, OrderStatus, PaymentMethodType } from "./database.types"
import type { Entry, EntryVersionRef, Order, Status, Version } from "./demo"
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

export type SupabaseSnapshot = {
  account: { id: string; name: string; email: string; company: string }
  teamMemberId: string | null
  teamRoles: TeamRoleConfig[]
  teamMembers: TeamMember[]
  orders: Order[]
  clients: ClientDirectoryEntry[]
  unread: boolean
}

function centsToDollars(cents: number | null | undefined): number {
  if (!cents || !Number.isFinite(cents)) return 0
  return Math.round(cents) / 100
}

function dollarsToCents(dollars: number): number {
  return Math.max(0, Math.round(dollars * 100))
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

  const plans: Plan[] = (planRows ?? []).map((row) => ({
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
    active: row.is_published,
  }))

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
  fallbackEmail: string
): Promise<SupabaseSnapshot> {
  // 1. Load own profile & own team_members row
  const [{ data: profile }, { data: selfMemberRows }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sb
      .from("team_members")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true),
  ])

  const selfMember = selfMemberRows?.[0] ?? null
  const isTeam = Boolean(selfMember)

  const account = {
    id: userId,
    name:
      profile?.full_name?.trim() ||
      selfMember?.name ||
      fallbackEmail.split("@")[0] ||
      "User",
    email: profile?.email || fallbackEmail,
    company: profile?.company || "",
  }

  // 2. Load RBAC roles, permissions & team members if team user
  let teamRoles: TeamRoleConfig[] = defaultTeamRoles
  let teamMembers: TeamMember[] = []
  let canViewAllOrders = false
  let canViewClients = false

  if (isTeam && selfMember) {
    const [{ data: rolesRows }, { data: permRows }, { data: memberRows }] =
      await Promise.all([
        sb.from("team_roles").select("*"),
        sb.from("role_permissions").select("*"),
        sb
          .from("team_members")
          .select("*")
          .order("created_at", { ascending: true }),
      ])

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
        name: item.name,
        email: item.email,
        roleId: item.role_id as TeamRoleId,
        active: item.active,
      }))
    } else {
      teamMembers = [
        {
          id: selfMember.id,
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
    canViewClients = Boolean(
      myRole?.locked || myRole?.permissions.includes("settings:clients")
    )
  }

  const memberNameById = new Map<string, string>(
    teamMembers.map((m) => [m.id, m.name])
  )

  // 3. Load clients directory if authorized
  let clients: ClientDirectoryEntry[] = []
  const clientNameById = new Map<string, string>([[userId, account.name]])
  if (canViewClients || canViewAllOrders) {
    const { data: profileRows } = await sb
      .from("profiles")
      .select("id, full_name, email, company, avatar_url")
      .order("created_at", { ascending: false })
    if (profileRows) {
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
  }

  // 4. Load accessible orders (privacy-preserving view for subcontractors)
  const rawOrders: Order[] = []
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
        plan: "pro",
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
  } else {
    const { data: orderRows } = await sb
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
    for (const row of orderRows ?? []) {
      rawOrders.push({
        id: row.id,
        zh: row.title_zh,
        en: row.title_en,
        client: clientNameById.get(row.client_id) ?? account.name,
        status: row.status as Status,
        plan: row.plan_id ?? (row.custom_quote_id ? "quote" : "pro"),
        count: row.video_credits_total,
        total: centsToDollars(row.amount_cents),
        method: row.payment_method,
        paymentSession: row.stripe_checkout_session_id ?? undefined,
        owner: row.assigned_member_id
          ? (memberNameById.get(row.assigned_member_id) ?? "")
          : "",
        entries: [],
        versions: [],
        revision: row.latest_revision_note ?? undefined,
      })
    }
  }

  // 5. Load messages, versions & notifications for accessible orders
  const orderIds = rawOrders.map((o) => o.id)
  if (orderIds.length > 0) {
    const [{ data: msgRows }, { data: verRows }] = await Promise.all([
      sb
        .from("order_messages")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true }),
      sb
        .from("video_versions")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true }),
    ])

    const messagesByOrder = new Map<string, Entry[]>()
    for (const m of msgRows ?? []) {
      const list = messagesByOrder.get(m.order_id) ?? []
      list.push({
        id: m.id,
        side: m.sender_side,
        text: m.body,
        versionRef: parseVersionRef(m.metadata),
      })
      messagesByOrder.set(m.order_id, list)
    }

    const versionsByOrder = new Map<string, Version[]>()
    for (const v of verRows ?? []) {
      const list = versionsByOrder.get(v.order_id) ?? []
      list.push({
        id: v.version_code,
        type: v.version_type,
        note: v.notes,
        file: v.file_name || undefined,
        fileId: v.r2_key?.startsWith("local:") ? v.r2_key.slice(6) : undefined,
      })
      versionsByOrder.set(v.order_id, list)
    }

    for (const o of rawOrders) {
      o.entries = messagesByOrder.get(o.id) ?? []
      o.versions = versionsByOrder.get(o.id) ?? []
    }
  }

  const { count: unreadCount } = await sb
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("is_read", false)

  return {
    account,
    teamMemberId: selfMember?.id ?? null,
    teamRoles,
    teamMembers,
    orders: rawOrders,
    clients,
    unread: Boolean(unreadCount && unreadCount > 0),
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
    is_published: plan.active !== false,
    sort_order: idx + 1,
  }))
  if (planPayload.length > 0) {
    const { error } = await sb
      .from("plans")
      .upsert(planPayload, { onConflict: "id" })
    if (error) throw error
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
  addonIds: string[] = []
) {
  const method: PaymentMethodType =
    order.method === "apple" || order.method === "ach" ? order.method : "card"
  const { error } = await sb.from("orders").insert({
    id: order.id,
    client_id: userId,
    title_zh: order.zh,
    title_en: order.en,
    status: order.status as OrderStatus,
    plan_id: order.plan === "quote" ? null : order.plan,
    addon_ids: addonIds,
    video_credits_total: order.count,
    video_credits_used: 0,
    amount_cents: dollarsToCents(order.total),
    currency: "usd",
    payment_method: method,
    stripe_checkout_session_id: order.paymentSession ?? null,
  })
  if (error) throw error
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
  versionRef?: EntryVersionRef
) {
  const { error } = await sb.from("order_messages").insert({
    order_id: orderId,
    sender_user_id: userId,
    sender_side: side,
    body,
    metadata: versionRef ? { versionRef } : {},
  })
  if (error) throw error
}

export async function insertVersionInDb(
  sb: SbClient,
  orderId: string,
  userId: string,
  version: Version
) {
  const { error } = await sb.from("video_versions").insert({
    order_id: orderId,
    version_code: version.id,
    version_type: version.type,
    r2_key: version.fileId ? `local:${version.fileId}` : `sample:${version.id}`,
    file_name: version.file ?? `${orderId}-${version.id}.mp4`,
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
      { event: "INSERT", schema: "public", table: "notifications" },
      onChange
    )
    .subscribe()

  return () => {
    void sb.removeChannel(channel)
  }
}
