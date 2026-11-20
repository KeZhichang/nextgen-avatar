import { useEffect, useRef, useState, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  Download,
  FileWarning,
  Film,
  MessageSquare,
  Play,
  Search,
  Send,
  Upload,
  Video,
  X,
} from "lucide-react"
import { zip } from "fflate"
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
import { ScrollArea } from "@/components/ui/scroll-area"
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
  clientImage,
  coverImage,
  entryAttachments,
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
import { downloadFile, getFile, saveFile } from "./files"
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
  const id = query.get("order") ?? sampleOrder
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
  t: (zh: string, en: string) => string
) {
  if (type === "final") return t("正式交付版", "Final delivery")
  if (id === "v1") return t("初稿 v1", "Initial draft v1")
  return t(`修订稿 ${id}`, `Revision ${id}`)
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
  const { sendChatMessage } = useDemo()
  const sample: Entry[] =
    order.id === sampleOrder
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
        "flex min-h-0 min-w-0 flex-1 flex-col bg-background",
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
                  `${latestVersion ? formatVersionLabel(latestVersion.id, latestVersion.type, t) : "最新预览版"}已上传，等待您审片确认或提交修改意见。`,
                  `${latestVersion ? formatVersionLabel(latestVersion.id, latestVersion.type, t) : "Latest draft"} is ready for your approval or revision notes.`
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
              {entries.map((entry) => {
                const own = entry.side === side
                const client = entry.side === "client"
                const sender = client
                  ? order.client
                  : t("制作团队", "Production team")
                const attachments = entryAttachments(entry)
                return (
                  <MessageScrollerItem key={entry.id} messageId={entry.id}>
                    <Message align={own ? "end" : "start"}>
                      <MessageAvatar className="self-start">
                        <Avatar className="size-8">
                          <AvatarImage
                            src={client ? clientImage : studioImage}
                            alt=""
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
                                    t
                                  )}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="px-1.5 py-0 font-mono text-[10px]"
                                >
                                  {entry.versionRef.type === "final"
                                    ? "FINAL"
                                    : entry.versionRef.id.toUpperCase()}
                                </Badge>
                              </div>
                              {entry.versionRef.note && (
                                <p className="line-clamp-1 text-[11px] text-muted-foreground">
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
                  </MessageScrollerItem>
                )
              })}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton
            aria-label={t("跳到最新消息", "Jump to latest message")}
          >
            <ArrowDown aria-hidden="true" />
          </MessageScrollerButton>
        </MessageScroller>
      </MessageScrollerProvider>
      <ChatComposer side={side} onSend={send} />
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
  const [localSrc, setLocalSrc] = useState("")
  const player = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!active) player.current?.querySelector("video")?.pause()
  }, [active])
  useEffect(() => {
    if (!version.fileId) return
    let mounted = true
    let url = ""
    getFile(version.fileId)
      .then((file) => {
        if (file && mounted) {
          url = URL.createObjectURL(file)
          setLocalSrc(url)
        }
      })
      .catch(() => undefined)
    return () => {
      mounted = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [version.fileId])
  return (
    <div
      ref={player}
      className="relative overflow-hidden rounded-xl border border-border bg-brand-navy shadow-xs"
    >
      <PortalVideo
        poster={coverImage}
        src={version.fileId ? localSrc || undefined : sampleVideo}
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

  const latest = order.versions.at(-1)
  const selected =
    order.versions.find((item) => item.id === selectedVersionId) ?? latest
  const canReview = Boolean(
    selected &&
    latest?.id === selected.id &&
    selected.type === "preview" &&
    order.status === "waiting_confirm"
  )

  function approve() {
    if (!canReview) return
    void submitOrderReview(
      order.id,
      "approve",
      t(
        "已确认当前版本，请交付正式成片。",
        "I approved the current version. Please deliver the final video."
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
    if (!clean || !canReview) return
    setRevision("")
    void submitOrderReview(order.id, "revision", clean, clean).then((ok) => {
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
      const file = selected.fileId ? await getFile(selected.fileId) : undefined
      if (selected.fileId && !file) throw new Error("Missing delivery")
      downloadFile(
        file ?? sampleVideo,
        selected.file ?? `${order.id}-final.mp4`
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

  if (!selected) {
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
      <div className="grid items-start gap-6 p-5 sm:p-6 lg:grid-cols-12">
        <Tabs
          value={selected.id}
          onValueChange={onSelectVersion}
          className="min-w-0 gap-4 lg:col-span-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList aria-label={t("视频版本", "Video versions")}>
              {order.versions.map((item) => (
                <TabsTrigger key={item.id} value={item.id}>
                  {formatVersionLabel(item.id, item.type, t)}
                </TabsTrigger>
              ))}
            </TabsList>
            <Badge variant="secondary" className="font-mono text-xs">
              1080P · 60fps
            </Badge>
          </div>
          {order.versions.map((version) => (
            <TabsContent
              key={order.id + version.id}
              value={version.id}
              className="flex min-w-0 flex-col gap-4"
            >
              <VideoPlayer
                version={version}
                active={version.id === selected.id}
                label={
                  version.type === "final" ? "FINAL" : `PREVIEW ${version.id}`
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
          ))}
        </Tabs>

        <Card className="shadow-xs lg:sticky lg:top-6 lg:col-span-4">
          <CardHeader className="border-b">
            <CardTitle>
              <h2>{t("审核与交付", "Review & delivery")}</h2>
            </CardTitle>
            <CardDescription>
              {t(
                "确认无误后将通知团队交付正式无水印成片。",
                "Approve the draft to trigger final watermark-free delivery."
              )}
            </CardDescription>
            <CardAction>
              <StatusBadge status={order.status} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {selected.type === "final" ? (
              <div className="flex flex-col gap-3">
                <Alert className="border-emerald-200 bg-emerald-50/70 text-emerald-950">
                  <CheckCircle2
                    aria-hidden="true"
                    className="text-emerald-600"
                  />
                  <AlertTitle>
                    {t("正式成片已交付", "Final video delivered")}
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
            ) : order.status === "approved" ? (
              <Alert className="border-sky-200 bg-sky-50/70 text-sky-950">
                <CheckCircle2 aria-hidden="true" className="text-sky-600" />
                <AlertTitle>{t("您已确认定稿", "Version approved")}</AlertTitle>
                <AlertDescription className="text-sky-900/85">
                  {t(
                    "制作团队正在导出无水印正式成片，完成后将自动推送至工作台。如有紧急调整，请在「沟通与素材」中联系制作师。",
                    "Your team is rendering the watermark-free final video. For urgent changes, message your producer in Chat."
                  )}
                </AlertDescription>
              </Alert>
            ) : order.status === "revision" ? (
              <Alert className="border-brand-gold/40 bg-brand-gold/10 text-amber-950">
                <AlertTriangle aria-hidden="true" className="text-amber-700" />
                <AlertTitle>
                  {t("制作团队正在根据意见修改", "Revisions in progress")}
                </AlertTitle>
                <AlertDescription className="text-amber-900/85">
                  {t(
                    "已收到您的修改要求，新版初稿上传后会通知您再次审核。补充说明可直接发送至「沟通与素材」。",
                    "Your revision notes have been sent. Add extra context in Chat while the new draft is prepared."
                  )}
                </AlertDescription>
              </Alert>
            ) : !canReview ? (
              <Alert>
                <AlertDescription>
                  {t(
                    "当前正在查看历史版本，请切换至最新版本进行审核或提出修改。",
                    "You are viewing an older draft. Switch to the latest version to approve or request changes."
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <>
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
                        <AlertDialogTitle>
                          {t(
                            "确认通过当前初稿？",
                            "Approve this draft version?"
                          )}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t(
                            "确认后将锁定定稿并通知制作团队导出正式无水印成片；如有紧急调整可随时在订单聊天沟通。",
                            "Approving locks this draft so the team can render the watermark-free final video."
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

                <Separator />

                <form onSubmit={requestRevision}>
                  <FieldGroup className="gap-3">
                    <Field>
                      <FieldLabel htmlFor="revision-note">
                        {t("申请修改意见", "Revision notes")}
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
    </ScrollArea>
  )
}

function ClientOrderHubPage({
  initialView,
}: {
  initialView: "chat" | "review"
}) {
  const current = useOrder()
  const { data } = useDemo()
  const { t, href, zh } = usePortal()
  const navigate = useNavigate()
  const [listFilter, setListFilter] = useState<"all" | "review">("all")
  const [search, setSearch] = useState("")
  const [selectedVersionId, setSelectedVersionId] = useState("")

  const threads = data.orders.filter(
    (value) => value.client === data.account.name
  )
  const order =
    current && current.client === data.account.name ? current : threads[0]

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
    <div className="flex min-h-0 flex-1 flex-col xl:h-[calc(100dvh-3.5rem)] xl:flex-row">
      {/* Left: Persistent Client Order Queue */}
      <aside className="flex max-h-52 min-h-0 shrink-0 flex-col border-b bg-card xl:max-h-full xl:w-80 xl:border-r xl:border-b-0">
        <div className="flex flex-col gap-2.5 border-b p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              {t("我的订单", "My orders")}
            </span>
            <div className="inline-flex rounded-md border border-border bg-muted/50 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setListFilter("all")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  listFilter === "all"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("全部", "All")} ({threads.length})
              </button>
              <button
                type="button"
                onClick={() => setListFilter("review")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  listFilter === "review"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("待确认", "To review")}
                {pendingReviewCount > 0 ? ` (${pendingReviewCount})` : ""}
              </button>
            </div>
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
                    "flex w-full flex-col gap-1.5 border-l-2 px-3.5 py-3 text-left transition-colors hover:bg-muted/50",
                    isSelected
                      ? "border-l-primary bg-accent/60"
                      : "border-l-transparent"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {zh ? item.zh : item.en}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-mono text-[11px]">#{item.id}</span>
                    {item.versions.length > 0 && (
                      <span className="text-[11px]">
                        {t(
                          `${item.versions.length} 个视频版本`,
                          `${item.versions.length} version(s)`
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
        </ScrollArea>
      </aside>

      {/* Right: Unified Order Context Header + Switchable Chat / Review Panel */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5 sm:px-6">
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
                "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                initialView === "chat"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare aria-hidden="true" className="size-3.5" />
              <span>{t("沟通与素材", "Chat & materials")}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={initialView === "review"}
              onClick={() => switchView("review")}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                initialView === "review"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Film aria-hidden="true" className="size-3.5" />
              <span>{t("视频审片", "Video review")}</span>
              {order.status === "waiting_confirm" ? (
                <span className="rounded-full bg-brand-gold px-1.5 py-0 text-[10px] font-semibold text-amber-950">
                  {t("待确认", "Review")}
                </span>
              ) : (
                order.versions.length > 0 && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {order.versions.length}
                  </span>
                )
              )}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
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
        </div>
      </main>
    </div>
  )
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
  const [kind, setKind] = useState<"preview" | "final">("preview")
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
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
  }

  const order = current
  const effectiveKind: "preview" | "final" =
    kind === "final" && hasFinalPerm ? "final" : "preview"
  const attachments = order.entries
    .filter((entry) => entry.side === "client")
    .flatMap(entryAttachments)
  const totalMaterialCount =
    attachments.length + (order.id === sampleOrder ? sampleMaterials.length : 0)
  const canDeliver = hasFinalPerm && order.status === "approved"
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
    if (
      busy ||
      (effectiveKind === "final" && !canDeliver) ||
      order.status === "completed"
    )
      return
    setBusy(true)
    try {
      const fileId = file ? await saveFile(file) : undefined
      const version: Version = {
        id:
          effectiveKind === "final"
            ? "final"
            : `v${order.versions.filter((item) => item.type === "preview").length + 1}`,
        type: effectiveKind,
        note: note.trim(),
        file: file?.name,
        fileId,
      }
      const messageText =
        effectiveKind === "final"
          ? t("正式成片已交付。", "The final video has been delivered.")
          : t("新的预览已上传，请审片。", "A new draft is ready for review.")
      const ok = await publishOrderVersion(order.id, version, messageText)
      if (!ok) throw new Error("Publish failed")
      setNote("")
      setFiles([])
      toast.success(
        effectiveKind === "final"
          ? t("正式成片已交付至客户工作台。", "Final delivery published.")
          : t(
              "初稿已推送至客户审片页。",
              "The draft is ready in the client review page."
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
      if (order.id === sampleOrder) {
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
        const stored = await getFile(attachment.fileId)
        if (!stored) continue
        const cleanName = attachment.name.replace(/[/\\]/g, "_")
        const uniqueName = Object.hasOwn(content, cleanName)
          ? `${attachment.fileId.slice(0, 8)}-${cleanName}`
          : cleanName
        content[uniqueName] = new Uint8Array(await stored.arrayBuffer())
      }
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
      heading={
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate">
            {t("制作协同", "Studio inbox")} ·{" "}
            <span className="font-mono text-xs">#{order.id}</span>
          </span>
          <StatusBadge status={order.status} />
        </div>
      }
    >
      <main className="grid min-h-0 flex-1 xl:h-[calc(100dvh-3.5rem)] xl:grid-cols-12">
        {/* Column 1: Multi-order Inbox Queue */}
        <aside className="flex max-h-56 min-h-0 flex-col border-b bg-card xl:col-span-3 xl:max-h-full xl:border-r xl:border-b-0">
          <div className="flex flex-col gap-2.5 border-b p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                {t("订单会话队列", "Order queue")}
              </span>
              <div className="inline-flex rounded-md border border-border bg-muted/50 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQueueFilter("open")}
                  className={cn(
                    "rounded px-2 py-0.5 font-medium transition-colors",
                    queueFilter === "open"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("待处理", "Open")}
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter("all")}
                  className={cn(
                    "rounded px-2 py-0.5 font-medium transition-colors",
                    queueFilter === "all"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("全部", "All")}
                </button>
              </div>
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
            <div className="flex flex-col divide-y">
              {queueOrders.map((item) => {
                const isSelected = item.id === order.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectOrder(item.id)}
                    className={cn(
                      "flex w-full flex-col gap-1.5 border-l-2 px-3.5 py-3 text-left transition-colors hover:bg-muted/50",
                      isSelected
                        ? "border-l-primary bg-accent/60"
                        : "border-l-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {canViewAll ? item.client : zh ? item.zh : item.en}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {canViewAll ? (zh ? item.zh : item.en) : `#${item.id}`}
                      </span>
                      <span className="shrink-0 font-mono text-[11px]">
                        #{item.id.slice(-4)}
                      </span>
                    </div>
                    {item.revision && (
                      <div className="truncate rounded bg-brand-gold/15 px-2 py-0.5 text-[11px] text-amber-900">
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
          </ScrollArea>
        </aside>

        {/* Column 2: Active Order Chat */}
        <div className="grid min-h-0 xl:col-span-5">
          <FadeTransition key={order.id} className="grid min-h-0">
            <ChatPanel key={order.id} order={order} side="studio" />
          </FadeTransition>
        </div>

        {/* Column 3: Order Materials & Version Delivery */}
        <aside className="flex min-h-0 flex-col border-t bg-card xl:col-span-4 xl:border-t-0 xl:border-l">
          <ScrollArea className="min-h-0 flex-1">
            <FadeTransition
              key={order.id}
              className="flex flex-col gap-5 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/25 px-3.5 py-2.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {t("当前项目名称", "Project name")} ·{" "}
                  <span className="font-mono">#{order.id}</span>
                </span>
                <EditableOrderTitle key={order.id} order={order} />
              </div>
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
                    <span className="text-[11px] text-muted-foreground">
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
                {order.id === sampleOrder &&
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
                  onValueChange={(next) => setFiles(next.slice(-1))}
                  accept="video/*"
                  maxFiles={1}
                  disabled={busy || order.status === "completed"}
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

                <Button
                  type="submit"
                  disabled={
                    busy ||
                    order.status === "completed" ||
                    (effectiveKind === "final" && !canDeliver)
                  }
                >
                  {busy ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Send data-icon="inline-start" aria-hidden="true" />
                  )}
                  {effectiveKind === "final"
                    ? t("交付正式成片", "Deliver final video")
                    : t("推送初稿至客户", "Send draft to client")}
                </Button>

                {effectiveKind === "final" &&
                  !canDeliver &&
                  order.status !== "completed" && (
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "客户确认最新初稿后即可交付。",
                        "Delivery is available after the client approves the latest draft."
                      )}
                    </p>
                  )}
              </form>

              <AlertDialog
                open={confirmFinalOpen}
                onOpenChange={setConfirmFinalOpen}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("确认交付正式成片？", "Deliver final video now?")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "交付后订单状态将变更为「已交付」，并向客户开放无水印成片下载。",
                        "This marks the order as delivered and makes the watermark-free video downloadable in the client workspace."
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
