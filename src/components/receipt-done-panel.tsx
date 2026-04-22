"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Download,
  Mail,
  MessageCircle,
  Pencil,
  PartyPopper,
  Share2,
} from "lucide-react";
import type { ReceiptPdfTheme } from "@prisma/client";
import { sendReceiptPdfEmail } from "@/server/receipts/actions";
import { ReceiptPdfThemePicker } from "@/components/receipt-pdf-theme-picker";
import { formatCentsBRL } from "@/lib/money";
import { formatPlateDisplay } from "@/lib/plate";
import { sharePdfFileFromUrl } from "@/lib/share-pdf-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function pdfFileName(plateNormalized: string, serviceDateISO: string): string {
  const d = new Date(serviceDateISO);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const plate = formatPlateDisplay(plateNormalized).replace(/[^a-zA-Z0-9]/g, "");
  return `RIBEIROCAR-recibo-${plate}-${y}${m}${day}.pdf`;
}

export function ReceiptDonePanel({
  receiptId,
  customerEmail,
  plateNormalized,
  serviceDateISO,
  totalCents,
  clientAmountDueCents,
  pdfUrl,
  pdfTheme,
}: {
  receiptId: string;
  customerEmail: string | null;
  plateNormalized: string;
  serviceDateISO: string;
  /** Soma de todos os itens (informativo, ex.: oficina). */
  totalCents: number;
  /** O que o cliente ainda paga (parcelas e mensagem usam este). */
  clientAmountDueCents: number;
  pdfUrl: string;
  pdfTheme: ReceiptPdfTheme;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [shareBusy, setShareBusy] = useState(false);

  const clientShareMessage = useMemo(() => {
    const plate = formatPlateDisplay(plateNormalized).toUpperCase();
    return `Olá! Segue seu recibo ${plate} Total ${formatCentsBRL(clientAmountDueCents)}. PDF: `;
  }, [plateNormalized, clientAmountDueCents]);

  const waText = useMemo(
    () => encodeURIComponent(clientShareMessage),
    [clientShareMessage],
  );

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const shareMeta = useMemo(
    () => ({
      title: "Recibo RIBEIROCAR",
      text: clientShareMessage,
    }),
    [clientShareMessage],
  );

  const fileName = useMemo(
    () => pdfFileName(plateNormalized, serviceDateISO),
    [plateNormalized, serviceDateISO],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center sm:text-left">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 sm:mx-0">
          <PartyPopper className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Recibo pronto
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:mx-0">
          Envie o <strong className="text-foreground">PDF em anexo</strong> (compartilhar ou
          baixar). A mensagem abaixo usa o <strong className="text-foreground">que o cliente a
          pagar</strong> (e as parcelas de cartão, se houver) — a mesma lógica do PDF.
        </p>
        {clientAmountDueCents !== totalCents ? (
          <p className="mx-auto max-w-md text-xs text-muted-foreground sm:mx-0">
            Soma de todos os itens (referência): {formatCentsBRL(totalCents)}. Na mensagem e no
            total a pagar: {formatCentsBRL(clientAmountDueCents)}.
          </p>
        ) : null}
        <Button variant="outline" className="mx-auto w-full max-w-sm gap-2 sm:mx-0" asChild>
          <Link href={`/receipts/${receiptId}/edit`}>
            <Pencil className="h-4 w-4" />
            Corrigir dados e refazer o recibo
          </Link>
        </Button>
      </header>

      <Card className="border-primary/15 bg-muted/15 p-4 sm:p-6">
        <ReceiptPdfThemePicker receiptId={receiptId} initialTheme={pdfTheme} />
      </Card>

      <Card className="space-y-3 border-primary/10">
        {canNativeShare ? (
          <Button
            type="button"
            className="w-full gap-2"
            loading={shareBusy}
            disabled={shareBusy}
            onClick={async () => {
              setErr(null);
              setMsg(null);
              setShareBusy(true);
              try {
                const result = await sharePdfFileFromUrl(pdfUrl, fileName, shareMeta);
                if (result === "not_supported") {
                  setErr(
                    "Este aparelho não envia o PDF direto pelo menu de compartilhar. Use «Baixar PDF» e anexe no WhatsApp ou em outro app.",
                  );
                }
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Não foi possível compartilhar o PDF.");
              } finally {
                setShareBusy(false);
              }
            }}
          >
            {!shareBusy ? <Share2 className="h-4 w-4" aria-hidden /> : null}
            Compartilhar PDF (WhatsApp, e-mail…)
          </Button>
        ) : null}

        <Button className="w-full gap-2" asChild>
          <a href={pdfUrl} download={fileName}>
            <Download className="h-4 w-4" />
            Baixar PDF no aparelho
          </a>
        </Button>

        <div className="space-y-1.5">
          <Button variant="secondary" className="w-full gap-2" asChild>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp (só texto)
            </a>
          </Button>
          <p className="text-center text-[11px] leading-snug text-muted-foreground sm:text-left">
            O atalho do WhatsApp só preenche a mensagem. Para mandar o arquivo, use «Compartilhar
            PDF» ou baixe e anexe na conversa.
          </p>
        </div>

        {customerEmail ? (
          <div className="rounded-lg border border-border/80 bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-primary" aria-hidden />
              Enviar por e-mail
            </div>
            <p className="mt-1 break-all text-xs text-muted-foreground">{customerEmail}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              O PDF vai como <strong className="text-foreground">anexo</strong> — o cliente não
              precisa clicar em link.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full gap-2"
              loading={pending}
              disabled={pending}
              onClick={() => {
                setErr(null);
                setMsg(null);
                startTransition(async () => {
                  const res = await sendReceiptPdfEmail(receiptId);
                  if (!res.ok) {
                    setErr(res.error);
                    return;
                  }
                  setMsg("E-mail enviado com o PDF em anexo.");
                });
              }}
            >
              {!pending ? <Mail className="h-4 w-4" aria-hidden /> : null}
              Enviar agora
            </Button>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 px-3 py-3 text-center text-sm text-muted-foreground">
            Sem e-mail do cliente neste recibo. No próximo, preencha o e-mail na etapa de dados
            para poder enviar automaticamente.
          </p>
        )}

        {err ? (
          <p
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {err}
          </p>
        ) : null}
        {msg ? (
          <p
            className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground"
            role="status"
          >
            {msg}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
