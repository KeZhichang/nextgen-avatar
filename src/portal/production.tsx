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
  RotateCcw,
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
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from "@/components/ui/file-upload"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
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
  countDeliveredVideos,
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
  type EntryVersionRef,
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

function VersionRefCard({
  order,
  versionRef,
  hasMultipleDeliverables,
  side,
  onOpenReview,
}: {
  order: Order
  versionRef: EntryVersionRef
  hasMultipleDeliverables: boolean
  side: Entry["side"]
  onOpenReview?: (versionId?: string) => void
}) {
  const { t } = usePortal()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [resolvedUrl, setResolvedUrl] = useState<string | null | undefined>(
    undefined
  )

  const refCode = versionRef.id.replace(/^#\d+-/, "")
  const matchedVersion =
    order.versions.find((v) => v.id === versionRef.id) ??
    order.versions.find(
      (v) =>
        getVersionCode(v) === refCode &&
        (!versionRef.itemIndex ||
          getVersionItemIndex(v) === versionRef.itemIndex)
    )
  const fileId = matchedVersion?.fileId

  useEffect(() => {
    if (!fileId) return
    let active = true
    let revokeFn: (() => void) | undefined
    resolveFileSource(fileId)
      .then((res) => {
        if (!active) {
          res?.revoke?.()
          return
        }
        if (!res) {
          setResolvedUrl(null)
          return
        }
        revokeFn = res.revoke
        setResolvedUrl(res.url)
      })
      .catch(() => {
        if (active) setResolvedUrl(null)
      })
    return () => {
      active = false
      revokeFn?.()
    }
  }, [fileId, retryCount])

  const label = formatVersionLabel(
    versionRef.id,
    versionRef.type,
    t,
    versionRef.itemIndex,
    hasMultipleDeliverables
  )
  const badgeText =
    versionRef.type === "final" ? "FINAL" : refCode.toUpperCase()
  const videoSrc = fileId ? (resolvedUrl ?? undefined) : sampleVideo
  const canDownload = side === "studio" || versionRef.type === "final"

  async function handleDownload() {
    try {
      await downloadOrderFile(
        fileId,
        sampleVideo,
        matchedVersion?.file ?? `${order.id}-${refCode}.mp4`
      )
      toast.success(t("开始下载视频", "Downloading video"))
    } catch {
      toast.error(
        t(
          "当前视频暂不可下载，请稍后重试。",
          "This video is temporarily unavailable. Please try again."
        )
      )
    }
  }

  return (
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <div className="mt-1.5 flex w-80 max-w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-2xs">
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={t(`预览 ${label}`, `Preview ${label}`)}
            className="group relative h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-brand-navy text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {videoSrc ? (
              <video
                src={`${videoSrc}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                aria-hidden="true"
                className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <img
                src={coverImage}
                alt=""
                className="size-full object-cover opacity-80"
              />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-navy/85 text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
                <Play aria-hidden="true" className="size-3.5 fill-current" />
              </span>
            </span>
          </button>
        </DialogTrigger>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-foreground">
              {label}
            </span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 font-mono text-[10px]"
            >
              {badgeText}
            </Badge>
          </div>
          {versionRef.note && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {versionRef.note}
            </p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {onOpenReview ? (
              <>
                <Button
                  type="button"
                  size="xs"
                  variant={
                    versionRef.type === "preview" &&
                    order.status === "waiting_confirm"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => onOpenReview(versionRef.id)}
                >
                  {versionRef.type === "final"
                    ? t("查看并下载成片", "View & download")
                    : order.status === "waiting_confirm"
                      ? t("去审片 / 提意见", "Review & feedback")
                      : t("查看该版本", "View version")}
                </Button>
                <DialogTrigger asChild>
                  <Button type="button" size="xs" variant="ghost">
                    <Play data-icon="inline-start" aria-hidden="true" />
                    {t("预览", "Preview")}
                  </Button>
                </DialogTrigger>
              </>
            ) : (
              <DialogTrigger asChild>
                <Button type="button" size="xs" variant="outline">
                  <Play data-icon="inline-start" aria-hidden="true" />
                  {t("预览视频", "Preview video")}
                </Button>
              </DialogTrigger>
            )}
          </div>
        </div>
      </div>

      <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="min-w-0 pe-6">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{label}</span>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {badgeText}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {versionRef.note ||
              t(
                `#${order.id} 交付视频在线预览`,
                `#${order.id} video delivery preview`
              )}
          </DialogDescription>
        </DialogHeader>

        {fileId && resolvedUrl === null ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t(
                "暂时无法加载该视频源，请检查网络或点击重试。",
                "Couldn't load this video right now. Please try again."
              )}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setResolvedUrl(undefined)
                setRetryCount((n) => n + 1)
              }}
            >
              {t("重试加载", "Retry")}
            </Button>
          </div>
        ) : (
          <PortalVideo
            poster={coverImage}
            src={videoSrc}
            label={`${label} · ${badgeText}`}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {matchedVersion?.file ?? `#${order.id}`}
          </span>
          <div className="flex items-center gap-2">
            {canDownload && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleDownload()}
              >
                <Download data-icon="inline-start" aria-hidden="true" />
                {t("下载视频", "Download")}
              </Button>
            )}
            {onOpenReview && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setPreviewOpen(false)
                  onOpenReview(versionRef.id)
                }}
              >
                {versionRef.type === "final"
                  ? t("前往交付页", "Open delivery view")
                  : t("前往审片确认 / 提意见", "Review & feedback")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
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
  const { data, authUser, sendChatMessage } = useDemo()
  const selfTeamMember = data.teamSession
    ? data.teamMembers.find((m) => m.id === data.teamSession)
    : undefined
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
        <MessageScroller className="min-h-0 flex-1">
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
                  const showStudioIdentity = side === "studio" && !client
                  const matchedMember = entry.senderUserId
                    ? data.teamMembers.find(
                        (m) => m.userId === entry.senderUserId
                      )
                    : undefined
                  const isSelfStudio = Boolean(
                    showStudioIdentity &&
                      entry.senderUserId &&
                      authUser?.id &&
                      entry.senderUserId === authUser.id
                  )
                  const studioSenderName = showStudioIdentity
                    ? (entry.senderName ??
                      matchedMember?.name ??
                      (isSelfStudio ? selfTeamMember?.name : undefined) ??
                      t("团队成员", "Team member"))
                    : undefined
                  const studioRoleId = showStudioIdentity
                    ? (entry.senderRoleId ??
                      matchedMember?.roleId ??
                      (isSelfStudio ? selfTeamMember?.roleId : undefined))
                    : undefined
                  const studioRoleLabel =
                    studioRoleId === "admin"
                      ? t("管理员", "Admin")
                      : studioRoleId === "lead"
                        ? t("制作主管", "Lead")
                        : studioRoleId === "producer"
                          ? t("制作人员", "Producer")
                          : t("团队", "Team")
                  const studioAvatarClass =
                    studioRoleId === "admin"
                      ? "bg-brand-navy text-[#ffe8d1]"
                      : studioRoleId === "lead"
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-600 text-white"
                  const studioRoleBadgeClass =
                    studioRoleId === "admin"
                      ? "border-brand-gold/45 bg-brand-gold/15 text-amber-950"
                      : studioRoleId === "lead"
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                  const sender = client
                    ? order.client
                    : (studioSenderName ?? t("制作团队", "Production team"))
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
                          {showStudioIdentity ? (
                            <AvatarFallback
                              className={cn(
                                "text-xs font-semibold",
                                studioAvatarClass
                              )}
                            >
                              {sender.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          ) : (
                            <>
                              <AvatarImage
                                src={client ? clientAvatar : studioImage}
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                              <AvatarFallback>
                                {sender.slice(0, 1)}
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                      </MessageAvatar>
                      <MessageContent>
                        {showStudioIdentity ? (
                          <div className="mb-1 flex items-center justify-end gap-1.5 text-[11px]">
                            <span className="font-medium text-foreground/85">
                              {studioSenderName}
                              {isSelfStudio && (
                                <span className="ml-0.5 text-muted-foreground">
                                  {t("（我）", " (You)")}
                                </span>
                              )}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium leading-4",
                                studioRoleBadgeClass
                              )}
                            >
                              {studioRoleLabel}
                            </span>
                          </div>
                        ) : (
                          <span className="sr-only">{sender}</span>
                        )}
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
                          <VersionRefCard
                            order={order}
                            versionRef={entry.versionRef}
                            hasMultipleDeliverables={hasMultipleDeliverables}
                            side={side}
                            onOpenReview={onOpenReview}
                          />
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
  const { submitOrderReview, completeOrder } = useDemo()
  const [revision, setRevision] = useState("")
  const [manualSlot, setManualSlot] = useState<number | null>(null)
  const [completing, setCompleting] = useState(false)

  const slots = getOrderDeliverableSlots(order)
  const isMultiVideo = slots.length > 1
  const deliveredCount = countDeliveredVideos(order)
  const hasAnyFinal = order.versions.some((item) => item.type === "final")
  const canClientComplete = order.status !== "completed" && hasAnyFinal

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

  async function handleClientComplete() {
    if (completing || !canClientComplete) return
    setCompleting(true)
    const ok = await completeOrder(
      order.id,
      "client",
      t(
        "我已确认收到正式成片，订单已办结。",
        "I have received the final video(s) and marked this order as completed."
      )
    )
    setCompleting(false)
    if (ok) {
      toast.success(
        t("订单已办结，您仍可随时在聊天中联系我们。", "Order completed. Chat remains open anytime.")
      )
    } else {
      toast.error(t("办结失败，请稍后重试。", "Could not complete order. Please try again."))
    }
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

          <Card className="gap-0 overflow-hidden shadow-xs lg:sticky lg:top-6 lg:col-span-4">
            <CardHeader className="border-b px-5 pt-4 pb-3.5">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-[15px] font-semibold tracking-tight">
                  <h2>
                    {isMultiVideo
                      ? t(
                          `第 ${activeItemIndex} 条 · 审核与交付`,
                          `Video #${activeItemIndex} · Review`
                        )
                      : t("审核与交付", "Review & delivery")}
                  </h2>
                </CardTitle>
                <StatusBadge status={order.status} />
              </div>
              <CardDescription className="text-xs leading-relaxed">
                {t(
                  "支持多轮修改反馈，确认定稿后将交付 1080P 无水印正式成片。",
                  "Request revisions as needed; approve to unlock your 1080P watermark-free final."
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 px-5 py-4">
              {!selected ? (
                <Alert>
                  <AlertDescription className="text-xs leading-relaxed">
                    {t(
                      `第 ${activeItemIndex} 条暂未上传初稿，可切换至其他已上传条数审片，或前往沟通页补充脚本要求。`,
                      `Video #${activeItemIndex} has no draft yet. Switch to another video slot or share your script in chat.`
                    )}
                  </AlertDescription>
                </Alert>
              ) : selected.type === "final" ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-emerald-950">
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">
                        {isMultiVideo
                          ? t(
                              `第 ${activeItemIndex} 条正式成片已交付`,
                              `Video #${activeItemIndex} final delivered`
                            )
                          : t("正式成片已交付", "Final video delivered")}
                      </span>
                      <p className="text-xs leading-relaxed text-emerald-900/80">
                        {t(
                          "当前为无水印正式交付版本，可随时在线播放或下载保存。",
                          "This is your watermark-free final video. Download it anytime."
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="default"
                    className="w-full"
                    onClick={() => void download()}
                  >
                    <Download data-icon="inline-start" aria-hidden="true" />
                    {t("下载无水印成片", "Download final video")}
                  </Button>
                </div>
              ) : !isLatestPreviewInItem ? (
                <Alert>
                  <AlertDescription className="text-xs leading-relaxed">
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
                    <div className="flex items-start gap-2.5 rounded-xl border border-sky-200/80 bg-sky-50/70 p-3.5 text-sky-950">
                      <CheckCircle2
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-sky-600"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold">
                          {t("您已确认定稿", "Version approved")}
                        </span>
                        <p className="text-xs leading-relaxed text-sky-900/85">
                          {t(
                            "制作团队正在导出无水印正式成片。如仍有临时修改，可在下方补充意见。",
                            "Your team is rendering the watermark-free final video. You can still add notes below if needed."
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.status === "revision" && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-3.5 text-amber-950">
                      <AlertTriangle
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-amber-700"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold">
                          {t("制作团队正在根据意见修改", "Revisions in progress")}
                        </span>
                        <p className="text-xs leading-relaxed text-amber-900/85">
                          {t(
                            "已收到上一轮修改要求，您仍可继续补充细节，或直接确认当前版本。",
                            "Your previous notes were sent. You can add further revisions below or approve this draft."
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {canApprove && (
                    <div className="flex flex-col gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.03] p-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          {t("满意当前版本？", "Happy with this cut?")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(
                            "确认后团队将立即导出无水印正式成片。",
                            "Approving notifies our studio to render your clean final."
                          )}
                        </span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="default" className="w-full shadow-2xs">
                            <CheckCircle2
                              data-icon="inline-start"
                              aria-hidden="true"
                            />
                            {t("确认通过并定稿", "Approve & finalize")}
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

                  {canRequestRevision && (
                    <form
                      onSubmit={requestRevision}
                      className="flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="revision-note"
                          className="text-xs font-semibold text-foreground"
                        >
                          {order.status === "revision" ||
                          order.status === "approved"
                            ? t("补充修改意见", "Add revision notes")
                            : t("需要调整？填写修改意见", "Request revisions")}
                        </label>
                        <span className="text-[11px] text-muted-foreground">
                          {t("支持多条时间点", "Multi-point notes")}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {[
                          {
                            label: t("+ 时间点", "+ Timecode"),
                            snippet: "00:00 ",
                          },
                          {
                            label: t("+ 语速/口型", "+ Pacing"),
                            snippet: t("00:00 语速/口型：", "00:00 Pacing: "),
                          },
                          {
                            label: t("+ 字幕/画面", "+ Visuals"),
                            snippet: t("00:00 字幕/画面：", "00:00 Visuals: "),
                          },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => {
                              setRevision((curr) => {
                                const clean = curr.trimEnd()
                                return clean
                                  ? `${clean}\n${chip.snippet}`
                                  : chip.snippet
                              })
                              requestAnimationFrame(() =>
                                document.getElementById("revision-note")?.focus()
                              )
                            }}
                            className="inline-flex items-center rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>

                      <InputGroup className="overflow-hidden rounded-xl border-border/90 bg-background shadow-2xs">
                        <ScrollArea className="max-h-64 w-full">
                          <InputGroupTextarea
                            id="revision-note"
                            rows={6}
                            placeholder={t(
                              "按时间点逐条写下调整建议，例如：\n00:12 开场语速可以稍微放缓一点\n00:36 字幕颜色换成浅金色更清晰…",
                              "List changes by timecode, e.g.:\n00:12 Slow down the opening pacing slightly\n00:36 Make the lower-third caption higher contrast…"
                            )}
                            value={revision}
                            onChange={(event) => setRevision(event.target.value)}
                            onKeyDown={(event) => {
                              if (
                                (event.metaKey || event.ctrlKey) &&
                                event.key === "Enter" &&
                                revision.trim()
                              ) {
                                event.preventDefault()
                                event.currentTarget.form?.requestSubmit()
                              }
                            }}
                            className="min-h-40 w-full overflow-hidden px-3.5 pt-3 pb-2 text-sm leading-relaxed"
                          />
                        </ScrollArea>
                        <InputGroupAddon
                          align="block-end"
                          className="justify-between border-t border-border/60 bg-muted/25 px-3 py-2"
                        >
                          <InputGroupText className="text-[11px] text-muted-foreground">
                            {revision.trim().length > 0
                              ? t(
                                  `已输入 ${revision.trim().length} 字`,
                                  `${revision.trim().length} chars`
                                )
                              : t("Ctrl + Enter 快速提交", "Ctrl + Enter to send")}
                          </InputGroupText>
                          <InputGroupButton
                            type="submit"
                            size="sm"
                            variant={revision.trim() ? "default" : "secondary"}
                            disabled={!revision.trim()}
                            className="h-7 px-3 text-xs font-medium"
                          >
                            <Send
                              data-icon="inline-start"
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            {t("提交修改意见", "Send notes")}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </form>
                  )}
                </>
              )}

              {canClientComplete && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-3.5 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs font-semibold text-emerald-950">
                      {t("全部成片满意？", "Satisfied with delivery?")}
                    </span>
                    <span className="text-[11px] text-emerald-900/75">
                      {t(
                        `已交付 ${deliveredCount} / ${order.count} 条 · 办结后仍可沟通`,
                        `Delivered ${deliveredCount}/${order.count} · Chat stays open`
                      )}
                    </span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={completing}
                        className="shrink-0 border-emerald-300 bg-background text-emerald-800 hover:bg-emerald-50"
                      >
                        <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
                        {t("办结订单", "Complete order")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogMedia className="bg-emerald-100 text-emerald-700">
                          <CheckCircle2 aria-hidden="true" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>
                          {t("确认办结此订单？", "Mark this order as completed?")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t(
                            `当前已交付 ${deliveredCount} / ${order.count} 条正式成片。办结后订单将归档为「已交付」，但聊天沟通与成片下载依然随时开放。`,
                            `${deliveredCount} of ${order.count} final video(s) delivered. Completing archives the order, while chat and downloads stay available anytime.`
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("取消", "Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleClientComplete()}>
                          {t("确认办结", "Confirm completion")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {order.status === "completed" && (
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  {t(
                    "订单已办结归档；如后续有售后疑问，仍可随时在聊天窗口中联系制作团队。",
                    "Order is completed. Chat remains open if you ever need follow-up support."
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="justify-between gap-2 border-t bg-muted/25 px-5 py-3">
              <span className="text-xs text-muted-foreground">
                {t("需要补传素材或实时讨论？", "Need to share files or chat?")}
              </span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="shrink-0 bg-background"
                onClick={onOpenChat}
              >
                <MessageSquare data-icon="inline-start" aria-hidden="true" />
                {t("前往沟通", "Open chat")}
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
    <div className="mx-auto grid w-full max-w-[1440px] min-h-0 flex-1 gap-4 px-5 py-5 sm:px-8 xl:h-[calc(100dvh-3.5rem)] xl:max-h-[calc(100dvh-3.5rem)] xl:flex-none xl:grid-cols-[288px_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
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

function StudioVersionHistoryItem({
  orderId,
  version,
  showItemPrefix,
}: {
  orderId: string
  version: Version
  showItemPrefix: boolean
}) {
  const { t } = usePortal()
  const [open, setOpen] = useState(false)
  const [resolvedUrl, setResolvedUrl] = useState<string | null | undefined>(
    undefined
  )
  const [retryCount, setRetryCount] = useState(0)
  const fileId = version.fileId

  useEffect(() => {
    if (!open || !fileId) return
    let active = true
    let revokeFn: (() => void) | undefined
    resolveFileSource(fileId)
      .then((res) => {
        if (!active) {
          res?.revoke?.()
          return
        }
        if (!res) {
          setResolvedUrl(null)
          return
        }
        revokeFn = res.revoke
        setResolvedUrl(res.url)
      })
      .catch(() => {
        if (active) setResolvedUrl(null)
      })
    return () => {
      active = false
      revokeFn?.()
    }
  }, [open, fileId, retryCount])

  const code = getVersionCode(version).toUpperCase()
  const itemIdx = getVersionItemIndex(version)
  const label = formatVersionLabel(
    version.id,
    version.type,
    t,
    itemIdx,
    showItemPrefix
  )
  const badgeText = version.type === "final" ? "FINAL" : code
  const videoSrc = fileId ? (resolvedUrl ?? undefined) : sampleVideo

  async function handleDownload() {
    try {
      await downloadOrderFile(
        fileId,
        sampleVideo,
        version.file ?? `${orderId}-${getVersionCode(version)}.mp4`
      )
      toast.success(t("开始下载视频", "Downloading video"))
    } catch {
      toast.error(
        t(
          "当前视频暂不可下载，请稍后重试。",
          "This video is temporarily unavailable."
        )
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/20 px-2.5 py-2 transition-colors hover:bg-muted/40">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-foreground">
              {label}
            </span>
            <Badge
              variant={version.type === "final" ? "default" : "secondary"}
              className={cn(
                "px-1.5 py-0 font-mono text-[10px]",
                version.type === "final" &&
                  "bg-emerald-600 text-white hover:bg-emerald-600"
              )}
            >
              {badgeText}
            </Badge>
          </div>
          {(version.note || version.file) && (
            <span className="truncate text-[11px] text-muted-foreground">
              {version.note || version.file}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={t(`预览 ${label}`, `Preview ${label}`)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Play aria-hidden="true" className="size-3.5" />
            </Button>
          </DialogTrigger>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={t(`下载 ${label}`, `Download ${label}`)}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => void handleDownload()}
          >
            <Download aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      </div>

      <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="min-w-0 pe-6">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{label}</span>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {badgeText}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {version.note ||
              version.file ||
              t(`#${orderId} 已推送版本预览`, `#${orderId} published version preview`)}
          </DialogDescription>
        </DialogHeader>
        {fileId && resolvedUrl === null ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t("暂时无法加载该视频，请重试。", "Couldn't load this video.")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setResolvedUrl(undefined)
                setRetryCount((n) => n + 1)
              }}
            >
              {t("重试加载", "Retry")}
            </Button>
          </div>
        ) : (
          <PortalVideo
            poster={coverImage}
            src={videoSrc}
            label={`${label} · ${badgeText}`}
          />
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {version.file ?? `#${orderId}`}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleDownload()}
          >
            <Download data-icon="inline-start" aria-hidden="true" />
            {t("下载视频", "Download")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function StudioWorkspacePage() {
  const [query, setQuery] = useSearchParams()
  const { t, zh } = usePortal()
  const {
    data,
    startOrderProduction,
    publishOrderVersion,
    completeOrder,
    reopenOrder,
  } = useDemo()
  const { member, can } = useTeamAuth()
  const prefersReducedMotion = useReducedMotion()
  const studioSpring = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.88 }
  const [kind, setKind] = useState<"preview" | "final">("preview")
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
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
  const deliveredCount = countDeliveredVideos(order)
  const requiresVideoFile = !order.demo && !file

  async function handleStudioComplete() {
    if (statusBusy || order.status === "completed") return
    setStatusBusy(true)
    const ok = await completeOrder(
      order.id,
      "studio",
      t(
        "制作团队已将本订单标记为办结；聊天窗口保持开放，如有后续需求欢迎随时联系。",
        "The production team has marked this order as completed. Chat remains open anytime."
      )
    )
    setStatusBusy(false)
    if (ok) {
      toast.success(
        t("订单已标记为办结。", "Order marked as completed.")
      )
    } else {
      toast.error(t("办结失败，请稍后重试。", "Could not complete order."))
    }
  }

  async function handleStudioReopen() {
    if (statusBusy || order.status !== "completed") return
    setStatusBusy(true)
    const ok = await reopenOrder(
      order.id,
      t(
        "制作团队已重新开启本订单，继续为您制作或补充交付。",
        "The production team has reopened this order for further production or delivery."
      )
    )
    setStatusBusy(false)
    if (ok) {
      toast.success(t("订单已重新开启为「制作中」。", "Order reopened."))
    } else {
      toast.error(t("重新开启失败，请稍后重试。", "Could not reopen order."))
    }
  }

  function startProduction() {
    if (order.status !== "waiting_assets" || !order.owner) return
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
    if (busy || requiresVideoFile || (effectiveKind === "final" && !canDeliver))
      return
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
    if (requiresVideoFile) return
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
      <main className="mx-auto grid w-full max-w-[1440px] min-h-0 flex-1 gap-4 px-5 py-5 sm:px-8 xl:h-[calc(100dvh-3.5rem)] xl:max-h-[calc(100dvh-3.5rem)] xl:flex-none xl:grid-cols-[276px_minmax(0,1fr)_348px] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
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
          <FadeTransition
            key={order.id}
            className="flex min-h-0 flex-1 flex-col"
          >
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
                    {order.owner
                      ? t(
                          "收到完整素材后即可开始制作",
                          "Ready to start production?"
                        )
                      : t(
                          "请先在订单管理中指派制作师，再开始制作",
                          "Assign a producer in Orders before starting"
                        )}
                  </span>
                  <Button
                    size="xs"
                    disabled={!order.owner}
                    onClick={startProduction}
                  >
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold">
                        {t("正式版本推送", "Publish review / final version")}
                      </h2>
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0 font-mono text-[10px]"
                      >
                        {t(
                          `成片 ${deliveredCount}/${order.count}`,
                          `${deliveredCount}/${order.count} final`
                        )}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t(
                        "推送至客户审片页；交付成片不会强制关闭聊天",
                        "Publishes to client review without closing chat"
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
                {order.status === "approved" && !hasFinalPerm && (
                  <div className="rounded-lg border border-sky-200/80 bg-sky-50/70 px-3 py-2 text-xs leading-relaxed text-sky-900">
                    {t(
                      "客户已确认定稿。当前账号仅有初稿权限，正式无水印成片需由管理员或具备交付权限的成员上传。",
                      "Client approved this cut. Final watermark-free delivery requires an admin or member with delivery permission."
                    )}
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
                  disabled={
                    busy ||
                    requiresVideoFile ||
                    (effectiveKind === "final" && !canDeliver)
                  }
                >
                  {busy ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Send data-icon="inline-start" aria-hidden="true" />
                  )}
                  {requiresVideoFile
                    ? t("请先选择视频文件", "Choose a video file first")
                    : effectiveKind === "final"
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
                        "交付后将向客户开放无水印成片下载，但不会自动关闭订单或聊天；全部满意后可由任意一方点击「办结订单」。",
                        "This unlocks watermark-free download without closing the order or chat. Either side can mark the order completed when ready."
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

              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">
                      {t("已推送版本", "Published versions")}
                    </h2>
                    <Badge variant="secondary" className="font-mono">
                      {order.versions.length}
                    </Badge>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {t(
                      `配额 ${deliveredCount}/${order.count}`,
                      `${deliveredCount}/${order.count} final`
                    )}
                  </span>
                </div>
                {order.versions.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {[...order.versions].reverse().map((ver) => (
                      <StudioVersionHistoryItem
                        key={ver.id}
                        orderId={order.id}
                        version={ver}
                        showItemPrefix={isMultiVideo || order.count > 1}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    {t("尚未推送任何预览或成片版本", "No versions published yet")}
                  </p>
                )}
              </section>

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

              <Separator />

              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">
                    {t("订单办结状态", "Order completion")}
                  </h2>
                  <StatusBadge status={order.status} />
                </div>
                {order.status === "completed" ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/25 p-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(
                        "本订单已办结归档，聊天通道依然保持开放。如需继续返工或补传视频，可随时重新开启。",
                        "This order is completed while chat stays open. Reopen it anytime for additional work."
                      )}
                    </p>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={statusBusy}
                      className="w-full bg-background"
                      onClick={() => void handleStudioReopen()}
                    >
                      <RotateCcw data-icon="inline-start" aria-hidden="true" />
                      {t("重新开启订单", "Reopen order")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/20 p-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(
                        `已交付 ${deliveredCount} / ${order.count} 条正式成片。全部确认无误后可手动办结，聊天沟通不会被关闭。`,
                        `${deliveredCount}/${order.count} final video(s) delivered. Complete manually when finished; chat stays open.`
                      )}
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={statusBusy}
                          className="w-full bg-background"
                        >
                          <CheckCircle2
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          {t("手动办结订单", "Mark order completed")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogMedia className="bg-emerald-100 text-emerald-700">
                            <CheckCircle2 aria-hidden="true" />
                          </AlertDialogMedia>
                          <AlertDialogTitle>
                            {t("确认将此订单标记为已办结？", "Mark this order completed?")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {deliveredCount < order.count
                              ? t(
                                  `当前仅交付了 ${deliveredCount} / ${order.count} 条正式成片。确认仍要提前办结吗？办结后聊天仍保持开放，也可随时重新开启。`,
                                  `Only ${deliveredCount} of ${order.count} final video(s) have been delivered. Complete anyway? Chat stays open and you can reopen anytime.`
                                )
                              : t(
                                  `已交付全部 ${deliveredCount} / ${order.count} 条正式成片。办结后订单将归档为「已交付」，聊天沟通仍保持开放。`,
                                  `All ${deliveredCount}/${order.count} final video(s) delivered. Chat will remain open after completion.`
                                )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("取消", "Cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void handleStudioComplete()}>
                            {t("确认办结", "Confirm completion")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </section>
            </FadeTransition>
          </ScrollArea>
        </aside>
      </main>
    </TeamConsoleLayout>
  )
}
