import { useState, type FormEvent } from "react"
import {
  AlertTriangle,
  Check,
  Copy,
  CopyPlus,
  CreditCard,
  Download,
  ExternalLink,
  Layers,
  Link2,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import {
  QRCode,
  QRCodeDownload,
  QRCodeSkeleton,
  QRCodeSvg,
} from "@/components/ui/qr-code"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { defaultAddonItems, defaultPlans } from "./checkout-catalog"
import {
  formatDollars,
  useDemo,
  usePortal,
  type Addon,
  type CustomQuoteRecord,
  type Plan,
} from "./demo"
import { ActionLink } from "./layout"

type PlanDraft = {
  id: string | null
  code: string
  zh: string
  en: string
  tagZh: string
  tagEn: string
  count: string
  price: string
  renewal: string
  regular: string
  active: boolean
}

type AddonDraft = {
  id: string | null
  zh: string
  en: string
  price: string
  active: boolean
}

function emptyPlanDraft(): PlanDraft {
  return {
    id: null,
    code: "",
    zh: "",
    en: "",
    tagZh: "",
    tagEn: "",
    count: "5",
    price: "459",
    renewal: "359",
    regular: "",
    active: true,
  }
}

function planToDraft(plan: Plan): PlanDraft {
  return {
    id: plan.id,
    code: plan.id,
    zh: plan.zh,
    en: plan.en,
    tagZh: plan.tagZh ?? "",
    tagEn: plan.tagEn ?? "",
    count: String(plan.count),
    price: String(plan.price),
    renewal: plan.renewal ? String(plan.renewal) : "",
    regular: plan.regular ? String(plan.regular) : "",
    active: plan.active !== false,
  }
}

function emptyAddonDraft(): AddonDraft {
  return {
    id: null,
    zh: "",
    en: "",
    price: "50",
    active: true,
  }
}

function addonToDraft(addon: Addon): AddonDraft {
  return {
    id: addon.id,
    zh: addon.zh,
    en: addon.en,
    price: String(addon.price),
    active: addon.active,
  }
}

function discountPercent(price: number, regular?: number): number | null {
  if (!regular || regular <= price || regular <= 0) return null
  return Math.round(((regular - price) / regular) * 100)
}

export function PricingCatalogView() {
  const { t, zh } = usePortal()
  const { data, saveCatalog } = useDemo()

  const plans = data.plans
  const addons = data.addons
  const [catalogTab, setCatalogTab] = useState<"packages" | "addons">(
    "packages"
  )
  const [search, setSearch] = useState("")
  const [planSheetOpen, setPlanSheetOpen] = useState(false)
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null)
  const [planInitialDraft, setPlanInitialDraft] = useState<PlanDraft | null>(
    null
  )
  const [addonSheetOpen, setAddonSheetOpen] = useState(false)
  const [addonDraft, setAddonDraft] = useState<AddonDraft | null>(null)
  const [addonInitialDraft, setAddonInitialDraft] =
    useState<AddonDraft | null>(null)
  const [discardPrompt, setDiscardPrompt] = useState<"plan" | "addon" | null>(
    null
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "plan"; id: string; label: string }
    | { kind: "addon"; id: string; label: string }
    | null
  >(null)

  function openDeleteConfirm(
    target:
      | { kind: "plan"; id: string; label: string }
      | { kind: "addon"; id: string; label: string }
  ) {
    setDeleteTarget(target)
    setDeleteDialogOpen(true)
  }

  const isPlanDirty = Boolean(
    planSheetOpen &&
      planDraft &&
      planInitialDraft &&
      JSON.stringify(planDraft) !== JSON.stringify(planInitialDraft)
  )
  const isAddonDirty = Boolean(
    addonSheetOpen &&
      addonDraft &&
      addonInitialDraft &&
      JSON.stringify(addonDraft) !== JSON.stringify(addonInitialDraft)
  )

  function openPlanEditor(draft: PlanDraft) {
    setPlanDraft(draft)
    setPlanInitialDraft(draft)
    setPlanSheetOpen(true)
  }

  function requestClosePlanSheet() {
    if (isPlanDirty) {
      setDiscardPrompt("plan")
      return
    }
    setPlanSheetOpen(false)
  }

  function openAddonEditor(draft: AddonDraft) {
    setAddonDraft(draft)
    setAddonInitialDraft(draft)
    setAddonSheetOpen(true)
  }

  function requestCloseAddonSheet() {
    if (isAddonDirty) {
      setDiscardPrompt("addon")
      return
    }
    setAddonSheetOpen(false)
  }

  function confirmDiscardChanges() {
    if (discardPrompt === "plan") {
      setPlanSheetOpen(false)
    } else if (discardPrompt === "addon") {
      setAddonSheetOpen(false)
    }
    setDiscardPrompt(null)
  }

  function persist(
    nextPlans: Plan[],
    nextAddons: Addon[],
    successMsg: string,
    errorMsg: string
  ) {
    void saveCatalog(nextPlans, nextAddons).then((ok) => {
      if (ok) toast.success(successMsg)
      else toast.error(errorMsg)
    })
  }

  function savePlanDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!planDraft) return
    const zhName = planDraft.zh.trim()
    const enName = planDraft.en.trim()
    const count = Math.floor(Number(planDraft.count))
    const price = Number(planDraft.price)
    const renewalNum = planDraft.renewal.trim()
      ? Number(planDraft.renewal)
      : undefined
    const regularNum = planDraft.regular.trim()
      ? Number(planDraft.regular)
      : undefined
    const rawCode = planDraft.code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

    if (
      !zhName ||
      !enName ||
      !Number.isInteger(count) ||
      count <= 0 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      (renewalNum !== undefined && (!Number.isFinite(renewalNum) || renewalNum <= 0))
    ) {
      toast.error(
        t(
          "请填写完整的套餐名称、视频条数与售价。",
          "Please enter valid bilingual names, video credits, and USD price."
        )
      )
      return
    }

    const resolvedId =
      planDraft.id ?? (rawCode || "plan-" + crypto.randomUUID().slice(0, 6))
    if (!planDraft.id && plans.some((item) => item.id === resolvedId)) {
      toast.error(
        t(
          `套餐编码 "${resolvedId}" 已存在，请更换其他编码。`,
          `Package code "${resolvedId}" already exists.`
        )
      )
      return
    }

    const saved: Plan = {
      id: resolvedId,
      zh: zhName,
      en: enName,
      tagZh: planDraft.tagZh.trim(),
      tagEn: planDraft.tagEn.trim(),
      count,
      price,
      renewal: renewalNum && renewalNum > 0 ? renewalNum : undefined,
      regular: regularNum && regularNum > price ? regularNum : undefined,
      active: planDraft.active,
    }

    const nextPlans = planDraft.id
      ? plans.map((item) => (item.id === planDraft.id ? saved : item))
      : [...plans, saved]

    if (!nextPlans.some((item) => item.active !== false)) {
      toast.error(
        t(
          "请至少保持一个套餐处于上架状态。",
          "Keep at least one package published."
        )
      )
      return
    }

    persist(
      nextPlans,
      addons,
      planDraft.id
        ? t(`套餐「${zhName}」已更新并同步至官网。`, `Updated "${enName}".`)
        : t(`已创建新套餐「${zhName}」。`, `Created "${enName}".`),
      t("保存套餐失败，请稍后重试。", "Could not save package changes.")
    )
    setPlanInitialDraft(planDraft)
    setPlanSheetOpen(false)
  }

  function togglePlanActive(plan: Plan, checked: boolean) {
    const nextPlans = plans.map((item) =>
      item.id === plan.id ? { ...item, active: checked } : item
    )
    if (!nextPlans.some((item) => item.active !== false)) {
      toast.error(
        t(
          "请至少保持一个套餐处于上架状态。",
          "Keep at least one package published."
        )
      )
      return
    }
    persist(
      nextPlans,
      addons,
      checked
        ? t(`套餐「${plan.zh}」已上架。`, `Published "${plan.en}".`)
        : t(`套餐「${plan.zh}」已下架。`, `Unpublished "${plan.en}".`),
      t("更新上架状态失败，请稍后重试。", "Could not update package status.")
    )
  }

  function duplicatePlan(plan: Plan) {
    openPlanEditor({
      ...planToDraft(plan),
      id: null,
      code: `${plan.id}-copy`,
      zh: `${plan.zh}（副本）`,
      en: `${plan.en} (Copy)`,
    })
  }

  function copyCheckoutPath(planId: string) {
    const path = `${window.location.origin}/checkout/${planId}`
    void navigator.clipboard?.writeText(path).then(
      () => toast.success(t(`已复制结账链接 /checkout/${planId}`, `Copied /checkout/${planId}`)),
      () => toast.info(path)
    )
  }

  function syncOfficialCatalog() {
    const legacyHidden = plans
      .filter(
        (item) =>
          (item.id === "pro" || item.id === "ent") &&
          !defaultPlans.some((preset) => preset.id === item.id)
      )
      .map((item) => ({ ...item, active: false }))
    const customExtra = plans.filter(
      (item) =>
        item.id !== "pro" &&
        item.id !== "ent" &&
        !defaultPlans.some((preset) => preset.id === item.id)
    )
    const nextPlans = [...defaultPlans, ...customExtra, ...legacyHidden]
    const nextAddons = [
      ...defaultAddonItems,
      ...addons.filter(
        (item) => !defaultAddonItems.some((preset) => preset.id === item.id)
      ),
    ]
    persist(
      nextPlans,
      nextAddons,
      t(
        "已同步官网 7 档标准套餐与加项配置。",
        "Synced official 7-tier package catalog & add-ons."
      ),
      t("同步套餐目录失败，请重试。", "Could not sync official catalog.")
    )
  }

  function saveAddonDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!addonDraft) return
    const zhName = addonDraft.zh.trim()
    const enName = addonDraft.en.trim()
    const price = Number(addonDraft.price)
    if (!zhName || !enName || !Number.isFinite(price) || price < 0) {
      toast.error(
        t(
          "请填写完整的加项名称与价格。",
          "Please enter a valid add-on name and price."
        )
      )
      return
    }
    const saved: Addon = {
      id: addonDraft.id ?? "addon-" + crypto.randomUUID().slice(0, 6),
      zh: zhName,
      en: enName,
      price,
      active: addonDraft.active,
    }
    const nextAddons = addonDraft.id
      ? addons.map((item) => (item.id === addonDraft.id ? saved : item))
      : [...addons, saved]

    persist(
      plans,
      nextAddons,
      addonDraft.id
        ? t(`加项「${zhName}」已更新。`, `Updated "${enName}".`)
        : t(`已新增加项「${zhName}」。`, `Created "${enName}".`),
      t("保存加项失败，请稍后重试。", "Could not save add-on.")
    )
    setAddonInitialDraft(addonDraft)
    setAddonSheetOpen(false)
  }

  function toggleAddonActive(addon: Addon, checked: boolean) {
    const nextAddons = addons.map((item) =>
      item.id === addon.id ? { ...item, active: checked } : item
    )
    persist(
      plans,
      nextAddons,
      checked
        ? t(`加项「${addon.zh}」已启用。`, `Enabled "${addon.en}".`)
        : t(`加项「${addon.zh}」已停用。`, `Disabled "${addon.en}".`),
      t("更新加项状态失败，请重试。", "Could not update add-on.")
    )
  }

  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === "plan") {
      if (plans.length <= 1) {
        toast.error(
          t(
            "至少保留一个套餐，无法全部删除。",
            "At least one package is required."
          )
        )
        setDeleteDialogOpen(false)
        return
      }
      const nextPlans = plans.filter((item) => item.id !== deleteTarget.id)
      if (!nextPlans.some((item) => item.active !== false)) {
        nextPlans[0] = { ...nextPlans[0], active: true }
      }
      persist(
        nextPlans,
        addons,
        t("套餐已删除。", "Package deleted."),
        t("删除套餐失败，请稍后重试。", "Could not delete package.")
      )
    } else {
      const nextAddons = addons.filter((item) => item.id !== deleteTarget.id)
      persist(
        plans,
        nextAddons,
        t("加项服务已删除。", "Add-on deleted."),
        t("删除加项失败，请稍后重试。", "Could not delete add-on.")
      )
    }
    setDeleteDialogOpen(false)
  }

  const q = search.trim().toLowerCase()
  const visiblePlans = plans.filter((item) => {
    if (!q) return true
    return (
      item.id.toLowerCase().includes(q) ||
      item.zh.toLowerCase().includes(q) ||
      item.en.toLowerCase().includes(q) ||
      (item.tagZh ?? "").toLowerCase().includes(q) ||
      (item.tagEn ?? "").toLowerCase().includes(q)
    )
  })
  const visibleAddons = addons.filter((item) => {
    if (!q) return true
    return (
      item.id.toLowerCase().includes(q) ||
      item.zh.toLowerCase().includes(q) ||
      item.en.toLowerCase().includes(q)
    )
  })

  const previewPrice = Number(planDraft?.price) || 0
  const previewRenewal = planDraft?.renewal.trim()
    ? Number(planDraft.renewal)
    : undefined
  const previewCount = Math.max(1, Math.floor(Number(planDraft?.count) || 1))
  const previewRegular = planDraft?.regular.trim()
    ? Number(planDraft.regular)
    : undefined
  const previewDiscount = discountPercent(previewPrice, previewRegular)
  const hasOfficialCatalogSynced = defaultPlans.every((preset) =>
    plans.some((item) => item.id === preset.id)
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Product catalog tabs + toolbar */}
      <Tabs
        value={catalogTab}
        onValueChange={(value) =>
          setCatalogTab(value as "packages" | "addons")
        }
        className="gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="packages">
              <Package data-icon="inline-start" aria-hidden="true" />
              {t("视频套餐", "Packages")} ({plans.length})
            </TabsTrigger>
            <TabsTrigger value="addons">
              <Layers data-icon="inline-start" aria-hidden="true" />
              {t("可选加项", "Add-ons")} ({addons.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="h-9 w-52 bg-card">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  catalogTab === "packages"
                    ? t("搜索套餐名称或标签…", "Search packages…")
                    : t("搜索加项服务…", "Search add-ons…")
                }
                aria-label={t("搜索商品目录", "Search catalog")}
              />
            </InputGroup>
            {!hasOfficialCatalogSynced && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={syncOfficialCatalog}
              >
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                {t("同步官网 7 档标准套餐", "Sync 7-tier catalog")}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() =>
                catalogTab === "packages"
                  ? openPlanEditor(emptyPlanDraft())
                  : openAddonEditor(emptyAddonDraft())
              }
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              {catalogTab === "packages"
                ? t("新增套餐", "Add package")
                : t("新增加项", "Add add-on")}
            </Button>
          </div>
        </div>

        <TabsContent value="packages" className="m-0">
          <Card className="gap-0 overflow-hidden py-0 shadow-xs">
            <CardContent className="p-0">
              {visiblePlans.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5">
                        {t("套餐产品", "Package")}
                      </TableHead>
                      <TableHead>{t("视频配额与均价", "Credits")}</TableHead>
                      <TableHead>{t("美元定价", "Price (USD)")}</TableHead>
                      <TableHead>{t("上架状态", "Status")}</TableHead>
                      <TableHead className="w-24 px-5 text-right">
                        {t("操作", "Actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePlans.map((plan) => {
                      const isActive = plan.active !== false
                      const unitBase = plan.renewal ?? plan.price
                      const unitPrice = unitBase / Math.max(1, plan.count)
                      const offPct = discountPercent(plan.price, plan.regular)
                      const tagLabel = zh ? plan.tagZh : plan.tagEn
                      return (
                        <TableRow
                          key={plan.id}
                          onClick={() => openPlanEditor(planToDraft(plan))}
                          className="cursor-pointer transition-colors hover:bg-muted/40"
                        >
                          <TableCell className="px-5 py-3.5">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {zh ? plan.zh : plan.en}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="h-5 px-1.5 font-mono text-[10px] font-normal text-muted-foreground"
                                >
                                  {plan.id}
                                </Badge>
                                {tagLabel && (
                                  <Badge variant="secondary">{tagLabel}</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {zh ? plan.en : plan.zh}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5 tabular-nums">
                              <span className="font-medium text-foreground">
                                {t(`${plan.count} 条视频`, `${plan.count} videos`)}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {formatDollars(
                                  Math.round(unitPrice * 100) / 100
                                )}{" "}
                                / {t("条", "video")}
                                {plan.renewal
                                  ? t("（续费均价）", " (renewal)")
                                  : ""}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5 tabular-nums">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="font-mono text-sm font-semibold text-foreground">
                                  {formatDollars(plan.price)}
                                </span>
                                {plan.regular && plan.regular > plan.price && (
                                  <span className="font-mono text-xs text-muted-foreground line-through">
                                    {formatDollars(plan.regular)}
                                  </span>
                                )}
                                {offPct && (
                                  <Badge variant="outline">-{offPct}%</Badge>
                                )}
                              </div>
                              {plan.renewal && (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {t(
                                    `续费 ${formatDollars(plan.renewal)}/月`,
                                    `Renew ${formatDollars(plan.renewal)}/mo`
                                  )}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="flex items-center gap-2.5">
                              <Switch
                                checked={isActive}
                                aria-label={t(
                                  `切换 ${plan.zh} 上架状态`,
                                  `Toggle ${plan.en}`
                                )}
                                onCheckedChange={(checked) =>
                                  togglePlanActive(plan, checked)
                                }
                              />
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  isActive
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {isActive
                                  ? t("已上架", "Published")
                                  : t("已下架", "Hidden")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell
                            className="px-5 text-right"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={t("更多操作", "More actions")}
                                >
                                  <MoreHorizontal aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      openPlanEditor(planToDraft(plan))
                                    }
                                  >
                                    <Pencil aria-hidden="true" />
                                    {t("编辑套餐", "Edit package")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => copyCheckoutPath(plan.id)}
                                  >
                                    <Link2 aria-hidden="true" />
                                    {t("复制结账链接", "Copy checkout URL")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => duplicatePlan(plan)}
                                  >
                                    <CopyPlus aria-hidden="true" />
                                    {t("复制新建", "Duplicate")}
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    disabled={plans.length <= 1}
                                    variant="destructive"
                                    onSelect={() =>
                                      openDeleteConfirm({
                                        kind: "plan",
                                        id: plan.id,
                                        label: zh ? plan.zh : plan.en,
                                      })
                                    }
                                  >
                                    <Trash2 aria-hidden="true" />
                                    {t("删除套餐", "Delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <Empty className="py-12">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Package aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {t("没有匹配的套餐", "No matching packages")}
                    </EmptyTitle>
                    <EmptyDescription>
                      {t(
                        "尝试清空搜索关键词或点击右上角新增套餐。",
                        "Clear the search filter or create a new package."
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSearch("")}
                    >
                      {t("清除搜索", "Clear search")}
                    </Button>
                  </EmptyContent>
                </Empty>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addons" className="m-0">
          <Card className="gap-0 overflow-hidden py-0 shadow-xs">
            <CardContent className="p-0">
              {visibleAddons.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5">
                        {t("加项服务", "Add-on")}
                      </TableHead>
                      <TableHead>{t("加项价格", "Price (USD)")}</TableHead>
                      <TableHead>{t("启用状态", "Status")}</TableHead>
                      <TableHead className="w-24 px-5 text-right">
                        {t("操作", "Actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleAddons.map((addon) => (
                      <TableRow
                        key={addon.id}
                        onClick={() => openAddonEditor(addonToDraft(addon))}
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="px-5 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">
                              {zh ? addon.zh : addon.en}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {zh ? addon.en : addon.zh}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold tabular-nums">
                          +{formatDollars(addon.price)}
                        </TableCell>
                        <TableCell
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-center gap-2.5">
                            <Switch
                              checked={addon.active}
                              aria-label={t(
                                `切换 ${addon.zh} 启用状态`,
                                `Toggle ${addon.en}`
                              )}
                              onCheckedChange={(checked) =>
                                toggleAddonActive(addon, checked)
                              }
                            />
                            <span
                              className={cn(
                                "text-xs font-medium",
                                addon.active
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              {addon.active
                                ? t("已启用", "Active")
                                : t("已停用", "Disabled")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell
                          className="px-5 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t("更多操作", "More actions")}
                              >
                                <MoreHorizontal aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  onSelect={() =>
                                    openAddonEditor(addonToDraft(addon))
                                  }
                                >
                                  <Pencil aria-hidden="true" />
                                  {t("编辑加项", "Edit add-on")}
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() =>
                                    openDeleteConfirm({
                                      kind: "addon",
                                      id: addon.id,
                                      label: zh ? addon.zh : addon.en,
                                    })
                                  }
                                >
                                  <Trash2 aria-hidden="true" />
                                  {t("删除加项", "Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty className="py-12">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Layers aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {t("暂无可选加项服务", "No add-ons found")}
                    </EmptyTitle>
                    <EmptyDescription>
                      {t(
                        "客户下单时可按需勾选加项，点击右上角即可新增。",
                        "Add-ons appear as optional upgrades at checkout."
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openAddonEditor(emptyAddonDraft())}
                    >
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      {t("新增加项", "Add add-on")}
                    </Button>
                  </EmptyContent>
                </Empty>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Click-to-edit Package Sheet (with smooth close animation & unsaved-changes guard) */}
      <Sheet
        open={planSheetOpen && Boolean(planDraft)}
        onOpenChange={(open) => {
          if (!open) requestClosePlanSheet()
        }}
      >
        {planDraft && (
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
            closeLabel={t("关闭编辑抽屉", "Close editor")}
            onInteractOutside={(event) => {
              if (isPlanDirty) {
                event.preventDefault()
                setDiscardPrompt("plan")
              }
            }}
            onEscapeKeyDown={(event) => {
              if (isPlanDirty) {
                event.preventDefault()
                setDiscardPrompt("plan")
              }
            }}
          >
            <SheetHeader className="border-b bg-card px-5 py-4">
              <div className="flex items-center gap-2 pr-8">
                <SheetTitle>
                  {planDraft.id
                    ? t("编辑视频套餐", "Edit package")
                    : t("新增视频套餐", "Create package")}
                </SheetTitle>
                {isPlanDirty && (
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-amber-800"
                  >
                    {t("未保存", "Unsaved")}
                  </Badge>
                )}
              </div>
              <SheetDescription>
                {t(
                  "保存后立即同步到官网首页价格卡片与客户结算页。",
                  "Changes sync immediately to the website pricing section and checkout."
                )}
              </SheetDescription>
            </SheetHeader>

            <form
              id="plan-editor-form"
              onSubmit={savePlanDraft}
              className="flex flex-1 flex-col gap-5 overflow-y-auto bg-muted/20 px-5 py-5"
            >
              {/* Live storefront card preview */}
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {t("前台卡片预览", "Storefront preview")}
                  </span>
                  {(zh ? planDraft.tagZh : planDraft.tagEn).trim() && (
                    <Badge variant="secondary">
                      {(zh ? planDraft.tagZh : planDraft.tagEn).trim()}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {(zh ? planDraft.zh : planDraft.en).trim() ||
                        t("未命名套餐", "Untitled package")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(
                        `包含 ${previewCount} 条定制数字人视频`,
                        `Includes ${previewCount} avatar videos`
                      )}
                      {previewRenewal && previewRenewal > 0
                        ? t(
                            ` · 续费 ${formatDollars(previewRenewal)}/月`,
                            ` · Renew ${formatDollars(previewRenewal)}/mo`
                          )
                        : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                    <span className="font-mono text-lg font-bold text-foreground">
                      {formatDollars(previewPrice)}
                    </span>
                    {previewRegular && previewRegular > previewPrice && (
                      <span className="font-mono text-xs text-muted-foreground line-through">
                        {formatDollars(previewRegular)}
                      </span>
                    )}
                    {previewDiscount && (
                      <Badge variant="outline">-{previewDiscount}%</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="edit-plan-code">
                      {t("套餐编码 ID（对应官网跳转路径）", "Package code (checkout slug)")}
                    </FieldLabel>
                    <div className="flex items-center gap-2">
                      <InputGroup className="flex-1">
                        <InputGroupAddon>
                          <InputGroupText className="font-mono text-xs">
                            /checkout/
                          </InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="edit-plan-code"
                          className="font-mono text-xs"
                          value={planDraft.code}
                          readOnly={Boolean(planDraft.id)}
                          disabled={Boolean(planDraft.id)}
                          onChange={(event) =>
                            setPlanDraft({
                              ...planDraft,
                              code: event.target.value,
                            })
                          }
                          placeholder="presenter-5"
                        />
                      </InputGroup>
                      {planDraft.id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyCheckoutPath(planDraft.id!)}
                        >
                          <Copy data-icon="inline-start" aria-hidden="true" />
                          {t("复制链接", "Copy URL")}
                        </Button>
                      )}
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="edit-plan-en">
                        {t("英文名称", "English name")}
                      </FieldLabel>
                      <Input
                        id="edit-plan-en"
                        value={planDraft.en}
                        onChange={(event) =>
                          setPlanDraft({ ...planDraft, en: event.target.value })
                        }
                        placeholder="Pro 5-Pack"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-plan-zh">
                        {t("中文名称", "Chinese name")}
                      </FieldLabel>
                      <Input
                        id="edit-plan-zh"
                        value={planDraft.zh}
                        onChange={(event) =>
                          setPlanDraft({ ...planDraft, zh: event.target.value })
                        }
                        placeholder="专业 5 条套餐"
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="edit-plan-tag-en">
                        {t("英文标签（选填）", "English badge (optional)")}
                      </FieldLabel>
                      <Input
                        id="edit-plan-tag-en"
                        value={planDraft.tagEn}
                        onChange={(event) =>
                          setPlanDraft({
                            ...planDraft,
                            tagEn: event.target.value,
                          })
                        }
                        placeholder="Most Popular"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-plan-tag-zh">
                        {t("中文标签（选填）", "Chinese badge (optional)")}
                      </FieldLabel>
                      <Input
                        id="edit-plan-tag-zh"
                        value={planDraft.tagZh}
                        onChange={(event) =>
                          setPlanDraft({
                            ...planDraft,
                            tagZh: event.target.value,
                          })
                        }
                        placeholder="最受欢迎"
                      />
                    </Field>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="edit-plan-count">
                        {t("视频条数", "Credits")}
                      </FieldLabel>
                      <Input
                        id="edit-plan-count"
                        type="number"
                        min="1"
                        className="font-mono tabular-nums"
                        value={planDraft.count}
                        onChange={(event) =>
                          setPlanDraft({
                            ...planDraft,
                            count: event.target.value,
                          })
                        }
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-plan-price">
                        {t("首月 / 售价 (USD)", "First month / price (USD)")}
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>$</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="edit-plan-price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="font-mono tabular-nums"
                          value={planDraft.price}
                          onChange={(event) =>
                            setPlanDraft({
                              ...planDraft,
                              price: event.target.value,
                            })
                          }
                          required
                        />
                      </InputGroup>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-plan-renewal">
                        {t("续费月价（选填）", "Renewal / mo (optional)")}
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>$</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="edit-plan-renewal"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="—"
                          className="font-mono tabular-nums"
                          value={planDraft.renewal}
                          onChange={(event) =>
                            setPlanDraft({
                              ...planDraft,
                              renewal: event.target.value,
                            })
                          }
                        />
                      </InputGroup>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-plan-regular">
                        {t("划线原价（选填）", "Compare at (optional)")}
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>$</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="edit-plan-regular"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="—"
                          className="font-mono tabular-nums"
                          value={planDraft.regular}
                          onChange={(event) =>
                            setPlanDraft({
                              ...planDraft,
                              regular: event.target.value,
                            })
                          }
                        />
                      </InputGroup>
                    </Field>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/25 px-3.5 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {t("在官网与结算页上架展示", "Published on storefront")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t(
                          "关闭后仅隐藏新客购买入口，不影响历史订单。",
                          "Hiding stops new purchases without affecting existing orders."
                        )}
                      </span>
                    </div>
                    <Switch
                      checked={planDraft.active}
                      onCheckedChange={(checked) =>
                        setPlanDraft({ ...planDraft, active: checked })
                      }
                    />
                  </div>
                </FieldGroup>
              </div>
            </form>

            <SheetFooter className="flex-row items-center justify-end gap-2 border-t bg-card px-5 py-3.5">
              <Button
                type="button"
                variant="outline"
                onClick={requestClosePlanSheet}
              >
                {t("取消", "Cancel")}
              </Button>
              <Button type="submit" form="plan-editor-form">
                {planDraft.id
                  ? t("保存更改", "Save changes")
                  : t("创建并上架", "Create package")}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      {/* Click-to-edit Add-on Sheet (with smooth close animation & unsaved-changes guard) */}
      <Sheet
        open={addonSheetOpen && Boolean(addonDraft)}
        onOpenChange={(open) => {
          if (!open) requestCloseAddonSheet()
        }}
      >
        {addonDraft && (
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
            closeLabel={t("关闭编辑抽屉", "Close editor")}
            onInteractOutside={(event) => {
              if (isAddonDirty) {
                event.preventDefault()
                setDiscardPrompt("addon")
              }
            }}
            onEscapeKeyDown={(event) => {
              if (isAddonDirty) {
                event.preventDefault()
                setDiscardPrompt("addon")
              }
            }}
          >
            <SheetHeader className="border-b bg-card px-5 py-4">
              <div className="flex items-center gap-2 pr-8">
                <SheetTitle>
                  {addonDraft.id
                    ? t("编辑可选加项", "Edit add-on")
                    : t("新增可选加项", "Create add-on")}
                </SheetTitle>
                {isAddonDirty && (
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-amber-800"
                  >
                    {t("未保存", "Unsaved")}
                  </Badge>
                )}
              </div>
              <SheetDescription>
                {t(
                  "配置中英文名称与加项金额，保存后即时生效。",
                  "Configure bilingual names and USD price for checkout add-ons."
                )}
              </SheetDescription>
            </SheetHeader>

            <form
              id="addon-editor-form"
              onSubmit={saveAddonDraft}
              className="flex flex-1 flex-col gap-4 overflow-y-auto bg-muted/20 px-5 py-5"
            >
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="edit-addon-en">
                      {t("英文名称", "English name")}
                    </FieldLabel>
                    <Input
                      id="edit-addon-en"
                      value={addonDraft.en}
                      onChange={(event) =>
                        setAddonDraft({ ...addonDraft, en: event.target.value })
                      }
                      placeholder="48h Rush Delivery"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-addon-zh">
                      {t("中文名称", "Chinese name")}
                    </FieldLabel>
                    <Input
                      id="edit-addon-zh"
                      value={addonDraft.zh}
                      onChange={(event) =>
                        setAddonDraft({ ...addonDraft, zh: event.target.value })
                      }
                      placeholder="48 小时加急交付"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-addon-price">
                      {t("加项价格 (USD)", "Price (USD)")}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id="edit-addon-price"
                        type="number"
                        min="0"
                        step="0.01"
                        className="font-mono tabular-nums"
                        value={addonDraft.price}
                        onChange={(event) =>
                          setAddonDraft({
                            ...addonDraft,
                            price: event.target.value,
                          })
                        }
                        required
                      />
                    </InputGroup>
                  </Field>
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/25 px-3.5 py-2.5">
                    <span className="text-sm font-medium text-foreground">
                      {t("结算页启用", "Active at checkout")}
                    </span>
                    <Switch
                      checked={addonDraft.active}
                      onCheckedChange={(checked) =>
                        setAddonDraft({ ...addonDraft, active: checked })
                      }
                    />
                  </div>
                </FieldGroup>
              </div>
            </form>

            <SheetFooter className="flex-row items-center justify-end gap-2 border-t bg-card px-5 py-3.5">
              <Button
                type="button"
                variant="outline"
                onClick={requestCloseAddonSheet}
              >
                {t("取消", "Cancel")}
              </Button>
              <Button type="submit" form="addon-editor-form">
                {addonDraft.id
                  ? t("保存更改", "Save changes")
                  : t("确认新增", "Create add-on")}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      {/* Unsaved Changes Guard Dialog */}
      <AlertDialog
        open={Boolean(discardPrompt)}
        onOpenChange={(open) => {
          if (!open) setDiscardPrompt(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-amber-500/12 text-amber-600">
              <AlertTriangle aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {t("放弃未保存的更改？", "Discard unsaved changes?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "当前编辑内容尚未保存，关闭后刚才修改的内容将会丢失。",
                "You have unsaved edits in this drawer. Closing now will discard them."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("继续编辑", "Keep editing")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDiscardChanges}
            >
              {t("放弃并关闭", "Discard & close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unified Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen && Boolean(deleteTarget)}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {deleteTarget?.kind === "plan"
                ? t("确认删除该套餐？", "Delete this package?")
                : t("确认删除该加项服务？", "Delete this add-on?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "plan"
                ? t(
                    `删除「${deleteTarget.label}」后将不再展示于官网与结算页，但不影响历史订单。`,
                    `Removing "${deleteTarget?.label}" hides it from future checkouts without affecting existing orders.`
                  )
                : t(
                    `删除「${deleteTarget?.label ?? ""}」后客户下单将不再看到此可选项。`,
                    `Removing "${deleteTarget?.label ?? ""}" hides it from future checkouts.`
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("取消", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              {t("确认删除", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const presetQuoteCounts = ["5", "10", "20", "30"] as const

export function CustomQuotesView() {
  const { t, href } = usePortal()
  const { data, saveCustomQuote } = useDemo()

  const [quoteEmail, setQuoteEmail] = useState("michael@eduscale.io")
  const [quoteProject, setQuoteProject] = useState("EduScale Q4 Course Series")
  const [quoteCount, setQuoteCount] = useState("10")
  const [quoteAmount, setQuoteAmount] = useState("1250")
  const [quoteRef, setQuoteRef] = useState(
    data.customQuotes[0]?.id ?? "QUOTE-9021"
  )
  const [copiedKey, setCopiedKey] = useState("")

  const countNum = Math.max(1, Math.floor(Number(quoteCount) || 10))
  const amountNum = Math.max(1, Number(quoteAmount) || 1250)
  const unitPrice = amountNum / countNum
  const displayProject = quoteProject.trim() || quoteEmail.trim() || quoteRef

  function buildPath(item: {
    id: string
    amountDollars: number
    videoCount: number
    projectName: string
  }) {
    return href("auth", {
      quote: item.id,
      amount: String(item.amountDollars),
      quota: String(item.videoCount),
      project: item.projectName,
      redirect: "checkout",
    })
  }

  const activePath = buildPath({
    id: quoteRef,
    amountDollars: amountNum,
    videoCount: countNum,
    projectName: displayProject,
  })
  const activeUrl = new URL(activePath, window.location.origin).href

  function generateQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextRef = "QUOTE-" + Math.floor(1000 + Math.random() * 9000)
    setQuoteRef(nextRef)
    void saveCustomQuote({
      id: nextRef,
      clientEmail: quoteEmail.trim(),
      projectName: displayProject,
      videoCount: countNum,
      amountDollars: amountNum,
    }).then((ok) => {
      if (ok) {
        toast.success(
          t(
            `定制报价 #${nextRef} 已生成并入库。`,
            `Custom quote #${nextRef} created.`
          )
        )
      } else {
        toast.error(
          t("保存定制报价失败，请稍后重试。", "Could not save custom quote.")
        )
      }
    })
  }

  async function copyUrl(key: string, url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedKey(key)
      toast.success(t("付款链接已复制。", "Payment link copied."))
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current))
      }, 1800)
    } catch {
      toast.info(t("请手动复制链接。", "Select and copy the link."))
    }
  }

  function quoteStatusBadge(status: CustomQuoteRecord["status"]) {
    if (status === "paid") {
      return (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-700"
        >
          {t("已付款", "Paid")}
        </Badge>
      )
    }
    if (status === "expired" || status === "cancelled") {
      return (
        <Badge variant="secondary">
          {status === "expired" ? t("已过期", "Expired") : t("已取消", "Cancelled")}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
        {t("待付款", "Open")}
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-stretch gap-5 lg:grid-cols-12">
        {/* Left: Structured Quote Builder */}
        <Card className="shadow-xs lg:col-span-7">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">
              <h2>{t("创建专属定制报价", "Create custom payment link")}</h2>
            </CardTitle>
            <CardDescription className="text-xs">
              {t(
                "对应官网 Cinematic Custom 定制需求，生成独立美元付款链接与报价单，付款后自动建单入账。",
                "Issue a dedicated USD Stripe payment link for Cinematic Custom or enterprise briefs; paid quotes auto-create orders."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={generateQuote} className="flex flex-col gap-5">
              <FieldGroup className="gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="quote-project">
                      {t("项目 / 套餐名称", "Project or quote title")}
                    </FieldLabel>
                    <Input
                      id="quote-project"
                      value={quoteProject}
                      onChange={(event) => setQuoteProject(event.target.value)}
                      placeholder="EduScale Q4 Course Series"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="quote-email">
                      {t("客户邮箱（选填）", "Client email (optional)")}
                    </FieldLabel>
                    <Input
                      id="quote-email"
                      type="email"
                      value={quoteEmail}
                      onChange={(event) => setQuoteEmail(event.target.value)}
                      placeholder="michael@eduscale.io"
                    />
                  </Field>
                </div>

                <Field>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel htmlFor="quote-count">
                      {t("交付视频条数", "Video credits")}
                    </FieldLabel>
                    <ToggleGroup
                      type="single"
                      size="sm"
                      variant="outline"
                      value={
                        presetQuoteCounts.includes(
                          quoteCount as (typeof presetQuoteCounts)[number]
                        )
                          ? quoteCount
                          : ""
                      }
                      onValueChange={(value) => {
                        if (value) setQuoteCount(value)
                      }}
                    >
                      {presetQuoteCounts.map((preset) => (
                        <ToggleGroupItem
                          key={preset}
                          value={preset}
                          className="h-7 px-2.5 font-mono text-xs"
                        >
                          {preset} {t("条", "vid")}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      id="quote-count"
                      type="number"
                      min="1"
                      required
                      className="font-mono tabular-nums"
                      value={quoteCount}
                      onChange={(event) => setQuoteCount(event.target.value)}
                    />
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id="quote-price"
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        aria-label={t("报价总额 (USD)", "Total amount (USD)")}
                        className="font-mono tabular-nums"
                        value={quoteAmount}
                        onChange={(event) => setQuoteAmount(event.target.value)}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText className="text-xs">USD</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>
                  <FieldDescription>
                    {t(
                      `折合单条约 ${formatDollars(Math.round(unitPrice * 100) / 100)} / 条 · 支持信用卡、Apple Pay 与 ACH 银行转账`,
                      `Effective rate ${formatDollars(Math.round(unitPrice * 100) / 100)} / video · Card, Apple Pay & ACH supported`
                    )}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button type="submit">
                  <Link2 data-icon="inline-start" aria-hidden="true" />
                  {t("生成并保存付款链接", "Generate payment link")}
                </Button>
                <ActionLink variant="outline" to={activePath}>
                  <ExternalLink data-icon="inline-start" aria-hidden="true" />
                  {t("打开结算预览", "Open checkout preview")}
                </ActionLink>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right: Stripe-grade Hosted Invoice Preview Card with Vector Banner & Live QR Code */}
        <Card className="gap-0 overflow-hidden py-0 shadow-sm lg:col-span-5">
          <div className="relative overflow-hidden px-5 pt-5 pb-4 text-white">
            <img
              src="/portal-media/quote-header-bg.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full object-cover"
            />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/portal-media/nextgen-avatar-mark-small.png"
                    alt="NextGen Avatar"
                    width={30}
                    height={27}
                    decoding="async"
                    className="h-7 w-auto shrink-0 object-contain drop-shadow-xs"
                  />
                  <div className="flex flex-col leading-tight">
                    <span className="font-serif text-[15px] font-bold tracking-tight text-[#ffe8d1]">
                      NextGen Avatar
                    </span>
                    <span className="mt-0.5 text-[10px] font-medium tracking-wide text-white/75">
                      {t(
                        "by 2301 Pictures · 专属定制报价单",
                        "by 2301 Pictures · Cinematic Custom"
                      )}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-white/25 bg-white/10 font-mono text-xs text-white backdrop-blur-xs"
                >
                  #{quoteRef}
                </Badge>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-white/70">
                    {t("应付总额 (USD)", "Amount due (USD)")}
                  </div>
                  <div className="mt-0.5 font-mono text-3xl font-bold tracking-tight text-white tabular-nums">
                    {formatDollars(amountNum)}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-xs">
                  {t("一次性付清", "One-time")}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="flex flex-1 flex-col justify-between gap-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <Item variant="muted" size="xs" className="px-3 py-2.5">
                  <ItemContent>
                    <ItemTitle className="text-sm font-semibold">
                      {displayProject}
                    </ItemTitle>
                    <ItemDescription className="font-mono text-xs">
                      {quoteEmail.trim() || t("不限客户邮箱", "Open recipient")}
                    </ItemDescription>
                  </ItemContent>
                </Item>

                <div className="flex flex-col gap-1.5 border-t border-dashed border-border pt-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("交付视频配额", "Video credits")}
                    </span>
                    <span className="font-mono font-semibold text-foreground tabular-nums">
                      {countNum} {t("条", "videos")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("折合单条均价", "Effective unit rate")}
                    </span>
                    <span className="font-mono text-muted-foreground tabular-nums">
                      {formatDollars(Math.round(unitPrice * 100) / 100)} /{" "}
                      {t("条", "vid")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("出品方", "Issued by")}
                    </span>
                    <span className="font-medium text-foreground">
                      2301 Pictures · nextgenavatar.com
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("支付保障", "Checkout")}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <ShieldCheck
                        className="size-3.5 text-primary"
                        aria-hidden="true"
                      />
                      Stripe
                    </span>
                  </div>
                </div>
              </div>

              {/* Scannable @diceui/qr-code Payment QR */}
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <QRCode
                  value={activeUrl}
                  size={104}
                  margin={1}
                  foregroundColor="#101b2d"
                  backgroundColor="#ffffff"
                  className="rounded-xl border border-border bg-white p-2 shadow-2xs"
                >
                  <div className="relative size-[104px]">
                    <QRCodeSkeleton className="rounded-md" />
                    <QRCodeSvg className="size-full" />
                  </div>
                  <QRCodeDownload
                    filename={`${quoteRef}-payment-qr.png`}
                    asChild
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="mt-1.5 h-6 w-full gap-1 px-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <Download className="size-3" aria-hidden="true" />
                      {t("保存二维码", "Save QR")}
                    </Button>
                  </QRCodeDownload>
                </QRCode>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-3.5">
              <InputGroup className="h-9 bg-muted/35">
                <InputGroupInput
                  readOnly
                  value={activeUrl}
                  aria-label={t("专属付款链接", "Custom payment URL")}
                  className="font-mono text-xs text-muted-foreground"
                />
                <InputGroupAddon align="inline-end">
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => void copyUrl("preview", activeUrl)}
                  >
                    {copiedKey === "preview" ? (
                      <Check data-icon="inline-start" aria-hidden="true" />
                    ) : (
                      <Copy data-icon="inline-start" aria-hidden="true" />
                    )}
                    {t("复制", "Copy")}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="size-3.5" aria-hidden="true" />
                  Card · Apple Pay · ACH
                </span>
                <span>{t("扫码或点链接均可付款", "Scan QR or open link")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Ledger Table */}
      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        <CardHeader className="border-b px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">
            {t(
              `近期定制报价记录 (${data.customQuotes.length})`,
              `Recent custom quotes (${data.customQuotes.length})`
            )}
          </CardTitle>
          <CardAction>
            <span className="text-xs text-muted-foreground">
              {t("客户付款后自动核销", "Automatically marked paid after checkout")}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          {data.customQuotes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-5">
                    {t("报价单号", "Quote ID")}
                  </TableHead>
                  <TableHead>{t("项目 / 客户", "Project / Client")}</TableHead>
                  <TableHead>{t("条数", "Credits")}</TableHead>
                  <TableHead>{t("金额 (USD)", "Amount")}</TableHead>
                  <TableHead>{t("状态", "Status")}</TableHead>
                  <TableHead className="px-5 text-right">
                    {t("链接操作", "Actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.customQuotes.map((item) => {
                  const rowPath = buildPath(item)
                  const rowUrl = new URL(rowPath, window.location.origin).href
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="px-5 font-mono text-xs font-semibold">
                        #{item.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {item.projectName}
                          </span>
                          {item.clientEmail && (
                            <span className="font-mono text-xs text-muted-foreground">
                              {item.clientEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {item.videoCount} {t("条", "videos")}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold tabular-nums">
                        {formatDollars(item.amountDollars)}
                      </TableCell>
                      <TableCell>{quoteStatusBadge(item.status)}</TableCell>
                      <TableCell className="px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => void copyUrl(item.id, rowUrl)}
                          >
                            {copiedKey === item.id ? (
                              <Check data-icon="inline-start" aria-hidden="true" />
                            ) : (
                              <Copy data-icon="inline-start" aria-hidden="true" />
                            )}
                            {t("复制", "Copy")}
                          </Button>
                          <ActionLink size="xs" variant="ghost" to={rowPath}>
                            <ExternalLink
                              data-icon="inline-start"
                              aria-hidden="true"
                            />
                            {t("预览", "Open")}
                          </ActionLink>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Receipt aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {t("暂无定制报价记录", "No custom quotes yet")}
                </EmptyTitle>
                <EmptyDescription>
                  {t(
                    "在上方表单生成报价链接后会自动归档在此列表。",
                    "Generated payment links will be tracked here."
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
