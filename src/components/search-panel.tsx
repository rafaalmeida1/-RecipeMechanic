"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
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
  /** Última busca concluída (para mensagens “nenhum resultado” / sucesso). */
  const [finishedQuery, setFinishedQuery] = useState<string | null>(null);

  const trimmed = q.trim();
  const canSearch = useMemo(() => trimmed.length >= 2, [trimmed]);
  const tooShort = trimmed.length > 0 && trimmed.length < 2;

  const showOutcome =
    !pending && finishedQuery !== null && finishedQuery === trimmed;

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
            placeholder="Placa, nome, telefone ou e-mail"
            aria-describedby="search-hint"
          />
          <Button
            type="button"
            className="shrink-0 sm:w-40"
            disabled={!canSearch || pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const query = q.trim();
                  const rows = await searchClients(query);
                  setResults(rows);
                  setFinishedQuery(query);
                } catch {
                  setResults([]);
                  setFinishedQuery(null);
                  setError(
                    "Não foi possível concluir a busca. Verifique a internet e tente outra vez.",
                  );
                }
              });
            }}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            <span>{pending ? "Aguarde…" : "Buscar"}</span>
          </Button>
        </div>
        <p id="search-hint" className="text-xs text-muted-foreground">
          Mínimo <strong className="text-foreground">2 caracteres</strong>. Os
          resultados aparecem logo abaixo, com um resumo do que aconteceu.
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
              Digite pelo menos mais um caractere para liberar o botão{" "}
              <span className="font-semibold">Buscar</span>.
            </p>
          </div>
        </div>
      ) : null}

      {pending ? (
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
                ? "Encontramos 1 cliente"
                : `Encontramos ${results.length} clientes`}
            </p>
            <p className="mt-1 text-emerald-100/85">
              Para “<span className="font-mono font-medium">{finishedQuery}</span>”.
              Veja os detalhes abaixo.
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
            <p className="text-base font-semibold text-foreground">
              Nenhum resultado
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Não encontramos ninguém no cadastro para{" "}
              <span className="break-words font-mono text-foreground">
                “{finishedQuery}”
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

      <div className="space-y-4">
        {results.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-border/80 bg-muted/20 p-4"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-sm">
                <User className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">{c.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.phone ? `Tel: ${c.phone}` : null}
                  {c.phone && c.email ? " · " : null}
                  {c.email ? c.email : null}
                </div>
              </div>
            </div>

            {c.vehicles.length === 0 ? (
              <div
                className="mt-4 rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground"
                role="status"
              >
                Este cliente ainda não tem veículo cadastrado no sistema.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {c.vehicles.map((v) => {
                  const last = v.receipts[0];
                  return (
                    <div
                      key={v.id}
                      className="rounded-lg border border-border/60 bg-card/80 p-3 shadow-sm"
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
                            Último serviço:{" "}
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
                          <Button
                            variant="link"
                            className="h-auto p-0 text-primary"
                            asChild
                          >
                            <Link href={`/receipts/${last.id}`}>
                              Ver recibo completo
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <p
                          className="mt-2 rounded-md bg-muted/40 px-2 py-2 text-xs text-muted-foreground"
                          role="status"
                        >
                          <span className="font-medium text-foreground">
                            Nenhum recibo ainda
                          </span>{" "}
                          para este veículo. Quando finalizar um serviço, ele aparecerá
                          aqui.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
