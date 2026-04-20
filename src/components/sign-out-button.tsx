"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";

function SignOutInner() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      loading={pending}
      className="h-auto w-full justify-start gap-3 px-3 py-3 text-left font-normal hover:bg-muted/50"
    >
      <LogOut className="h-5 w-5 text-muted-foreground" />
      <span>
        <span className="block font-medium text-foreground">Sair</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Encerrar sessão neste aparelho
        </span>
      </span>
    </Button>
  );
}

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <SignOutInner />
    </form>
  );
}
