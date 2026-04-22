"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/server/auth/password-actions";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-4 border-border/60 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Definir ou alterar senha</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasPassword
            ? "Pode alterar a senha aqui. Quem entra só pelo e-mail, sem senha, pode escolher uma abaixo."
            : "Ainda não tem senha. Defina uma para entrar com e-mail + senha, além do link do e-mail."}
        </p>
      </div>
      {hasPassword ? (
        <div className="space-y-2">
          <Label htmlFor="cur-pw">Senha actual</Label>
          <Input
            id="cur-pw"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="new1">
          {hasPassword ? "Nova senha" : "Nova senha"}{" "}
          <span className="font-normal text-muted-foreground">(mín. 8 caracteres)</span>
        </Label>
        <Input
          id="new1"
          type="password"
          autoComplete="new-password"
          value={n1}
          onChange={(e) => setN1(e.target.value)}
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new2">Confirmar nova senha</Label>
        <Input
          id="new2"
          type="password"
          autoComplete="new-password"
          value={n2}
          onChange={(e) => setN2(e.target.value)}
          minLength={8}
        />
      </div>
      {err ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-2 text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-2 py-2 text-sm" role="status">
          {ok}
        </p>
      ) : null}
      <Button
        type="button"
        className="gap-2"
        disabled={pending}
        loading={pending}
        onClick={() => {
          setErr(null);
          setOk(null);
          if (n1 !== n2) {
            setErr("As senhas novas não coincidem.");
            return;
          }
          startTransition(async () => {
            const res = await changePassword({
              currentPassword: hasPassword ? current : undefined,
              newPassword: n1,
            });
            if (!res.ok) {
              setErr(res.error);
              return;
            }
            setCurrent("");
            setN1("");
            setN2("");
            setOk("Senha actualizada com sucesso.");
          });
        }}
      >
        {!pending ? <KeyRound className="h-4 w-4" aria-hidden /> : null}
        {hasPassword ? "Guardar nova senha" : "Criar senha"}
      </Button>
    </Card>
  );
}
