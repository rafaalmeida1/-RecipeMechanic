import { AcceptInviteForm } from "@/components/invites-manager";
import { Sparkles } from "lucide-react";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token ?? "";

  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(51_100%_50%/0.15),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Sparkles className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">RIBEIROCAR</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ative seu acesso com uma senha segura.
          </p>
        </div>
        {!token ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-center text-sm text-destructive">
            Link inválido ou incompleto. Peça um novo convite ao administrador.
          </div>
        ) : (
          <AcceptInviteForm token={token} />
        )}
      </div>
    </main>
  );
}
