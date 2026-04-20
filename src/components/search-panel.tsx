"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Search,
  SearchX,
  User,
} from "lucide-react";
import { searchClients } from "@/server/receipts/actions";
import { formatPlateDisplay } from "@/lib/plate";
import { formatCentsBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchResult = Awaited<ReturnType<typeof searchClients>>;

export function SearchPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lastSearched, setLastSearched] = useState<string | null>(null);

  const trimmed = q.trim();
  const canSearch = useMemo(() => trimmed.length >= 2, [trimmed]);
  const tooShort = trimmed.length > 0 && trimmed.length < 2;

  const runSearch = useCallback(() => {
    if (!canSearch) return;
    const query = trimmed;
    setError(null);
    startTransition(async () => {
      try {
        const rows = await searchClients(query);
        setResults(rows);
        setLastSearched(query);
      } catch {
        setResults([]);
        setLastSearched(null);
        setError(
          "Não foi possível concluir a busca. Verifique a internet e tente outra vez.",
        );
      }
    });
  }, [canSearch, trimmed]);

  const showOutcome =
    !pending && lastSearched !== null && lastSearched === trimmed;

  return (
    <Card className="space-y-5 border-border/80">
      <div className="space-y-2">
        <Label htmlFor="q" className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" aria-hidden />
          O que você lembra do cliente?
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Placa, nome, telefone ou e-mail"
            autoComplete="off"
            aria-describedby="search-hint"
            className="min-h-12 flex-1 text-base"
          />
          <Button
            type="button"
            className="h-12 shrink-0 touch-manipulation sm:w-40"
            loading={pending}
            disabled={!canSearch || pending}
            onClick={() => runSearch()}
          >
            {!pending ? <Search className="h-4 w-4" aria-hidden /> : null}
            {pending ? "Buscando…" : "Buscar"}
          </Button>
        </div>
        <p id="search-hint" className="text-xs text-muted-foreground">
          Mínimo <strong className="text-foreground">2 caracteres</strong>. A busca no banco
          só roda quando você toca em <strong className="text-foreground">Buscar</strong> ou
          pressiona <strong className="text-foreground">Enter</strong> — assim não dispara a
          cada letra.
        </p>
      </div>

      {tooShort ? (
        <div
          className="flex gap-3 rounded-lg border border-amber-500/35 bg-amber-950/40 px-4 py-3 text-sm text-amber-50"
          role="status"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          <div>
            <p className="font-medium text-amber-100">Busca muito curta</p>
            <p className="mt-1 text-amber-100/85">
              Digite pelo menos mais um caractere antes de buscar.
            </p>
          </div>
        </div>
      ) : null}

      {canSearch && pending ? (
        <div
          className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-4 text-sm text-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
          <div>
            <p className="font-medium">Buscando no cadastro…</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Comparando com placas, nomes, telefones e e-mails.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-semibold text-destructive">Algo deu errado</p>
            <p className="mt-1 text-destructive/90">{error}</p>
          </div>
        </div>
      ) : null}

      {showOutcome && !error && results.length > 0 ? (
        <div
          className="flex gap-3 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-50"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
          <div>
            <p className="font-semibold text-emerald-100">
              {results.length === 1
                ? "1 cliente encontrado"
                : `${results.length} clientes encontrados`}
            </p>
            <p className="mt-1 text-emerald-100/85">
              Toque no card para abrir o histórico completo.
            </p>
          </div>
        </div>
      ) : null}

      {showOutcome && !error && results.length === 0 ? (
        <div
          className="flex gap-3 rounded-lg border border-border bg-muted/30 px-4 py-5 text-sm"
          role="status"
        >
          <SearchX className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">Nenhum resultado</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Não encontramos ninguém no cadastro para{" "}
              <span className="break-words font-mono text-foreground">
                “{lastSearched}”
              </span>
              .
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>Confira se a placa está certa (com ou sem hífen).</li>
              <li>Tente só o sobrenome ou parte do telefone.</li>
              <li>Se for cliente novo, ainda não haverá cadastro — use Novo recibo.</li>
            </ul>
            <Button variant="secondary" size="sm" className="mt-4" asChild>
              <Link href="/receipts/new">Ir para novo recibo</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {results.map((c) => {
          const plateSummary =
            c.vehicles.length === 0
              ? "Sem veículos"
              : c.vehicles.length <= 2
                ? c.vehicles.map((v) => formatPlateDisplay(v.plateNormalized)).join(" · ")
                : `${c.vehicles.length} veículos cadastrados`;

          return (
            <div
              key={c.id}
              className="overflow-hidden rounded-xl border border-border/80 bg-muted/20"
            >
              <Link
                href={`/customers/${c.id}`}
                className="flex min-h-[4.5rem] items-start gap-3 p-4 transition-colors hover:bg-muted/35 active:bg-muted/45"
              >
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-sm">
                  <User className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold text-foreground">{c.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c.phone ? `Tel: ${c.phone}` : null}
                        {c.phone && c.email ? " · " : null}
                        {c.email ? c.email : null}
                        {!c.phone && !c.email ? "Sem telefone/e-mail" : null}
                      </div>
                      <div className="mt-2 text-xs font-medium text-primary">{plateSummary}</div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                  <span className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4">
                    Abrir histórico completo do cliente
                  </span>
                </div>
              </Link>

              {c.vehicles.length === 0 ? (
                <div
                  className="border-t border-border/50 px-4 py-3 text-center text-xs text-muted-foreground"
                  role="status"
                >
                  Este cliente ainda não tem veículo cadastrado no sistema.
                </div>
              ) : (
                <div className="space-y-2 border-t border-border/50 px-4 pb-4 pt-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Último serviço finalizado por veículo
                  </p>
                  {c.vehicles.map((v) => {
                    const last = v.receipts[0];
                    return (
                      <div
                        key={v.id}
                        className="rounded-lg border border-border/60 bg-card/80 p-3 text-left shadow-sm"
                      >
                        <div className="text-sm font-medium text-foreground">
                          {v.label}{" "}
                          <span className="font-normal text-muted-foreground">
                            · {formatPlateDisplay(v.plateNormalized)}
                          </span>
                        </div>
                        {last ? (
                          <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                            <div>
                              Data:{" "}
                              <span className="font-medium text-foreground">
                                {last.serviceDate.toLocaleDateString("pt-BR")}
                              </span>{" "}
                              · Total{" "}
                              <span className="font-medium text-primary">
                                {formatCentsBRL(last.totalCents)}
                              </span>
                            </div>
                            <p className="line-clamp-2 text-[11px] leading-relaxed">
                              {last.lines
                                .slice(0, 3)
                                .map((l) => l.description)
                                .join(" · ")}
                            </p>
                            <Button variant="link" className="h-auto p-0 text-primary" asChild>
                              <Link href={`/receipts/${last.id}`}>Ver este recibo</Link>
                            </Button>
                          </div>
                        ) : (
                          <p
                            className="mt-2 rounded-md bg-muted/40 px-2 py-2 text-xs text-muted-foreground"
                            role="status"
                          >
                            <span className="font-medium text-foreground">
                              Nenhum recibo finalizado ainda
                            </span>{" "}
                            para este veículo.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
