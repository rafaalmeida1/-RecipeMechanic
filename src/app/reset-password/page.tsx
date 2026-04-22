import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const sp = await searchParams;
  const token = typeof sp.token === "string" && sp.token.length > 0 ? sp.token : null;

  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(51_100%_50%/0.18),transparent)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,hsl(240_5%_15%/0.9),transparent_55%)]" />
      <div className="relative mx-auto w-full max-w-md">
        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
