"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Download,
  Mail,
  MessageCircle,
  PartyPopper,
  Share2,
} from "lucide-react";
import { sendReceiptPdfEmail } from "@/server/receipts/actions";
import { formatCentsBRL } from "@/lib/money";
import { formatPlateDisplay } from "@/lib/plate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ReceiptDonePanel({
  receiptId,
  customerEmail,
  plateNormalized,
  serviceDateISO,
  totalCents,
  pdfUrl,
}: {
  receiptId: string;
  customerEmail: string | null;
  plateNormalized: string;
  serviceDateISO: string;
  totalCents: number;
  pdfUrl: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const waText = useMemo(() => {
    const d = new Date(serviceDateISO);
    return encodeURIComponent(
      `Olá! Segue seu recibo RIBEIROCAR (${formatPlateDisplay(plateNormalized)} · ${d.toLocaleDateString("pt-BR")}). Total: ${formatCentsBRL(totalCents)}. PDF: ${pdfUrl}`,
    );
  }, [pdfUrl, plateNormalized, serviceDateISO, totalCents]);

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

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
          Envie o PDF para o cliente do jeito que for mais fácil: download, WhatsApp
          ou e-mail (se tiver e-mail cadastrado).
        </p>
      </header>

      <Card className="space-y-3 border-primary/10">
        <Button className="w-full gap-2" asChild>
          <a href={pdfUrl} download>
            <Download className="h-4 w-4" />
            Baixar PDF no aparelho
          </a>
        </Button>

        <Button variant="secondary" className="w-full gap-2" asChild>
          <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" />
            Enviar por WhatsApp
          </a>
        </Button>

        {canNativeShare ? (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={async () => {
              try {
                await navigator.share({
                  title: "Recibo RIBEIROCAR",
                  text: `Recibo ${formatPlateDisplay(plateNormalized)} — ${formatCentsBRL(totalCents)}`,
                  url: pdfUrl,
                });
              } catch {
                // user cancelled
              }
            }}
          >
            <Share2 className="h-4 w-4" />
            Compartilhar pelo celular
          </Button>
        ) : null}

        {customerEmail ? (
          <div className="rounded-lg border border-border/80 bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-primary" aria-hidden />
              Enviar por e-mail
            </div>
            <p className="mt-1 break-all text-xs text-muted-foreground">{customerEmail}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full gap-2"
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
                  setMsg("E-mail enviado com sucesso.");
                });
              }}
            >
              <Mail className="h-4 w-4" />
              Enviar agora
            </Button>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 px-3 py-3 text-center text-sm text-muted-foreground">
            Sem e-mail do cliente neste recibo. No próximo, preencha o e-mail na etapa
            de dados para poder enviar automaticamente.
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
