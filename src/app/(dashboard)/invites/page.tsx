import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InvitesManager } from "@/components/invites-manager";

export default async function InvitesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/mechanic");

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Administração
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Convidar equipe
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Gere links seguros para novos usuários. Cada um cria a própria senha na
          primeira vez.
        </p>
      </header>
      <InvitesManager />
    </div>
  );
}
