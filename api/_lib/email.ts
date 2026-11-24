export type EmailTemplateKind =
  | "order_created"
  | "draft_ready"
  | "revision_requested"
  | "final_delivered"

export type TransactionalEmailInput = {
  to: string
  locale?: "en" | "zh"
  kind: EmailTemplateKind
  orderId: string
  projectTitle: string
  actionUrl: string
  note?: string
  amountDollars?: number
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function renderTransactionalEmail(input: TransactionalEmailInput): {
  subject: string
  html: string
} {
  const zh = input.locale === "zh"
  const orderId = escapeHtml(input.orderId)
  const title = escapeHtml(input.projectTitle)
  const actionUrl = escapeHtml(input.actionUrl)
  const note = input.note ? escapeHtml(input.note) : ""
  const amount =
    typeof input.amountDollars === "number" && input.amountDollars > 0
      ? `$${input.amountDollars.toFixed(2)} USD`
      : ""

  const templates: Record<
    EmailTemplateKind,
    { subject: string; heading: string; lead: string; cta: string }
  > = {
    order_created: {
      subject: zh
        ? `[NextGen Avatar] 订单 #${input.orderId} 已确认，请上传制作素材`
        : `[NextGen Avatar] Order #${input.orderId} confirmed — upload your materials`,
      heading: zh ? "您的数字人视频订单已创建" : "Your avatar video order is confirmed",
      lead: zh
        ? `项目「${title}」（#${orderId}${amount ? ` · ${amount}` : ""}）已付款成功。请前往订单沟通页上传人物正面照、干声样本与口播台词，制作团队将立即排期开工。`
        : `Your project "${title}" (#${orderId}${amount ? ` · ${amount}` : ""}) is paid and active. Upload your photos, voice sample, and script in the order workspace so our studio can begin production.`,
      cta: zh ? "前往上传素材" : "Upload materials",
    },
    draft_ready: {
      subject: zh
        ? `[NextGen Avatar] 初稿已上传，请审片确认 (#${input.orderId})`
        : `[NextGen Avatar] Your preview draft is ready for review (#${input.orderId})`,
      heading: zh ? "新的预览视频等待您审片" : "A new preview version is ready",
      lead: zh
        ? `项目「${title}」（#${orderId}）的最新预览版已上传至您的工作台。请在线播放确认，或直接提交修改意见。`
        : `A new preview for "${title}" (#${orderId}) has been published to your workspace. Watch online to approve or leave revision notes.`,
      cta: zh ? "立即在线审片" : "Review preview now",
    },
    revision_requested: {
      subject: zh
        ? `[NextGen Avatar] 客户提交了修改意见 (#${input.orderId})`
        : `[NextGen Avatar] Revision requested on order #${input.orderId}`,
      heading: zh ? "收到新的客户修改意见" : "Client requested revisions",
      lead: zh
        ? `客户对项目「${title}」（#${orderId}）提交了修订反馈，请制作团队查看并安排更新版本。`
        : `The client submitted revision feedback on "${title}" (#${orderId}). Open the studio inbox to review notes and upload an updated cut.`,
      cta: zh ? "进入制作协同处理" : "Open studio inbox",
    },
    final_delivered: {
      subject: zh
        ? `[NextGen Avatar] 正式无水印成片已交付 (#${input.orderId})`
        : `[NextGen Avatar] Your watermark-free final video is ready (#${input.orderId})`,
      heading: zh ? "正式成片已完成交付" : "Final video delivered",
      lead: zh
        ? `项目「${title}」（#${orderId}）的 1080P 无水印正式成片已上传至工作台，您可随时在线播放或下载保存。`
        : `Your 1080P watermark-free final delivery for "${title}" (#${orderId}) is now available in your workspace for playback and download.`,
      cta: zh ? "查看并下载成片" : "Download final video",
    },
  }

  const copy = templates[input.kind]
  const noteBlock = note
    ? `<div style="margin:16px 0;padding:12px 14px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;font-size:13px;line-height:1.6;">${note}</div>`
    : ""

  const html = `<!doctype html>
<html lang="${zh ? "zh-CN" : "en"}">
  <body style="margin:0;padding:24px;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;">
      <tr>
        <td style="background:#0d1b3e;padding:20px 24px;color:#ffffff;font-weight:700;font-size:16px;letter-spacing:-0.01em;">
          NextGen Avatar
        </td>
      </tr>
      <tr>
        <td style="padding:28px 24px;">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.35;color:#0f172a;">${copy.heading}</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#475569;">${copy.lead}</p>
          ${noteBlock}
          <p style="margin:24px 0 8px;">
            <a href="${actionUrl}" style="display:inline-block;padding:11px 20px;border-radius:8px;background:#1e64f0;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${copy.cta}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          NextGen Avatar Studio · ${zh ? "如有疑问请联系 support@nextgenavatar.com" : "Questions? Contact support@nextgenavatar.com"}
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject: copy.subject, html }
}

export async function sendTransactionalEmail(
  input: TransactionalEmailInput
): Promise<{ sent: boolean; skipped?: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = (
    process.env.MAIL_FROM ||
    process.env.EMAIL_FROM ||
    "NextGen Avatar <support@nextgenavatar.com>"
  ).trim()
  if (!apiKey || !from || !input.to.includes("@")) {
    return { sent: false, skipped: true }
  }

  const { subject, html } = renderTransactionalEmail(input)
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      html,
    }),
  })
  if (!response.ok) {
    return { sent: false }
  }
  const payload = (await response.json().catch(() => ({}))) as { id?: string }
  return { sent: true, id: payload.id }
}
