"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  acceptInvite,
  createInvite,
  listInvites,
} from "@/server/invites/actions";
import { Link2, Mail, Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type InviteRow = Awaited<ReturnType<typeof listInvites>>[number];

export function InvitesManager() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MECHANIC" | "ADMIN">("MECHANIC");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useMemo(
    () => () =>
      void listInvites()
        .then(setRows)
        .catch(() => setRows([])),
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-8">
      <Card className="space-y-5 border-primary/10">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <UserPlus className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-foreground">Novo membro da equipe</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gere um link único. A pessoa define a senha dela na primeira entrada.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="inviteEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" aria-hidden />
              E-mail da pessoa
            </Label>
            <Input
              id="inviteEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@oficina.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteRole" className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
              Tipo de acesso
            </Label>
            <select
              id="inviteRole"
              className={cn(
                "flex h-11 w-full rounded-md border border-input bg-muted/30 px-3 text-sm text-foreground shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              value={role}
              onChange={(e) => setRole(e.target.value as "MECHANIC" | "ADMIN")}
            >
              <option value="MECHANIC">Mecânico — busca e recibos</option>
              <option value="ADMIN">Administrativo — foco em recibo</option>
            </select>
          </div>
        </div>

        {error ? (
          <p
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {createdUrl ? (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Link2 className="h-4 w-4 text-primary" aria-hidden />
              Link pronto — copie e envie (WhatsApp, etc.)
            </div>
            <div className="mt-2 break-all font-mono text-xs text-muted-foreground">
              {createdUrl}
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          className="gap-2"
          loading={pending}
          disabled={pending || !email}
          onClick={() => {
            setError(null);
            setCreatedUrl(null);
            startTransition(async () => {
              try {
                const res = await createInvite({ email, role });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setCreatedUrl(res.url);
                setEmail("");
                refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Erro");
              }
            });
          }}
        >
          {!pending ? <UserPlus className="h-4 w-4" aria-hidden /> : null}
          Gerar convite
        </Button>
      </Card>

      <Card className="border-border/80">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Últimos convites
        </h2>
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-foreground">{r.email}</div>
                <div className="text-xs text-muted-foreground">
                  {r.role === "ADMIN" ? "Administrativo" : "Mecânico"} · expira{" "}
                  {r.expiresAt.toLocaleDateString("pt-BR")}
                  {r.consumedAt ? " · já utilizado" : ""}
                </div>
              </div>
            </div>
          ))}
          {!rows.length ? (
            <p className="text-sm text-muted-foreground">Nenhum convite ainda.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export function AcceptInviteForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-5 border-primary/10 shadow-2xl shadow-black/40">
      <div className="space-y-2">
        <Label htmlFor="pw" className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" aria-hidden />
          Crie sua senha
        </Label>
        <Input
          id="pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
        <p className="text-xs text-muted-foreground">
          Você usará esse e-mail e senha para entrar no RIBEIROCAR depois.
        </p>
      </div>
      {error ? (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        className="w-full gap-2"
        loading={pending}
        disabled={pending || password.length < 6}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await acceptInvite({ token, password });
            if (!res.ok) {
              setError(res.error);
              return;
            }
            window.location.href = "/login";
          });
        }}
      >
        Ativar acesso e ir para o login
      </Button>
    </Card>
  );
}
