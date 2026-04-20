import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getSmtpTransport(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) {
    throw new Error(
      "SMTP incompleto: defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASSWORD",
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
  return transporter;
}

/** Endereço "From" para Auth.js / Nodemailer (RFC 5322). */
export function getSmtpFrom(): string {
  const email = process.env.SMTP_FROM_EMAIL?.trim();
  if (email) {
    const rawName = process.env.SMTP_FROM_NAME?.trim() || "RIBEIROCAR";
    const name = rawName.replace(/["\r\n]/g, "");
    return `"${name}" <${email}>`;
  }
  const legacy = process.env.EMAIL_FROM?.trim();
  if (legacy) return legacy;
  throw new Error("Defina SMTP_FROM_EMAIL (ou EMAIL_FROM legado).");
}

/** Mensagem amigável para UI (SES sandbox / identidade não verificada, etc.). */
export function smtpErrorToUserMessage(err: unknown): string {
  const e = err as { message?: string; response?: string; responseCode?: number };
  const msg = [e?.responseCode, e?.message, e?.response]
    .filter(Boolean)
    .join(" ");

  if (/554|not verified|Email address is not verified|Message rejected/i.test(msg)) {
    return (
      "O remetente não está verificado no Amazon SES (região sa-east-1). " +
      "No console da AWS: SES → Verified identities — verifique o domínio ou o e-mail usado em SMTP_FROM_EMAIL " +
      "(ex.: no-reply@bitrafa.com.br). Enquanto não verificar, o envio é bloqueado."
    );
  }

  const raw = e?.message ?? String(err);
  return raw.length > 320 ? `${raw.slice(0, 317)}…` : raw;
}

export async function sendHtmlEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}): Promise<void> {
  const transport = getSmtpTransport();
  await transport.sendMail({
    from: getSmtpFrom(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    attachments: opts.attachments,
  });
}
