import { useEffect, useState, type ReactNode } from "react"
import { Download, FileText, Image, Play } from "lucide-react"
import { cn } from "cn"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { usePortal, type ChatAttachment } from "./demo"
import { downloadFile, getFile } from "./files"
import { PortalVideo } from "./video"

export function ChatAttachmentCard({
  file,
  attachment,
  action,
  busy = false,
  failed = false,
  compact = false,
}: (
  | { file: File; attachment?: never }
  | { file?: never; attachment: ChatAttachment }
) & {
  action?: ReactNode
  busy?: boolean
  failed?: boolean
  compact?: boolean
}) {
  const { t } = usePortal()
  const [source, setSource] = useState<{ file: File; url: string } | null>()
  const fileId = attachment?.fileId

  useEffect(() => {
    let active = true
    let url: string | undefined
    const load = file ? Promise.resolve(file) : getFile(fileId!)
    load
      .then((result) => {
        if (!active) return
        if (!result) {
          setSource(null)
          return
        }
        url = URL.createObjectURL(result)
        setSource({ file: result, url })
      })
      .catch(() => {
        if (active) setSource(null)
      })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [file, fileId])

  const name = file?.name ?? attachment!.name
  const type = file?.type || attachment?.type || source?.file.type || ""
  const isImage = type.startsWith("image/")
  const isVideo = type.startsWith("video/")
  const visual = isImage || isVideo
  const stacked = visual && !compact
  const description =
    source === null
      ? t("附件不可用", "Attachment unavailable")
      : isImage
        ? t("图片", "Image")
        : isVideo
          ? t("视频", "Video")
          : t("附件", "Attachment")
  const previewLabel = t(`预览 ${name}`, `Preview ${name}`)
  const downloadLabel = t(`下载 ${name}`, `Download ${name}`)

  return (
    <Dialog>
      <Attachment
        size="sm"
        orientation={stacked ? "vertical" : "horizontal"}
        state={
          source === null || failed
            ? "error"
            : busy
              ? "processing"
              : file
                ? "idle"
                : "done"
        }
        className={cn(
          "w-full min-w-0 gap-0",
          stacked && "has-data-[slot=attachment-content]:w-full"
        )}
      >
        <AttachmentMedia
          variant={visual ? "image" : "icon"}
          className={cn(
            stacked
              ? "aspect-video rounded-b-none group-data-[size=sm]/attachment:w-full"
              : "ms-2"
          )}
        >
          {isImage && source ? (
            <img
              src={source.url}
              alt={name}
              loading="lazy"
              className="h-full object-cover"
            />
          ) : isVideo ? (
            <>
              {source && (
                <video
                  src={source.url + "#t=0.1"}
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  className="size-full object-cover"
                />
              )}
              <span
                className={cn(
                  "absolute grid place-items-center rounded-full bg-brand-navy/80 text-white",
                  compact ? "size-5" : "size-8"
                )}
              >
                <Play
                  className={compact ? "size-3" : "size-4"}
                  fill="currentColor"
                />
              </span>
            </>
          ) : isImage ? (
            <Image />
          ) : (
            <FileText />
          )}
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle title={name}>{name}</AttachmentTitle>
          <AttachmentDescription>{description}</AttachmentDescription>
        </AttachmentContent>
        {(action || attachment) && (
          <AttachmentActions
            className={cn(
              "me-1",
              stacked &&
                "group-data-[orientation=vertical]/attachment:top-2 group-data-[orientation=vertical]/attachment:right-1"
            )}
          >
            {action ?? (
              <AttachmentAction
                type="button"
                variant={stacked ? "secondary" : "ghost"}
                aria-label={downloadLabel}
                disabled={!source}
                onClick={() => {
                  if (source) downloadFile(source.file, name)
                }}
              >
                <Download aria-hidden="true" />
              </AttachmentAction>
            )}
          </AttachmentActions>
        )}
        {visual && (
          <DialogTrigger asChild>
            <AttachmentTrigger
              aria-label={previewLabel}
              disabled={!source}
              className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring"
            />
          </DialogTrigger>
        )}
      </Attachment>
      {visual && source && (
        <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="min-w-0 pe-6">
            <DialogTitle className="wrap-anywhere">{name}</DialogTitle>
            <DialogDescription className="sr-only">
              {previewLabel}
            </DialogDescription>
          </DialogHeader>
          {isImage ? (
            <img
              src={source.url}
              alt={name}
              className="mx-auto max-h-[74dvh] w-full rounded-md object-contain"
            />
          ) : (
            <PortalVideo src={source.url} label={name} />
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
