"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Sparkles } from "lucide-react";
import { resetPasswordWithToken } from "@/server/auth/password-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  if (!token) {
    return (
      <Card className="border-destructive/30 p-6 text-center text-sm text-muted-foreground">
        Link inválido. Use o endereço completo enviado por e-mail, ou peça outro em{" "}
        <Link href="/forgot-password" className="text-primary underline">
          Esqueci a senha
        </Link>
        .
      </Card>
    );
  }

  if (ok) {
    return (
      <Card className="border-primary/30 p-6 text-center">
        <p className="text-sm">Senha alterada. Já pode entrar.</p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Ir para o início de sessão
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-2xl shadow-black/40">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <KeyRound className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mínimo de 8 caracteres.</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (p1 !== p2) {
            setError("As senhas não coincidem.");
            return;
          }
          setBusy(true);
          void (async () => {
            const res = await resetPasswordWithToken({ token, newPassword: p1 });
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
          <Label htmlFor="np1">Nova senha</Label>
          <Input
            id="np1"
            type="password"
            autoComplete="new-password"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="np2">Confirmar senha</Label>
          <Input
            id="np2"
            type="password"
            autoComplete="new-password"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            required
            minLength={8}
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
        <Button
          type="submit"
          className="w-full gap-2"
          loading={busy}
          disabled={busy}
        >
          {!busy ? <Sparkles className="h-4 w-4" /> : null}
          Guardar senha
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-primary underline-offset-2 hover:underline">
          Voltar ao início de sessão
        </Link>
      </p>
    </Card>
  );
}
