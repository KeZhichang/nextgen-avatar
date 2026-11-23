import { useRef, useState, type ChangeEvent, type FormEvent } from "react"
import {
  FileText,
  Film,
  Image,
  Mic,
  RotateCcw,
  Send,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { AttachmentAction } from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import {
  FileUpload,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadList,
} from "@/components/ui/file-upload"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChatAttachmentCard } from "./chat-attachment"
import { usePortal, type ChatAttachment, type Entry } from "./demo"
import { uploadOrderFiles } from "./files"

const allFileTypes =
  "image/*,video/*,audio/*,.txt,.doc,.docx,.pdf,.TXT,.DOC,.DOCX,.PDF"

function fileKey(file: File) {
  return JSON.stringify([file.name, file.size, file.lastModified, file.type])
}

type UploadCategory = {
  id: "image" | "audio" | "doc" | "video"
  icon: LucideIcon
  accept: string
  zh: string
  en: string
}

const uploadCategories: UploadCategory[] = [
  {
    id: "image",
    icon: Image,
    accept: "image/*",
    zh: "上传图片 / 人物正面照",
    en: "Upload images / photos",
  },
  {
    id: "audio",
    icon: Mic,
    accept: "audio/*",
    zh: "上传音频 / 干声样本",
    en: "Upload voice / audio",
  },
  {
    id: "doc",
    icon: FileText,
    accept: ".txt,.doc,.docx,.pdf,.TXT,.DOC,.DOCX,.PDF",
    zh: "上传台词 / 文稿",
    en: "Upload scripts / documents",
  },
  {
    id: "video",
    icon: Film,
    accept: "video/*",
    zh: "上传视频素材",
    en: "Upload video clips",
  },
]

export function ChatComposer({
  orderId,
  side,
  localOnly = false,
  onSend,
}: {
  orderId: string
  side: Entry["side"]
  localOnly?: boolean
  onSend: (message: string, attachments?: ChatAttachment[]) => void
}) {
  const { t } = usePortal()
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const sending = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const picker = useRef<HTMLInputElement>(null)

  function mergeFiles(incoming: File[]) {
    if (!incoming.length) return
    setFiles((current) => [
      ...new Map(
        [...current, ...incoming].map((file) => [fileKey(file), file])
      ).values(),
    ])
    setFailed(false)
  }

  function openCategoryPicker(accept: string) {
    if (!picker.current || busy) return
    picker.current.accept = accept
    picker.current.value = ""
    picker.current.click()
  }

  function onPicked(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? [])
    mergeFiles(picked)
    event.target.value = ""
  }

  async function doSend() {
    const text = message.trim()
    if (sending.current || (!text && !files.length)) return

    sending.current = true
    setBusy(true)
    setFailed(false)
    try {
      const uploaded = await uploadOrderFiles(orderId, "attachments", files, {
        localOnly,
      })
      onSend(
        text,
        uploaded.length
          ? uploaded.map((item) => ({
              fileId: item.fileId,
              name: item.name,
              type: item.type,
              size: item.size,
            }))
          : undefined
      )
      setFiles([])
      setMessage("")
    } catch {
      setFailed(true)
      toast.error(
        t(
          "附件暂未发出，内容已为您保留，请点击重试。",
          "Couldn't send right now. Your message and files are kept to retry."
        )
      )
    } finally {
      sending.current = false
      setBusy(false)
      requestAnimationFrame(() => input.current?.focus())
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void doSend()
  }

  return (
    <div className="shrink-0 border-t bg-card px-3 py-2.5 sm:px-4">
      <input
        ref={picker}
        type="file"
        multiple
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onPicked}
      />
      <form className="flex min-w-0 flex-col gap-2" onSubmit={submit}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="toolbar"
            aria-label={t("按类型上传附件", "Upload attachments by type")}
            className="flex items-center gap-0.5"
          >
            {uploadCategories.map((cat) => {
              const Icon = cat.icon
              const label = t(cat.zh, cat.en)
              return (
                <Tooltip key={cat.id}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      aria-label={label}
                      className="text-muted-foreground hover:bg-accent hover:text-primary"
                      onClick={() => openCategoryPicker(cat.accept)}
                    >
                      <Icon aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              )
            })}
            {failed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    className="ml-1 h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void doSend()}
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    {t("重试发送", "Retry")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("重新发送刚才未成功的附件", "Retry failed upload")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {side === "studio" && (
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={busy}
                onClick={() =>
                  onSend(
                    t(
                      "素材已核对完整，我们已开始制作初稿。",
                      "Materials verified. We've started producing your first draft."
                    )
                  )
                }
              >
                {t("素材通过", "Materials approved")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={busy}
                onClick={() =>
                  onSend(
                    t(
                      "正式成片已上传交付，您可在工作台随时播放和下载。",
                      "Your final video has been delivered and is ready in your workspace."
                    )
                  )
                }
              >
                {t("成片已交付", "Delivery notice")}
              </Button>
            </div>
          )}
        </div>

        <FileUpload
          value={files}
          onValueChange={(selected) => {
            setFiles([
              ...new Map(
                selected.map((file) => [fileKey(file), file])
              ).values(),
            ])
            setFailed(false)
          }}
          multiple
          accept={allFileTypes}
          disabled={busy}
          className="min-w-0"
          label={t("附件文件", "Attachment files")}
          onFileReject={(file) =>
            toast.warning(
              t(
                `暂不支持此文件格式：${file.name}`,
                `Unsupported file format: ${file.name}`
              )
            )
          }
        >
          <FileUploadList
            orientation="horizontal"
            className="max-w-full gap-2 py-1 motion-reduce:animate-none"
            aria-label={t("待发送附件", "Attachments ready to send")}
          >
            {files.map((file) => (
              <FileUploadItem
                key={fileKey(file)}
                value={file}
                className="w-40 shrink-0 items-start border-0 p-0 sm:w-44"
              >
                <FileUploadItemMetadata className="sr-only" />
                <ChatAttachmentCard
                  file={file}
                  busy={busy}
                  failed={failed}
                  action={
                    <FileUploadItemDelete asChild>
                      <AttachmentAction
                        variant="secondary"
                        size="icon-sm"
                        aria-label={t(
                          `移除 ${file.name}`,
                          `Remove ${file.name}`
                        )}
                      >
                        <X aria-hidden="true" />
                      </AttachmentAction>
                    </FileUploadItemDelete>
                  }
                />
              </FileUploadItem>
            ))}
          </FileUploadList>

          <InputGroup className="h-10 bg-muted/30 focus-within:bg-card">
            <InputGroupInput
              ref={input}
              value={message}
              readOnly={busy}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                side === "studio"
                  ? t("回复客户…", "Reply to the client…")
                  : t(
                      "输入消息，或通过上方图标上传素材…",
                      "Write a message or upload files above…"
                    )
              }
              aria-label={t("消息", "Message")}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="submit"
                size="sm"
                variant="default"
                disabled={busy || (!message.trim() && !files.length)}
                className="h-7 px-3"
              >
                {busy ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Send data-icon="inline-start" aria-hidden="true" />
                )}
                {busy ? t("发送中", "Sending") : t("发送", "Send")}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </FileUpload>
      </form>
    </div>
  )
}
