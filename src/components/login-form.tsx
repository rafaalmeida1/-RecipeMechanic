"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { KeyRound, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink } from "@/app/login/actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [magicBusy, setMagicBusy] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  return (
    <Card className="border-border/80 shadow-2xl shadow-black/40">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Sparkles className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          RIBEIROCAR
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre para criar recibos e ver o histórico dos clientes.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
            E-mail da oficina
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@exemplo.com"
          />
          <p className="text-xs text-muted-foreground">
            O mesmo e-mail que o administrador cadastrou para você.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden />
            Senha{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Só se você já criou uma senha"
          />
          <p className="text-xs text-muted-foreground">
            Sem senha? Use o link mágico no e-mail — é o jeito mais fácil.
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
        {message ? (
          <p
            className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground"
            role="status"
          >
            {message}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pt-1">
          <Button
            type="button"
            className="w-full gap-2"
            loading={magicBusy}
            disabled={magicBusy || pwdBusy || !email}
            onClick={() => {
              setError(null);
              setMessage(null);
              setMagicBusy(true);
              void (async () => {
                try {
                  const res = await sendMagicLink(email);
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setMessage(
                    "Enviamos um link para seu e-mail. Abra a caixa de entrada e toque no link para entrar.",
                  );
                } finally {
                  setMagicBusy(false);
                }
              })();
            }}
          >
            {!magicBusy ? <Mail className="h-4 w-4" aria-hidden /> : null}
            Receber link no e-mail
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2"
            loading={pwdBusy}
            disabled={magicBusy || pwdBusy || !email || !password}
            onClick={() => {
              setError(null);
              setMessage(null);
              setPwdBusy(true);
              void (async () => {
                try {
                  const res = await signIn("credentials", {
                    email: email.trim().toLowerCase(),
                    password,
                    redirect: false,
                    callbackUrl: "/",
                  });
                  if (res?.error) {
                    setError("E-mail ou senha incorretos.");
                    return;
                  }
                  window.location.href = "/";
                } finally {
                  setPwdBusy(false);
                }
              })();
            }}
          >
            {!pwdBusy ? <KeyRound className="h-4 w-4" aria-hidden /> : null}
            Entrar com senha
          </Button>
        </div>
      </div>
    </Card>
  );
}
