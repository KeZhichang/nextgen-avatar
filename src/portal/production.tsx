import { useEffect, useRef, useState, type FormEvent } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router"
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react"
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  Download,
  FileWarning,
  Film,
  MessageSquare,
  Play,
  Plus,
  Search,
  Send,
  Upload,
  Video,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Editable,
  EditableArea,
  EditableInput,
  EditablePreview,
} from "@/components/ui/editable"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from "@/components/ui/file-upload"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChatAttachmentCard } from "./chat-attachment"
import { ChatComposer } from "./chat-composer"
import {
  buildNextVersionForItem,
  clientImage,
  coverImage,
  entryAttachments,
  getOrderDeliverableSlots,
  getVersionCode,
  getVersionItemIndex,
  getVersionsForItem,
  sampleMaterials,
  sampleOrder,
  sampleVideo,
  studioImage,
  useDemo,
  usePortal,
  useTeamAuth,
  type ChatAttachment,
  type Entry,
  type Order,
  type Version,
} from "./demo"
import {
  downloadFile,
  downloadOrderFile,
  fetchFileBytes,
  resolveFileSource,
  uploadOrderFiles,
  validateOrderFile,
} from "./files"
import { ActionLink, FadeTransition, PageWidth, StatusBadge } from "./layout"
import { TeamConsoleLayout } from "./team-console"
import { PortalVideo } from "./video"

export function EditableOrderTitle({ order }: { order: Order }) {
  const { t, zh } = usePortal()
  const { renameOrder } = useDemo()
  const currentTitle = zh ? order.zh : order.en
  const [draft, setDraft] = useState(currentTitle)
  const [editing, setEditing] = useState(false)

  function handleSubmit(nextValue: string) {
    const clean = nextValue.trim()
    if (!clean || clean === currentTitle) {
      setDraft(currentTitle)
      return
    }
    setDraft(clean)
    void renameOrder(order.id, clean).then((ok) => {
      if (ok) {
        toast.success(t("项目名称已更新", "Project name updated"))
      } else {
        setDraft(currentTitle)
        toast.error(
          t("项目名称暂未能更新，请重试。", "Could not update project name.")
        )
      }
    })
  }

  return (
    <Editable
      value={editing ? draft : currentTitle}
      editing={editing}
      onEdit={() => setDraft(currentTitle)}
      onEditingChange={setEditing}
      onValueChange={setDraft}
      onSubmit={handleSubmit}
      onCancel={() => setDraft(currentTitle)}
      autosize
      maxLength={80}
      placeholder={t("输入项目名称…", "Enter project name…")}
      className="inline-flex max-w-full flex-row items-center"
    >
      <Tooltip open={editing ? false : undefined}>
        <TooltipTrigger asChild>
          <EditableArea className="max-w-full">
            <EditablePreview className="-mx-1.5 cursor-text rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium text-foreground transition-colors hover:border-border/70 hover:bg-muted/60" />
            <EditableInput
              aria-label={t("项目名称", "Project name")}
              className="-mx-1.5 rounded-md border border-primary/50 bg-card px-1.5 py-0.5 text-sm font-medium text-foreground ring-2 ring-primary/15"
            />
          </EditableArea>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {t("点击重命名", "Click to rename")}
        </TooltipContent>
      </Tooltip>
    </Editable>
  )
}

function useOrder() {
  const [query] = useSearchParams()
  const { data } = useDemo()
  const id = query.get("order")
  if (!id) return data.orders[0]
  return data.orders.find((value) => value.id === id)
}

function MissingOrder({ team = false }: { team?: boolean }) {
  const { t, href } = usePortal()
  return (
    <PageWidth className="flex min-h-[70dvh] items-center justify-center">
      <Empty className="max-w-md border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileWarning aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            {t("此订单当前不可查看", "This order is unavailable")}
          </EmptyTitle>
          <EmptyDescription>
            {t(
              "订单不存在，或当前账号无权访问该订单。",
              "The order does not exist or is not accessible with this account."
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ActionLink primary to={href(team ? "admin-orders" : "workspace")}>
            {team
              ? t("返回订单管理", "Back to orders")
              : t("返回工作台", "Back to workspace")}
          </ActionLink>
        </EmptyContent>
      </Empty>
    </PageWidth>
  )
}

function formatVersionLabel(
  id: string,
  type: "preview" | "final",
  t: (zh: string, en: string) => string,
  itemIndex?: number,
  showItemPrefix = false
) {
  const code = id.replace(/^#\d+-/, "")
  const base =
    type === "final"
      ? t("正式交付版", "Final delivery")
      : code === "v1"
        ? t("初稿 v1", "Initial draft v1")
        : t(`修订稿 ${code}`, `Revision ${code}`)
  if (showItemPrefix && itemIndex && itemIndex >= 1) {
    return t(`第 ${itemIndex} 条 · ${base}`, `Video #${itemIndex} · ${base}`)
  }
  return base
}

function ChatPanel({
  order,
  side,
  onOpenReview,
  compactHeader = false,
}: {
  order: Order
  side: Entry["side"]
  onOpenReview?: (versionId?: string) => void
  compactHeader?: boolean
}) {
  const { t, zh } = usePortal()
  const { data, sendChatMessage } = useDemo()
  const hasMultipleDeliverables = getOrderDeliverableSlots(order).length > 1
  const clientAvatar =
    order.client === data.account.name && data.account.avatarUrl
      ? data.account.avatarUrl
      : clientImage
  const sample: Entry[] =
    order.demo && order.id === sampleOrder
      ? [
        {
          id: "sample-client",
          side: "client",
          text: t(
            "初稿 v1 00:24 处语速稍快，麻烦调整一下。",
            "The pacing at 00:24 in v1 is a little fast. Could you slow it down?"
          ),
        },
        {
          id: "sample-team",
          side: "studio",
          text: t(
            "收到，修订版 v2 已上传，请在线审片确认或继续提出修改意见。",
            "Updated pacing and uploaded v2. Please review and approve or leave revision notes."
          ),
          versionRef: {
            id: "v2",
            type: "preview",
            note: t(
              "已优化 00:24 处语速与开场镜头节奏",
              "Updated pacing and opening shot"
            ),
          },
        },
      ]
      : order.id === "NGA-20261024"
        ? [
          {
            id: "sample-final-delivery",
            side: "studio",
            text: t(
              "正式无水印成片已交付，可在审片页或工作台随时下载。",
              "Your watermark-free final video has been delivered."
            ),
            versionRef: {
              id: "final",
              type: "final",
              note: t("1080P 无水印正式交付版", "1080P watermark-free final"),
            },
          },
        ]
        : []
  const entries = [...sample, ...order.entries]
  const latestVersion = order.versions.at(-1)

  function send(text: string, attachments?: ChatAttachment[]) {
    void sendChatMessage(order.id, side, text, attachments).then((ok) => {
      if (!ok) {
        toast.error(
          t("消息发送失败，请稍后重试。", "Could not send message. Try again.")
        )
      }
    })
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-muted/20",
        side === "studio"
          ? "max-lg:h-[clamp(22rem,61dvh,34rem)]"
          : "max-xl:h-[clamp(22rem,61dvh,34rem)]"
      )}
    >
      {!compactHeader && (
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 flex-col">
            <strong className="truncate text-sm font-semibold">
              {side === "studio"
                ? order.client
                : t("制作团队", "Production team")}
            </strong>
            <span className="truncate text-xs text-muted-foreground">
              <span className="font-mono">#{order.id}</span> ·{" "}
              {zh ? order.zh : order.en}
            </span>
          </div>
          <StatusBadge status={order.status} />
        </div>
      )}
      {side === "client" &&
        order.status === "waiting_confirm" &&
        onOpenReview && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-brand-gold/30 bg-brand-gold/10 px-4 py-2.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-amber-950">
              <Film
                aria-hidden="true"
                className="size-4 shrink-0 text-amber-700"
              />
              <span className="truncate">
                {t(
                  `${latestVersion ? formatVersionLabel(latestVersion.id, latestVersion.type, t, getVersionItemIndex(latestVersion), hasMultipleDeliverables) : "最新预览版"}已上传，等待您审片确认或提交修改意见。`,
                  `${latestVersion ? formatVersionLabel(latestVersion.id, latestVersion.type, t, getVersionItemIndex(latestVersion), hasMultipleDeliverables) : "Latest draft"} is ready for your approval or revision notes.`
                )}
              </span>
            </div>
            <Button
              size="xs"
              className="shrink-0 bg-brand-navy text-white hover:bg-brand-navy/90"
              onClick={() => onOpenReview(latestVersion?.id)}
            >
              <Play data-icon="inline-start" aria-hidden="true" />
              {t("立即审片", "Review now")}
            </Button>
          </div>
        )}
      <MessageScrollerProvider defaultScrollPosition="end" autoScroll>
        <MessageScroller className="h-auto flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-4 px-4 py-5 sm:px-6">
              {entries.length === 0 && (
                <Empty className="my-auto py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MessageSquare aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {t("开始订单沟通", "Start the conversation")}
                    </EmptyTitle>
                    <EmptyDescription>
                      {t(
                        "发送制作要求或通过左下角图标上传照片、声音、台词与参考视频素材。",
                        "Send your brief or upload photos, voice samples, scripts, and reference videos below."
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              <AnimatePresence initial={false}>
                {entries.map((entry) => {
                  const own = entry.side === side
                  const client = entry.side === "client"
                  const sender = client
                    ? order.client
                    : t("制作团队", "Production team")
                  const attachments = entryAttachments(entry)
                  return (
                    <MessageScrollerItem key={entry.id} messageId={entry.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 460,
                          damping: 34,
                          mass: 0.82,
                        }}
                      >
                        <Message align={own ? "end" : "start"}>
                      <MessageAvatar className="self-start">
                        <Avatar className="size-8">
                          <AvatarImage
                            src={client ? clientAvatar : studioImage}
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback>{sender.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                      <MessageContent>
                        <span className="sr-only">{sender}</span>
                        {entry.text && (
                          <Bubble
                            variant={own ? "default" : "outline"}
                            className={
                              own
                                ? "chat-bubble-outgoing"
                                : "chat-bubble-incoming"
                            }
                          >
                            <BubbleContent className="whitespace-pre-wrap">
                              {entry.text}
                            </BubbleContent>
                          </Bubble>
                        )}
                        {entry.versionRef && (
                          <div className="mt-1.5 flex w-72 max-w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-2xs">
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-brand-navy">
                              <img
                                src={coverImage}
                                alt=""
                                className="size-full object-cover opacity-80"
                              />
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="flex size-6 items-center justify-center rounded-full bg-brand-navy/85 text-white">
                                  <Play
                                    aria-hidden="true"
                                    className="size-3 fill-current"
                                  />
                                </span>
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-xs font-semibold text-foreground">
                                  {formatVersionLabel(
                                    entry.versionRef.id,
                                    entry.versionRef.type,
                                    t,
                                    entry.versionRef.itemIndex,
                                    hasMultipleDeliverables
                                  )}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="px-1.5 py-0 font-mono text-[10px]"
                                >
                                  {entry.versionRef.type === "final"
                                    ? "FINAL"
                                    : entry.versionRef.id
                                        .replace(/^#\d+-/, "")
                                        .toUpperCase()}
                                </Badge>
                              </div>
                              {entry.versionRef.note && (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {entry.versionRef.note}
                                </p>
                              )}
                              {onOpenReview && (
                                <Button
                                  type="button"
                                  size="xs"
                                  variant={
                                    entry.versionRef.type === "preview" &&
                                      order.status === "waiting_confirm"
                                      ? "default"
                                      : "outline"
                                  }
                                  className="mt-0.5 w-fit"
                                  onClick={() =>
                                    onOpenReview(entry.versionRef?.id)
                                  }
                                >
                                  {entry.versionRef.type === "final"
                                    ? t("查看并下载成片", "View & download")
                                    : order.status === "waiting_confirm"
                                      ? t(
                                        "去审片 / 提意见",
                                        "Review & feedback"
                                      )
                                      : t("查看该版本", "View version")}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        {!!attachments.length && (
                          <div
                            data-slot="message-attachments"
                            className={cn(
                              "grid max-w-full gap-2",
                              attachments.length > 1
                                ? "w-100 grid-cols-[repeat(auto-fit,minmax(min(9rem,100%),1fr))]"
                                : "w-48"
                            )}
                          >
                            {attachments.map((attachment) => (
                              <ChatAttachmentCard
                                key={attachment.fileId}
                                attachment={attachment}
                              />
                            ))}
                          </div>
                        )}
                      </MessageContent>
                    </Message>
                    </motion.div>
                  </MessageScrollerItem>
                )
              })}
              </AnimatePresence>
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton
            aria-label={t("跳到最新消息", "Jump to latest message")}
          >
            <ArrowDown aria-hidden="true" />
          </MessageScrollerButton>
        </MessageScroller>
      </MessageScrollerProvider>
      <ChatComposer
        orderId={order.id}
        side={side}
        localOnly={Boolean(order.demo)}
        onSend={send}
      />
    </section>
  )
}

function VideoPlayer({
  version,
  label,
  active,
}: {
  version: Version
  label: string
  active: boolean
}) {
  const [resolvedSrc, setResolvedSrc] = useState("")
  const player = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!active) player.current?.querySelector("video")?.pause()
  }, [active])
  useEffect(() => {
    if (!version.fileId) return
    let mounted = true
    let revokeFn: (() => void) | undefined
    resolveFileSource(version.fileId)
      .then((res) => {
        if (!mounted) {
          res?.revoke?.()
          return
        }
        if (res) {
          revokeFn = res.revoke
          setResolvedSrc(res.url)
        }
      })
      .catch(() => undefined)
    return () => {
      mounted = false
      revokeFn?.()
    }
  }, [version.fileId])
  return (
    <div
      ref={player}
      className="relative overflow-hidden rounded-xl border border-border bg-brand-navy shadow-xs"
    >
      <PortalVideo
        poster={coverImage}
        src={version.fileId ? resolvedSrc || undefined : sampleVideo}
        label={label}
      />
      <Badge
        variant="outline"
        className="pointer-events-none absolute top-3 left-3 border-white/15 bg-brand-navy/80 font-mono text-[11px] text-white backdrop-blur-xs"
      >
        {label}
      </Badge>
    </div>
  )
}

function ReviewPanel({
  order,
  selectedVersionId,
  onSelectVersion,
  onOpenChat,
}: {
  order: Order
  selectedVersionId: string
  onSelectVersion: (id: string) => void
  onOpenChat: () => void
}) {
  const { t } = usePortal()
  const { submitOrderReview } = useDemo()
  const [revision, setRevision] = useState("")
  const [manualSlot, setManualSlot] = useState<number | null>(null)

  const slots = getOrderDeliverableSlots(order)
  const isMultiVideo = slots.length > 1

  const requestedVersion = selectedVersionId
    ? order.versions.find((item) => item.id === selectedVersionId)
    : undefined
  const latestOverall = order.versions.at(-1)
  const defaultItemIndex = requestedVersion
    ? getVersionItemIndex(requestedVersion)
    : latestOverall
      ? getVersionItemIndex(latestOverall)
      : 1
  const activeItemIndex = manualSlot ?? defaultItemIndex

  const itemVersions = getVersionsForItem(order, activeItemIndex)
  const latestInItem = itemVersions.at(-1)
  const itemHasFinal = itemVersions.some((item) => item.type === "final")
  const selected =
    itemVersions.find((item) => item.id === selectedVersionId) ?? latestInItem
  const activeSlotMeta = slots.find((slot) => slot.index === activeItemIndex)

  const isLatestPreviewInItem = Boolean(
    selected &&
    latestInItem?.id === selected.id &&
    selected.type === "preview" &&
    !itemHasFinal
  )
  const canApprove = Boolean(
    isLatestPreviewInItem &&
    (order.status === "waiting_confirm" || order.status === "revision")
  )
  const canRequestRevision = Boolean(
    isLatestPreviewInItem && order.status !== "completed"
  )

  function selectSlot(slotIndex: number) {
    setManualSlot(slotIndex)
    const versionsInSlot = getVersionsForItem(order, slotIndex)
    const target = versionsInSlot.at(-1)
    onSelectVersion(target?.id ?? "")
  }

  function approve() {
    if (!canApprove) return
    const prefixZh = isMultiVideo ? `第 ${activeItemIndex} 条视频：` : ""
    const prefixEn = isMultiVideo ? `Video #${activeItemIndex}: ` : ""
    void submitOrderReview(
      order.id,
      "approve",
      t(
        `${prefixZh}已确认当前版本，请交付正式成片。`,
        `${prefixEn}I approved the current version. Please deliver the final video.`
      )
    ).then((ok) => {
      if (ok) {
        toast.success(
          t(
            "审核通过，已通知制作团队准备正式交付。",
            "Approved. The production team has been notified."
          )
        )
      } else {
        toast.error(
          t("确认操作失败，请稍后重试。", "Could not submit approval.")
        )
      }
    })
  }

  function requestRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = revision.trim()
    if (!clean || !canRequestRevision) return
    const tagged = isMultiVideo
      ? t(`[第 ${activeItemIndex} 条] ${clean}`, `[Video #${activeItemIndex}] ${clean}`)
      : clean
    setRevision("")
    void submitOrderReview(order.id, "revision", tagged, tagged).then((ok) => {
      if (ok) {
        toast.success(
          t("修改意见已发送至制作团队。", "Revision notes sent to the team.")
        )
      } else {
        setRevision(clean)
        toast.error(
          t("修改意见提交失败，请重试。", "Could not submit revision notes.")
        )
      }
    })
  }

  async function download() {
    if (!selected) return
    try {
      await downloadOrderFile(
        selected.fileId,
        sampleVideo,
        selected.file ??
          (isMultiVideo
            ? `${order.id}-video-${activeItemIndex}-final.mp4`
            : `${order.id}-final.mp4`)
      )
      toast.success(t("开始下载无水印成片", "Downloading final video"))
    } catch {
      toast.error(
        t(
          "当前视频暂不可下载，请稍后重试或联系制作团队。",
          "This video is temporarily unavailable. Please try again later."
        )
      )
    }
  }

  if (order.versions.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Empty className="max-w-md border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Film aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              {t(
                "等待制作团队上传初稿",
                "Waiting for the production team to upload a draft"
              )}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                "请先在「沟通与素材」中上传制作素材；团队上传初稿后，您将在这里在线审片、确认通过或提交修改意见。",
                "Upload your materials in Chat & Materials first. Once a draft is uploaded, you can review and approve it here."
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onOpenChat}>
              <MessageSquare data-icon="inline-start" aria-hidden="true" />
              {t("切换到沟通与素材", "Go to chat & materials")}
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {isMultiVideo && (
          <LayoutGroup id={`review-video-slots-${order.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card px-4 py-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {slots.map((slot) => {
                  const isActive = slot.index === activeItemIndex
                  return (
                    <button
                      key={slot.index}
                      type="button"
                      onClick={() => selectSlot(slot.index)}
                      className={cn(
                        "relative inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors duration-200",
                        isActive
                          ? "z-10 border-transparent font-semibold text-foreground"
                          : "z-0 border-border/80 bg-muted/25 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId={`review-video-slot-pill-${order.id}`}
                          aria-hidden="true"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                            mass: 0.88,
                          }}
                          className="pointer-events-none absolute inset-0 z-0 rounded-lg border border-primary bg-primary/8 shadow-2xs"
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-10 size-1.5 shrink-0 rounded-full",
                          slot.hasFinal ? "bg-emerald-500" : "bg-primary"
                        )}
                        aria-hidden="true"
                      />
                      <span className="relative z-10 font-mono">
                        #{slot.index}
                      </span>
                      {slot.title && (
                        <span className="relative z-10 max-w-32 truncate">
                          {slot.title}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {activeSlotMeta?.title && (
                <span className="text-xs text-muted-foreground">
                  {activeSlotMeta.title}
                </span>
              )}
            </div>
          </LayoutGroup>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-12">
          {selected ? (
            <Tabs
              value={selected.id}
              onValueChange={(nextId) => {
                setManualSlot(activeItemIndex)
                onSelectVersion(nextId)
              }}
              className="min-w-0 gap-4 lg:col-span-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList aria-label={t("视频版本", "Video versions")}>
                  {itemVersions.map((item) => (
                    <TabsTrigger key={item.id} value={item.id}>
                      {formatVersionLabel(item.id, item.type, t)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Badge variant="secondary" className="font-mono text-xs">
                  {isMultiVideo ? `#${activeItemIndex} · ` : ""}1080P · 60fps
                </Badge>
              </div>
              {itemVersions.map((version) => {
                const code = getVersionCode(version).toUpperCase()
                return (
                  <TabsContent
                    key={order.id + version.id}
                    value={version.id}
                    className="flex min-w-0 flex-col gap-4"
                  >
                    <VideoPlayer
                      version={version}
                      active={version.id === selected.id}
                      label={
                        version.type === "final"
                          ? isMultiVideo
                            ? `#${activeItemIndex} FINAL`
                            : "FINAL"
                          : isMultiVideo
                            ? `#${activeItemIndex} PREVIEW ${code}`
                            : `PREVIEW ${code}`
                      }
                    />
                    <Card className="shadow-xs">
                      <CardHeader>
                        <CardTitle className="text-sm">
                          <h2>{t("制作备注", "Production notes")}</h2>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {version.note ||
                            t(
                              "此版本暂无备注。",
                              "There are no notes for this version."
                            )}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )
              })}
            </Tabs>
          ) : (
            <div className="lg:col-span-8">
              <Empty className="border bg-card py-14">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Film aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {t(
                      `第 ${activeItemIndex} 条视频尚未上传初稿`,
                      `Video #${activeItemIndex} draft not uploaded yet`
                    )}
                  </EmptyTitle>
                  <EmptyDescription>
                    {t(
                      "制作团队上传该条视频的预览版后，即可在这里在线审片与提出修改意见。",
                      "Once the studio uploads a draft for this video slot, you can review and approve it here."
                    )}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" onClick={onOpenChat}>
                    <MessageSquare data-icon="inline-start" aria-hidden="true" />
                    {t("在聊天中沟通该条需求", "Discuss this video in chat")}
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          )}

          <Card className="shadow-xs lg:sticky lg:top-6 lg:col-span-4">
            <CardHeader className="border-b">
              <CardTitle>
                <h2>
                  {isMultiVideo
                    ? t(
                        `第 ${activeItemIndex} 条 · 审核与交付`,
                        `Video #${activeItemIndex} · Review`
                      )
                    : t("审核与交付", "Review & delivery")}
                </h2>
              </CardTitle>
              <CardDescription>
                {t(
                  "支持多轮沟通修订，确认无误后将交付正式无水印成片。",
                  "Submit revision notes as needed; approve to trigger final watermark-free delivery."
                )}
              </CardDescription>
              <CardAction>
                <StatusBadge status={order.status} />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!selected ? (
                <Alert>
                  <AlertDescription>
                    {t(
                      `第 ${activeItemIndex} 条暂未上传初稿，可切换至其他已上传条数审片，或前往沟通页补充脚本要求。`,
                      `Video #${activeItemIndex} has no draft yet. Switch to another video slot or share your script in chat.`
                    )}
                  </AlertDescription>
                </Alert>
              ) : selected.type === "final" ? (
                <div className="flex flex-col gap-3">
                  <Alert className="border-emerald-200 bg-emerald-50/70 text-emerald-950">
                    <CheckCircle2
                      aria-hidden="true"
                      className="text-emerald-600"
                    />
                    <AlertTitle>
                      {isMultiVideo
                        ? t(
                            `第 ${activeItemIndex} 条正式成片已交付`,
                            `Video #${activeItemIndex} final delivered`
                          )
                        : t("正式成片已交付", "Final video delivered")}
                    </AlertTitle>
                    <AlertDescription className="text-emerald-900/80">
                      {t(
                        "当前为无水印正式交付版本，可随时在线播放或下载保存。",
                        "This is your watermark-free final video. Download it anytime."
                      )}
                    </AlertDescription>
                  </Alert>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => void download()}
                  >
                    <Download data-icon="inline-start" aria-hidden="true" />
                    {t("下载无水印成片", "Download final video")}
                  </Button>
                </div>
              ) : !isLatestPreviewInItem ? (
                <Alert>
                  <AlertDescription>
                    {itemHasFinal
                      ? t(
                          "该条视频已有正式交付版本，请切换到「正式交付版」下载。",
                          "This video already has a final delivery. Switch to the Final tab to download."
                        )
                      : t(
                          "当前正在查看历史版本，请切换至最新版本进行审核或提出修改。",
                          "You are viewing an older draft. Switch to the latest version to approve or request changes."
                        )}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {order.status === "approved" && (
                    <Alert className="border-sky-200 bg-sky-50/70 text-sky-950">
                      <CheckCircle2 aria-hidden="true" className="text-sky-600" />
                      <AlertTitle>{t("您已确认定稿", "Version approved")}</AlertTitle>
                      <AlertDescription className="text-sky-900/85">
                        {t(
                          "制作团队正在导出无水印正式成片。如仍有临时修改，可在下方直接补充意见。",
                          "Your team is rendering the watermark-free final video. You can still submit additional changes below if needed."
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {order.status === "revision" && (
                    <Alert className="border-brand-gold/40 bg-brand-gold/10 text-amber-950">
                      <AlertTriangle aria-hidden="true" className="text-amber-700" />
                      <AlertTitle>
                        {t("制作团队正在根据意见修改", "Revisions in progress")}
                      </AlertTitle>
                      <AlertDescription className="text-amber-900/85">
                        {t(
                          "已收到上一轮修改要求，您仍可继续补充新的调整意见，或直接确认当前版本。",
                          "Your previous notes were sent. You can still add further revisions below or approve this draft."
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {canApprove && (
                    <div className="flex flex-col gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="lg" className="w-full">
                            <CheckCircle2
                              data-icon="inline-start"
                              aria-hidden="true"
                            />
                            {t("确认通过", "Approve version")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogMedia className="bg-primary/10 text-primary">
                              <CheckCircle2 aria-hidden="true" />
                            </AlertDialogMedia>
                            <AlertDialogTitle>
                              {isMultiVideo
                                ? t(
                                    `确认通过第 ${activeItemIndex} 条初稿？`,
                                    `Approve Video #${activeItemIndex} draft?`
                                  )
                                : t(
                                    "确认通过当前初稿？",
                                    "Approve this draft version?"
                                  )}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t(
                                "确认后将通知制作团队导出无水印正式成片；如有紧急调整可随时补充修改意见。",
                                "Approving notifies the team to render the watermark-free final video."
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {t("取消", "Cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={approve}>
                              {t("确认通过", "Approve")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}

                  {canApprove && <Separator />}

                  {canRequestRevision && (
                    <form onSubmit={requestRevision}>
                      <FieldGroup className="gap-3">
                        <Field>
                          <FieldLabel htmlFor="revision-note">
                            {order.status === "revision" ||
                            order.status === "approved"
                              ? t("补充修改意见", "Add another revision note")
                              : t("申请修改意见", "Revision notes")}
                          </FieldLabel>
                          <Textarea
                            id="revision-note"
                            rows={4}
                            placeholder={t(
                              "可注明时间点和调整要求，例如：00:24 处语速稍快…",
                              "Include the timecode and the change you need, e.g. 00:24 pacing…"
                            )}
                            value={revision}
                            onChange={(event) => setRevision(event.target.value)}
                          />
                        </Field>
                        <Button
                          variant="outline"
                          type="submit"
                          className="w-full"
                          disabled={!revision.trim()}
                        >
                          {t("提交修改意见", "Request changes")}
                        </Button>
                      </FieldGroup>
                    </form>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="justify-center">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="w-full"
                onClick={onOpenChat}
              >
                <MessageSquare data-icon="inline-start" aria-hidden="true" />
                {t("切换到沟通与素材", "Switch to chat & materials")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}

function ClientOrderHubPage({
  initialView,
}: {
  initialView: "chat" | "review"
}) {
  const current = useOrder()
  const { data, authUser } = useDemo()
  const { t, href, zh } = usePortal()
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [listFilter, setListFilter] = useState<"all" | "review">("all")
  const [search, setSearch] = useState("")
  const [selectedVersionId, setSelectedVersionId] = useState("")
  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.88 }

  const isOwnOrder = (value: Order) =>
    authUser && !authUser.isDemo && value.clientId
      ? value.clientId === authUser.id
      : value.client === data.account.name
  const threads = data.orders.filter(isOwnOrder)
  const order = current && isOwnOrder(current) ? current : threads[0]

  if (!order) return <MissingOrder />

  const pendingReviewCount = threads.filter(
    (item) => item.status === "waiting_confirm"
  ).length
  const keyword = search.trim().toLowerCase()
  const filteredThreads = threads.filter((item) => {
    if (listFilter === "review" && item.status !== "waiting_confirm") {
      return false
    }
    if (!keyword) return true
    return (
      item.id.toLowerCase().includes(keyword) ||
      item.zh.toLowerCase().includes(keyword) ||
      item.en.toLowerCase().includes(keyword)
    )
  })

  function switchOrder(orderId: string) {
    setSelectedVersionId("")
    void navigate(
      href(initialView === "review" ? "video-review" : "order-chat", {
        order: orderId,
      }),
      { replace: true }
    )
  }

  function switchView(nextView: "chat" | "review", versionId?: string) {
    if (versionId !== undefined) setSelectedVersionId(versionId)
    void navigate(
      href(nextView === "review" ? "video-review" : "order-chat", {
        order: order.id,
      }),
      { replace: true }
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-[1440px] min-h-0 flex-1 gap-4 px-5 py-5 sm:px-8 xl:h-[calc(100dvh-3.5rem)] xl:grid-cols-[288px_minmax(0,1fr)]">
      {/* Left: Persistent Client Order Queue Card */}
      <aside className="flex max-h-56 min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs xl:max-h-full">
        <div className="flex flex-col gap-2.5 border-b p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              {t("我的订单", "My orders")}
            </span>
            <LayoutGroup id="client-queue-filter-group">
              <div className="inline-flex rounded-md border border-border bg-muted/50 p-0.5 text-xs">
                {(
                  [
                    {
                      id: "all" as const,
                      label: `${t("全部", "All")} (${threads.length})`,
                    },
                    {
                      id: "review" as const,
                      label: `${t("待确认", "To review")}${pendingReviewCount > 0 ? ` (${pendingReviewCount})` : ""}`,
                    },
                  ] as const
                ).map((item) => {
                  const active = listFilter === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setListFilter(item.id)}
                      className={cn(
                        "relative rounded px-2 py-0.5 font-medium transition-colors duration-200",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="client-queue-filter-pill"
                          aria-hidden="true"
                          transition={springTransition}
                          className="pointer-events-none absolute inset-0 z-0 rounded bg-card shadow-2xs"
                        />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </LayoutGroup>
          </div>
          <InputGroup className="h-8 bg-muted/40">
            <InputGroupAddon>
              <Search aria-hidden="true" className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("筛选项目或订单号…", "Filter projects…")}
              aria-label={t("筛选我的订单", "Filter my orders")}
              className="text-xs"
            />
          </InputGroup>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <LayoutGroup id="client-order-threads-group">
            <div className="flex flex-col divide-y">
              {filteredThreads.map((item) => {
                const isSelected = item.id === order.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isSelected ? "page" : undefined}
                    onClick={() => switchOrder(item.id)}
                    className={cn(
                      "relative flex w-full flex-col gap-1.5 px-3.5 py-3 text-left transition-colors duration-200",
                      !isSelected && "hover:bg-muted/50"
                    )}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="client-order-thread-active"
                        aria-hidden="true"
                        transition={springTransition}
                        className="pointer-events-none absolute inset-0 z-0 bg-accent/65"
                      >
                        <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
                      </motion.span>
                    )}
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        #{item.id}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {zh ? item.zh : item.en}
                      </span>
                      {item.versions.length > 0 && (
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {t(
                            `${item.versions.length} 版`,
                            `v${item.versions.length}`
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
              {filteredThreads.length === 0 && (
                <p className="p-6 text-center text-xs text-muted-foreground">
                  {listFilter === "review"
                    ? t("当前没有待确认的视频", "No videos awaiting review")
                    : t("没有匹配的订单", "No matching orders")}
                </p>
              )}
            </div>
          </LayoutGroup>
        </ScrollArea>
      </aside>

      {/* Right: Unified Order Context Header + Switchable Chat / Review Panel Card */}
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <EditableOrderTitle key={order.id} order={order} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">#{order.id}</span>
              <span>·</span>
              <span>
                {t(`${order.count} 条配额`, `${order.count} credit(s)`)}
              </span>
              {order.owner && (
                <>
                  <span>·</span>
                  <span>
                    {t(`制作师 ${order.owner}`, `Producer ${order.owner}`)}
                  </span>
                </>
              )}
            </div>
          </div>

          <LayoutGroup id="client-hub-view-group">
            <div
              role="tablist"
              aria-label={t("订单工作区视图", "Order workspace view")}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/50 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={initialView === "chat"}
                onClick={() => switchView("chat")}
                className={cn(
                  "relative inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors duration-200",
                  initialView === "chat"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {initialView === "chat" && (
                  <motion.span
                    layoutId="client-hub-view-pill"
                    aria-hidden="true"
                    transition={springTransition}
                    className="pointer-events-none absolute inset-0 z-0 rounded-md bg-card shadow-2xs"
                  />
                )}
                <MessageSquare
                  aria-hidden="true"
                  className="relative z-10 size-3.5"
                />
                <span className="relative z-10">
                  {t("沟通与素材", "Chat & materials")}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={initialView === "review"}
                onClick={() => switchView("review")}
                className={cn(
                  "relative inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors duration-200",
                  initialView === "review"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {initialView === "review" && (
                  <motion.span
                    layoutId="client-hub-view-pill"
                    aria-hidden="true"
                    transition={springTransition}
                    className="pointer-events-none absolute inset-0 z-0 rounded-md bg-card shadow-2xs"
                  />
                )}
                <Film aria-hidden="true" className="relative z-10 size-3.5" />
                <span className="relative z-10">
                  {t("视频审片", "Video review")}
                </span>
                {order.status === "waiting_confirm" ? (
                  <span className="relative z-10 rounded-full bg-brand-gold px-1.5 py-0 text-[10px] font-semibold text-amber-950">
                    {t("待确认", "Review")}
                  </span>
                ) : (
                  order.versions.length > 0 && (
                    <span className="relative z-10 font-mono text-[11px] text-muted-foreground">
                      {order.versions.length}
                    </span>
                  )
                )}
              </button>
            </div>
          </LayoutGroup>
        </div>

        <motion.div
          key={`${order.id}:${initialView}`}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          {initialView === "chat" ? (
            <ChatPanel
              key={order.id}
              order={order}
              side="client"
              compactHeader
              onOpenReview={(versionId) => switchView("review", versionId)}
            />
          ) : (
            <ReviewPanel
              key={order.id}
              order={order}
              selectedVersionId={selectedVersionId}
              onSelectVersion={setSelectedVersionId}
              onOpenChat={() => switchView("chat")}
            />
          )}
        </motion.div>
      </main>
    </div>
  )
}

export function ClientOrderHubRoute() {
  const { pathname } = useLocation()
  const view: "chat" | "review" = pathname.includes("/video-review")
    ? "review"
    : "chat"
  return <ClientOrderHubPage initialView={view} />
}

export function OrderChatPage() {
  return <ClientOrderHubPage initialView="chat" />
}

export function VideoReviewPage() {
  return <ClientOrderHubPage initialView="review" />
}

export function StudioWorkspacePage() {
  const [query, setQuery] = useSearchParams()
  const { t, zh } = usePortal()
  const { data, startOrderProduction, publishOrderVersion } = useDemo()
  const { member, can } = useTeamAuth()
  const prefersReducedMotion = useReducedMotion()
  const studioSpring = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.88 }
  const [kind, setKind] = useState<"preview" | "final">("preview")
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [itemTitle, setItemTitle] = useState("")
  const [extraSlots, setExtraSlots] = useState(0)
  const [confirmFinalOpen, setConfirmFinalOpen] = useState(false)
  const [queueFilter, setQueueFilter] = useState<"open" | "all">("open")
  const [queueSearch, setQueueSearch] = useState("")

  const canWork = can("production:work")
  const canViewAll = can("orders:view_all")
  const hasFinalPerm = can("production:deliver_final")

  const accessibleOrders = canViewAll
    ? data.orders
    : data.orders.filter((value) => value.owner === member?.name)

  const requestedOrderId = query.get("order")
  const current =
    accessibleOrders.find((value) => value.id === requestedOrderId) ??
    accessibleOrders[0]

  if (!canWork || !current) {
    return (
      <TeamConsoleLayout
        activeNav="production"
        heading={<h1>{t("制作协同", "Studio inbox")}</h1>}
      >
        <MissingOrder team />
      </TeamConsoleLayout>
    )
  }

  const queueOrders = accessibleOrders.filter((item) => {
    if (queueFilter === "open" && item.status === "completed") return false
    const q = queueSearch.trim().toLowerCase()
    if (!q) return true
    return (
      item.id.toLowerCase().includes(q) ||
      item.client.toLowerCase().includes(q) ||
      item.zh.toLowerCase().includes(q) ||
      item.en.toLowerCase().includes(q)
    )
  })

  function selectOrder(orderId: string) {
    const params = new URLSearchParams(query)
    params.set("order", orderId)
    setQuery(params, { replace: true })
    setNote("")
    setFiles([])
    setSelectedSlot(null)
    setItemTitle("")
    setExtraSlots(0)
    setUploadPercent(0)
  }

  const order = current
  const existingSlots = getOrderDeliverableSlots(order)
  const maxExistingIndex = existingSlots.reduce(
    (max, slot) => Math.max(max, slot.index),
    1
  )
  const totalSlots = maxExistingIndex + extraSlots
  const slots = Array.from({ length: totalSlots }, (_, idx) => {
    const index = idx + 1
    const existing = existingSlots.find((s) => s.index === index)
    return (
      existing ?? {
        index,
        title: "",
        versions: [],
        hasFinal: false,
      }
    )
  })
  const isMultiVideo = slots.length > 1
  const defaultSlotIndex =
    slots.find((slot) => !slot.hasFinal)?.index ?? slots.at(-1)?.index ?? 1
  const activeSlotIndex =
    selectedSlot && selectedSlot <= totalSlots ? selectedSlot : defaultSlotIndex
  const activeSlotMeta = slots.find((slot) => slot.index === activeSlotIndex)
  const effectiveKind: "preview" | "final" =
    kind === "final" && hasFinalPerm ? "final" : "preview"
  const attachments = order.entries
    .filter((entry) => entry.side === "client")
    .flatMap(entryAttachments)
  const totalMaterialCount =
    attachments.length +
    (order.demo && order.id === sampleOrder ? sampleMaterials.length : 0)
  const canDeliver = hasFinalPerm
  const file = files[0]

  function startProduction() {
    if (order.status !== "waiting_assets") return
    void startOrderProduction(
      order.id,
      t(
        "素材已核对完整，已进入视频制作阶段。",
        "Materials confirmed. Your video is now in production."
      )
    ).then((ok) => {
      if (ok) {
        toast.success(
          t("订单已推进为「制作中」。", "Order moved to In Production.")
        )
      } else {
        toast.error(
          t("状态推进失败，请稍后重试。", "Could not update order status.")
        )
      }
    })
  }

  async function publishVersion() {
    if (busy || (effectiveKind === "final" && !canDeliver)) return
    setBusy(true)
    setUploadPercent(file ? 5 : 0)
    try {
      const uploaded = file
        ? (
          await uploadOrderFiles(order.id, "videos", [file], {
            localOnly: Boolean(order.demo),
            onProgress: (percent) => setUploadPercent(percent),
          })
        )[0]
        : undefined
      const fileId = uploaded?.fileId
      const resolvedTitle = itemTitle.trim() || activeSlotMeta?.title || undefined
      const version: Version = buildNextVersionForItem(
        order,
        activeSlotIndex,
        effectiveKind,
        {
          note: note.trim(),
          file: uploaded?.name ?? file?.name,
          fileId,
          itemTitle: resolvedTitle,
        }
      )
      const prefixZh = isMultiVideo ? `第 ${activeSlotIndex} 条` : ""
      const prefixEn = isMultiVideo ? `Video #${activeSlotIndex} ` : ""
      const messageText =
        effectiveKind === "final"
          ? t(
              `${prefixZh}正式成片已交付。`,
              `${prefixEn}final video has been delivered.`
            )
          : t(
              `${prefixZh}新的预览已上传，请审片。`,
              `${prefixEn}new draft is ready for review.`
            )
      const ok = await publishOrderVersion(order.id, version, messageText)
      if (!ok) throw new Error("Publish failed")
      setNote("")
      setFiles([])
      setItemTitle("")
      setUploadPercent(0)
      toast.success(
        effectiveKind === "final"
          ? t(
              `${prefixZh}正式成片已交付至客户工作台。`,
              `${prefixEn}final delivery published.`
            )
          : t(
              `${prefixZh}初稿已推送至客户审片页。`,
              `${prefixEn}draft is ready in the client review page.`
            )
      )
    } catch {
      toast.error(
        t(
          "版本暂时未能上传成功，请稍后重试。",
          "Couldn't upload this version right now. Please try again."
        )
      )
    } finally {
      setBusy(false)
      setUploadPercent(0)
    }
  }

  function handlePublishSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (effectiveKind === "final") {
      if (canDeliver) setConfirmFinalOpen(true)
      return
    }
    void publishVersion()
  }

  async function packageMaterials() {
    try {
      const content: Record<string, Uint8Array> = {}
      if (order.demo && order.id === sampleOrder) {
        const samples = await Promise.all(
          sampleMaterials.map(async (item) => {
            const response = await fetch(item.src)
            if (!response.ok) throw new Error("Sample unavailable")
            return [
              zh ? item.zh : item.en,
              new Uint8Array(await response.arrayBuffer()),
            ] as const
          })
        )
        Object.assign(content, Object.fromEntries(samples))
      }
      for (const attachment of attachments) {
        const bytes = await fetchFileBytes(attachment.fileId)
        if (!bytes) continue
        const cleanName = attachment.name.replace(/[/\\]/g, "_")
        const uniqueName = Object.hasOwn(content, cleanName)
          ? `${attachment.fileId.slice(-8)}-${cleanName}`
          : cleanName
        content[uniqueName] = bytes
      }
      const { zip } = await import("fflate")
      const result = await new Promise<Uint8Array<ArrayBuffer>>(
        (resolve, reject) =>
          zip(content, { level: 0 }, (error, bytes) => {
            if (error) reject(error)
            else resolve(new Uint8Array(bytes))
          })
      )
      downloadFile(
        new Blob([result], { type: "application/zip" }),
        `${order.id}-materials.zip`
      )
      toast.success(t("素材包已生成并开始下载。", "Materials ZIP downloaded."))
    } catch {
      toast.error(
        t(
          "素材打包暂时遇到问题，请稍后重试。",
          "Couldn't prepare the materials ZIP right now. Please try again."
        )
      )
    }
  }

  return (
    <TeamConsoleLayout
      activeNav="production"
      heading={<h1>{t("制作协同", "Production")}</h1>}
    >
      <main className="mx-auto grid w-full max-w-[1440px] min-h-0 flex-1 gap-4 px-5 py-5 sm:px-8 xl:h-[calc(100dvh-3.5rem)] xl:grid-cols-[276px_minmax(0,1fr)_348px]">
        {/* Column 1: Multi-order Inbox Queue Card */}
        <aside className="flex max-h-60 min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs xl:max-h-full">
          <div className="flex flex-col gap-2.5 border-b p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                {t("订单会话队列", "Order queue")}
              </span>
              <LayoutGroup id="studio-queue-filter-group">
                <div className="inline-flex rounded-md border border-border bg-muted/50 p-0.5 text-xs">
                  {(
                    [
                      { id: "open" as const, label: t("待处理", "Open") },
                      { id: "all" as const, label: t("全部", "All") },
                    ] as const
                  ).map((item) => {
                    const active = queueFilter === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setQueueFilter(item.id)}
                        className={cn(
                          "relative rounded px-2 py-0.5 font-medium transition-colors duration-200",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="studio-queue-filter-pill"
                            aria-hidden="true"
                            transition={studioSpring}
                            className="pointer-events-none absolute inset-0 z-0 rounded bg-card shadow-2xs"
                          />
                        )}
                        <span className="relative z-10">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </LayoutGroup>
            </div>
            <InputGroup className="h-8 bg-muted/40">
              <InputGroupAddon>
                <Search aria-hidden="true" className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder={t("筛选订单或客户…", "Filter orders…")}
                aria-label={t("筛选会话队列", "Filter order queue")}
                className="text-xs"
              />
            </InputGroup>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <LayoutGroup id="studio-order-threads-group">
              <div className="flex flex-col divide-y">
                {queueOrders.map((item) => {
                  const isSelected = item.id === order.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectOrder(item.id)}
                      className={cn(
                        "relative flex w-full flex-col gap-1.5 px-3.5 py-3 text-left transition-colors duration-200",
                        !isSelected && "hover:bg-muted/50"
                      )}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="studio-order-thread-active"
                          aria-hidden="true"
                          transition={studioSpring}
                          className="pointer-events-none absolute inset-0 z-0 bg-accent/65"
                        >
                          <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
                        </motion.span>
                      )}
                      <div className="relative z-10 flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          #{item.id}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="relative z-10 flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {canViewAll ? item.client : zh ? item.zh : item.en}
                        </span>
                      </div>
                      {canViewAll && (
                        <span className="relative z-10 truncate text-xs text-muted-foreground">
                          {zh ? item.zh : item.en}
                        </span>
                      )}
                      {item.revision && (
                        <div className="relative z-10 truncate rounded bg-brand-gold/15 px-2 py-0.5 text-xs text-amber-900">
                          {t("有修改意见：", "Revision: ")}
                          {item.revision}
                        </div>
                      )}
                    </button>
                  )
                })}
                {queueOrders.length === 0 && (
                  <p className="p-6 text-center text-xs text-muted-foreground">
                    {t("暂无匹配会话", "No matching threads")}
                  </p>
                )}
              </div>
            </LayoutGroup>
          </ScrollArea>
        </aside>

        {/* Column 2: Active Order Chat Card */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="truncate text-sm font-semibold text-foreground">
                  {order.client}
                </strong>
                <span className="font-mono text-xs text-muted-foreground">
                  #{order.id}
                </span>
              </div>
              <EditableOrderTitle key={order.id} order={order} />
            </div>
            <StatusBadge status={order.status} />
          </div>
          <FadeTransition key={order.id} className="grid min-h-0 flex-1">
            <ChatPanel
              key={order.id}
              order={order}
              side="studio"
              compactHeader
            />
          </FadeTransition>
        </section>

        {/* Column 3: Order Materials & Version Delivery Card */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <span className="text-xs font-semibold text-foreground">
              {t("素材与交付", "Materials & delivery")}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              #{order.id}
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <FadeTransition
              key={order.id}
              className="flex flex-col gap-5 p-4"
            >
              {order.status === "waiting_assets" && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-accent/50 p-3">
                  <span className="text-xs font-medium text-foreground">
                    {t(
                      "收到完整素材后即可开始制作",
                      "Ready to start production?"
                    )}
                  </span>
                  <Button size="xs" onClick={startProduction}>
                    {t("开始制作", "Start production")}
                  </Button>
                </div>
              )}
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold">
                        {t("客户素材汇总", "Client materials")}
                      </h2>
                      <Badge variant="secondary" className="font-mono">
                        {totalMaterialCount}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t(
                        "自动汇总聊天中的全部附件",
                        "Auto-collected from order chat"
                      )}
                    </span>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    disabled={totalMaterialCount === 0}
                    className="h-auto px-0"
                    onClick={() => void packageMaterials()}
                  >
                    <Download data-icon="inline-start" aria-hidden="true" />
                    {t("打包下载", "Download ZIP")}
                  </Button>
                </div>
                {order.demo &&
                  order.id === sampleOrder &&
                  sampleMaterials.map((item) => (
                    <Button
                      key={item.src}
                      asChild
                      variant="outline"
                      className="h-auto justify-between bg-muted/25 px-3 py-2 font-normal"
                    >
                      <a href={item.src} download={zh ? item.zh : item.en}>
                        <span className="truncate text-sm">
                          {zh ? item.zh : item.en}
                        </span>
                        <Download data-icon="inline-end" aria-hidden="true" />
                      </a>
                    </Button>
                  ))}
                {attachments.map((attachment) => (
                  <ChatAttachmentCard
                    key={attachment.fileId}
                    attachment={attachment}
                    compact
                  />
                ))}
                {totalMaterialCount === 0 && (
                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    {t("暂无客户素材", "No materials yet")}
                  </p>
                )}
              </section>

              <Separator />

              <form
                onSubmit={handlePublishSubmit}
                className="flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-sm font-semibold">
                      {t("正式版本推送", "Publish review / final version")}
                    </h2>
                    <span className="text-[11px] text-muted-foreground">
                      {t(
                        "推送至客户审片页并自动更新订单状态",
                        "Publishes to client review & updates order status"
                      )}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground hover:text-foreground"
                    disabled={busy}
                    onClick={() => {
                      const nextIndex = totalSlots + 1
                      setExtraSlots((prev) => prev + 1)
                      setSelectedSlot(nextIndex)
                      setItemTitle("")
                    }}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    {t("新增一条", "Add video")}
                  </Button>
                </div>
                {isMultiVideo && (
                  <div className="flex flex-col gap-2">
                    <Select
                      value={String(activeSlotIndex)}
                      onValueChange={(value) => {
                        const nextIdx = Number(value)
                        setSelectedSlot(nextIdx)
                        const meta = slots.find((s) => s.index === nextIdx)
                        setItemTitle(meta?.title ?? "")
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        aria-label={t("选择交付条数", "Select video slot")}
                        className="w-full bg-background"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {slots.map((slot) => {
                            const statusText = slot.hasFinal
                              ? t("已交付", "Delivered")
                              : slot.versions.length > 0
                                ? t(
                                    `${getVersionCode(slot.versions.at(-1)!)} 审片中`,
                                    `${getVersionCode(slot.versions.at(-1)!)} in review`
                                  )
                                : t("待上传", "Pending")
                            return (
                              <SelectItem
                                key={slot.index}
                                value={String(slot.index)}
                              >
                                {t(`第 ${slot.index} 条`, `Video #${slot.index}`)}
                                {slot.title ? ` · ${slot.title}` : ""} ({statusText})
                              </SelectItem>
                            )
                          })}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Input
                      value={itemTitle}
                      onChange={(event) => setItemTitle(event.target.value)}
                      placeholder={
                        activeSlotMeta?.title ||
                        t(
                          `第 ${activeSlotIndex} 条片名（选填，如：产品开场）`,
                          `Video #${activeSlotIndex} title (optional, e.g. Intro Cut)`
                        )
                      }
                      aria-label={t("视频条目标题", "Video item title")}
                      className="h-8 text-xs"
                    />
                  </div>
                )}
                <Tabs
                  value={effectiveKind}
                  onValueChange={(value) =>
                    setKind(value as "preview" | "final")
                  }
                >
                  <TabsList
                    className={cn(
                      "grid w-full",
                      hasFinalPerm ? "grid-cols-2" : "grid-cols-1"
                    )}
                  >
                    <TabsTrigger value="preview">
                      {t("预览初稿", "Preview draft")}
                    </TabsTrigger>
                    {hasFinalPerm && (
                      <TabsTrigger value="final">
                        {t("正式成片", "Final video")}
                      </TabsTrigger>
                    )}
                  </TabsList>
                </Tabs>

                <FileUpload
                  value={files}
                  onValueChange={(next) => {
                    const candidate = next.slice(-1)[0]
                    if (!candidate) {
                      setFiles([])
                      return
                    }
                    const check = validateOrderFile(candidate, "video")
                    if (!check.ok) {
                      toast.warning(
                        check.reason === "too_large"
                          ? t(
                              `视频超过 ${check.maxMb}MB 上限，请压缩后再上传。`,
                              `Video exceeds the ${check.maxMb}MB limit.`
                            )
                          : t("所选视频文件为空。", "Selected video file is empty.")
                      )
                      return
                    }
                    setFiles([candidate])
                  }}
                  accept="video/*"
                  maxFiles={1}
                  disabled={busy}
                >
                  {file ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-accent/50 px-3 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <Video
                          aria-hidden="true"
                          className="size-4 shrink-0 text-primary"
                        />
                        <span className="truncate font-medium">
                          {file.name}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("移除视频", "Remove video")}
                        onClick={() => setFiles([])}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <FileUploadDropzone className="flex flex-col items-center gap-1.5 rounded-lg border-dashed bg-muted/25 px-3 py-4 text-center">
                      <Upload
                        aria-hidden="true"
                        className="size-4 text-muted-foreground"
                      />
                      <span className="text-xs text-muted-foreground">
                        {t(
                          "拖拽视频到此处，或点击选择文件",
                          "Drag a video here or click to browse"
                        )}
                      </span>
                      <FileUploadTrigger asChild>
                        <Button type="button" variant="outline" size="xs">
                          {t("选择视频文件", "Choose video file")}
                        </Button>
                      </FileUploadTrigger>
                    </FileUploadDropzone>
                  )}
                </FileUpload>

                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("填写版本备注…", "Add a version note…")}
                  aria-label={t("版本备注", "Version note")}
                />

                {busy && uploadPercent > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                      <span>{t("正在上传视频…", "Uploading video…")}</span>
                      <span className="font-mono">{uploadPercent}%</span>
                    </div>
                    <Progress value={uploadPercent} className="h-1.5" />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={busy || (effectiveKind === "final" && !canDeliver)}
                >
                  {busy ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Send data-icon="inline-start" aria-hidden="true" />
                  )}
                  {effectiveKind === "final"
                    ? isMultiVideo
                      ? t(
                          `交付第 ${activeSlotIndex} 条正式成片`,
                          `Deliver Video #${activeSlotIndex} final`
                        )
                      : t("交付正式成片", "Deliver final video")
                    : isMultiVideo
                      ? t(
                          `推送第 ${activeSlotIndex} 条初稿`,
                          `Send Video #${activeSlotIndex} draft`
                        )
                      : t("推送初稿至客户", "Send draft to client")}
                </Button>
              </form>

              <AlertDialog
                open={confirmFinalOpen}
                onOpenChange={setConfirmFinalOpen}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogMedia className="bg-primary/10 text-primary">
                      <Upload aria-hidden="true" />
                    </AlertDialogMedia>
                    <AlertDialogTitle>
                      {isMultiVideo
                        ? t(
                            `确认交付第 ${activeSlotIndex} 条正式成片？`,
                            `Deliver Video #${activeSlotIndex} final now?`
                          )
                        : t("确认交付正式成片？", "Deliver final video now?")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "交付后将向客户开放无水印成片下载；如后续仍需修改或补传新视频，可随时继续推送。",
                        "This unlocks watermark-free final video download for the client. You can still publish additional revisions or videos later if needed."
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("取消", "Cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void publishVersion()}>
                      {t("确认交付", "Confirm delivery")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Separator />

              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold">
                  {t("客户审核意见", "Client review notes")}
                </h2>
                {order.revision ? (
                  <Alert className="border-brand-gold/40 bg-brand-gold/15 text-amber-950">
                    <AlertTriangle
                      aria-hidden="true"
                      className="text-amber-700"
                    />
                    <AlertTitle>
                      {t("客户请求修改", "Revision requested")}
                    </AlertTitle>
                    <AlertDescription className="wrap-anywhere whitespace-pre-wrap text-amber-900">
                      {order.revision}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("暂无修改意见", "No revision notes")}
                  </p>
                )}
              </section>
            </FadeTransition>
          </ScrollArea>
        </aside>
      </main>
    </TeamConsoleLayout>
  )
}
