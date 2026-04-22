"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Sparkles } from "lucide-react";
import { requestPasswordReset } from "@/server/auth/password-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  return (
    <Card className="border-border/80 shadow-2xl shadow-black/40">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Sparkles className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Esqueci a senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Indique o e-mail da sua conta. Se existir, enviaremos um link para criar outra
          senha.
        </p>
      </div>
      {ok ? (
        <p
          className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-3 text-sm"
          role="status"
        >
          Se o e-mail estiver registado, receberá a mensagem em breve. Verifique a caixa de
          entrada e a pasta de spam. O link funciona cerca de 1 hora.
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setBusy(true);
            void (async () => {
              const res = await requestPasswordReset(email);
              if (!res.ok) {
                setError(res.error);
                setBusy(false);
                return;
              }
              setOk(true);
              setBusy(false);
            })();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" aria-hidden />
              E-mail
            </Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full gap-2" loading={busy} disabled={busy || !email}>
            {!busy ? <Mail className="h-4 w-4" /> : null}
            Enviar link por e-mail
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-primary underline-offset-2 hover:underline">
          Voltar ao início de sessão
        </Link>
      </p>
    </Card>
  );
}
