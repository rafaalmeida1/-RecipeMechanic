import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Button } from "@/components/ui/button";

export default async function AccountPasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, passwordHash: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight">Senha e conta</h1>
        <p className="text-sm text-muted-foreground">Conta: {user.email}</p>
        <p className="text-sm text-muted-foreground">
          Esqueceu a senha estando a trabalhar? Use{" "}
          <Link href="/forgot-password" className="text-primary underline-offset-2 hover:underline">
            esqueci minha senha
          </Link>{" "}
          — recebe o link no e-mail, mesmo com sessão aberta noutro separador.
        </p>
      </div>
      <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
      <Button variant="outline" asChild>
        <Link href="/">Voltar</Link>
      </Button>
    </div>
  );
}
