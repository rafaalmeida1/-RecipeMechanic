"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ReceiptPdfTheme } from "@prisma/client";
import { Check, Loader2, Moon, Sun } from "lucide-react";
import { setReceiptPdfTheme } from "@/server/receipts/actions";
import {
  receiptPdfThemeDescription,
  receiptPdfThemeLabel,
} from "@/lib/receipt-pdf-tokens";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * Miniatura fiel ao PDF: escuro = página preta; claro = fundo papel + faixa escura só no topo.
 */
export function MiniReceiptPreview({ theme }: { theme: ReceiptPdfTheme }) {
  if (theme === "LIGHT") {
    return (
      <div
        className="pointer-events-none aspect-[210/120] w-full overflow-hidden rounded-lg border border-stone-300 bg-[#F5F5F4] p-1.5 text-[4px] leading-tight shadow-inner ring-1 ring-stone-200/80 sm:text-[5px]"
        aria-hidden
      >
        <div className="overflow-hidden rounded-md border border-zinc-800 bg-[#18181B] shadow-md">
          <div className="h-[3px] w-full bg-[#FFD700]" />
          <div className="flex items-start gap-1 px-1.5 py-1">
            <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#FFD700] bg-zinc-800" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="font-bold tracking-[0.15em] text-[#FFD700]">RIBEIROCAR</div>
              <div className="h-[2px] w-[70%] rounded-sm bg-zinc-500" />
              <div className="h-[2px] w-[45%] rounded-sm bg-zinc-600" />
            </div>
          </div>
        </div>
        <div className="mt-1 space-y-1 rounded-md border border-stone-200 bg-white p-1 shadow-sm">
          <div className="flex gap-1">
            <div className="h-[2px] flex-1 rounded-sm bg-stone-300" />
            <div className="h-[2px] w-1/4 rounded-sm bg-stone-200" />
          </div>
          <div className="h-[2px] w-full rounded-sm bg-stone-100" />
        </div>
        <div className="mt-1 overflow-hidden rounded-sm border border-stone-200">
          <div className="flex bg-[#FFD700] py-[3px] font-bold text-stone-950">
            <span className="w-1/4 text-center">T</span>
            <span className="flex-1 text-center">Itens</span>
          </div>
          <div className="border-b border-stone-200 bg-white py-[3px] text-stone-800">
            <span className="block w-full truncate px-1 opacity-90">···</span>
          </div>
          <div className="bg-stone-50 py-[3px] text-stone-800">
            <span className="block w-full truncate px-1 opacity-90">···</span>
          </div>
        </div>
        <div className="mt-1 text-right font-bold text-amber-900">Total</div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none aspect-[210/120] w-full overflow-hidden rounded-lg border border-zinc-600 bg-black p-1.5 text-[4px] leading-tight text-white shadow-inner sm:text-[5px]"
      aria-hidden
    >
      <div className="h-[3px] w-full bg-[#FFD700]" />
      <div className="flex items-start gap-1 px-0.5 py-1">
        <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#FFD700] bg-zinc-900" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="font-bold tracking-[0.15em] text-[#FFD700]">RIBEIROCAR</div>
          <div className="h-[2px] w-[65%] rounded-sm bg-zinc-600" />
          <div className="h-[2px] w-1/2 rounded-sm bg-zinc-700" />
        </div>
      </div>
      <div className="mx-0.5 mt-0.5 space-y-0.5 rounded border border-zinc-600 bg-zinc-950/50 p-1">
        <div className="flex gap-1">
          <div className="h-[2px] flex-1 rounded-sm bg-zinc-600/80" />
          <div className="h-[2px] w-1/4 rounded-sm bg-zinc-700" />
        </div>
      </div>
      <div className="mx-0.5 mt-1 overflow-hidden rounded-sm border border-zinc-700">
        <div className="flex bg-[#FFD700] py-[3px] font-bold text-black">
          <span className="w-1/4 text-center">T</span>
          <span className="flex-1 text-center">Itens</span>
        </div>
        <div className="border-b border-zinc-700 bg-black py-[3px]">
          <span className="block truncate px-1 text-zinc-200">···</span>
        </div>
        <div className="bg-zinc-950 py-[3px]">
          <span className="block truncate px-1 text-zinc-200">···</span>
        </div>
      </div>
      <div className="mx-0.5 mt-1 text-right font-bold text-[#FFD700]">Total</div>
    </div>
  );
}

function ThemeSavingOverlay() {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/75 backdrop-blur-sm"
      role="alert"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-10 py-8 shadow-2xl">
        <Loader2 className="h-11 w-11 animate-spin text-primary" aria-hidden />
        <p className="text-center text-sm font-medium text-foreground">
          Aplicando aparência do PDF…
        </p>
        <p className="text-center text-xs text-muted-foreground">Só um instante</p>
      </div>
    </div>
  );
}

export function ReceiptPdfThemePicker({
  receiptId,
  initialTheme,
  variant = "default",
}: {
  receiptId: string;
  initialTheme: ReceiptPdfTheme;
  /** `compact` na lista do recibo; `default` na tela de conclusão. */
  variant?: "default" | "compact";
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<ReceiptPdfTheme>(initialTheme);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const apply = (next: ReceiptPdfTheme) => {
    if (next === theme) return;
    setTheme(next);
    setErr(null);
    startTransition(async () => {
      const res = await setReceiptPdfTheme(receiptId, next);
      if (!res.ok) {
        setErr("Não foi possível salvar a aparência.");
        setTheme(initialTheme);
        return;
      }
      router.refresh();
    });
  };

  const overlay =
    portalReady && pending && typeof document !== "undefined"
      ? createPortal(<ThemeSavingOverlay />, document.body)
      : null;

  return (
    <div className={cn("relative space-y-3", variant === "compact" && "space-y-2")}>
      {overlay}

      <div className="flex items-start gap-2">
        <div className="mt-0.5 rounded-md bg-primary/15 p-1.5 text-primary">
          {theme === "LIGHT" ? (
            <Sun className="h-4 w-4" aria-hidden />
          ) : (
            <Moon className="h-4 w-4" aria-hidden />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Aparência do PDF</p>
          <p className="text-xs text-muted-foreground">
            Vale só para este recibo. Escolha antes de enviar ou baixar.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          variant === "compact" && "gap-2 sm:grid-cols-2",
        )}
      >
        {(["LIGHT", "DARK"] as const).map((t) => {
          const selected = theme === t;
          return (
            <button
              key={t}
              type="button"
              disabled={pending}
              onClick={() => apply(t)}
              className={cn(
                "group relative rounded-xl border-2 text-left transition-all",
                selected
                  ? "border-primary shadow-md shadow-primary/15 ring-2 ring-primary/20"
                  : "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <Card className="overflow-hidden border-0 bg-transparent p-3 shadow-none">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {receiptPdfThemeLabel(t)}
                  </span>
                  {selected ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <MiniReceiptPreview theme={t} />
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  {receiptPdfThemeDescription(t)}
                </p>
              </Card>
            </button>
          );
        })}
      </div>

      {variant === "default" ? (
        <p className="text-[11px] text-muted-foreground">
          A prévia espelha o estilo do PDF. WhatsApp, e-mail e download seguem a opção marcada com ✓.
        </p>
      ) : null}

      {err ? (
        <p className="text-xs text-destructive" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}

/** Escolha de tema só no aparelho (rascunho offline, sem `receiptId` no servidor). */
export function OfflinePdfThemeChoice({
  value,
  onChange,
}: {
  value: ReceiptPdfTheme;
  onChange: (t: ReceiptPdfTheme) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">Aparência do PDF (rascunho)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["LIGHT", "DARK"] as const).map((t) => {
          const selected = value === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={cn(
                "rounded-xl border-2 p-2 text-left transition-all",
                selected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border/80 hover:border-primary/40",
              )}
            >
              <span className="mb-1 block text-[10px] font-semibold text-foreground">
                {receiptPdfThemeLabel(t)}
              </span>
              <MiniReceiptPreview theme={t} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
