"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import "react-day-picker/dist/style.css";

/** Interpreta `YYYY-MM-DD` como data local (meia-noite), sem deslocar fuso. */
export function parseIsoToLocalDate(iso: string): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIsoFromLocalDate(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

type Props = {
  id?: string;
  value: string;
  onChange: (isoYyyyMmDd: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Seletor de data com calendário (shadcn) e exibição **dd/MM/aaaa** (pt-BR).
 * Valor externo continua em `YYYY-MM-DD` para o servidor.
 */
export function BrazilianDatePicker({
  id,
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  /** Radix Popover gera IDs no SSR que não batem com o cliente (React 19) — só monta após hidratar. */
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const selected = parseIsoToLocalDate(value);

  const label = selected ? (
    format(selected, "dd/MM/yyyy", { locale: ptBR })
  ) : (
    "Toque para escolher a data"
  );

  if (!mounted) {
    return (
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        className={cn(
          "h-11 w-full justify-start px-3 text-left font-normal",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary" aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-start px-3 text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary" aria-hidden />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto border-border bg-card p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (date) {
              onChange(toIsoFromLocalDate(date));
              setOpen(false);
            }
          }}
          disabled={disabled}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}
