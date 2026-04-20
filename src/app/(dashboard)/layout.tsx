import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { OfflineSyncBanner } from "@/components/offline-sync-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-background to-muted/15">
      <NavBar role={session.user.role} />
      <OfflineSyncBanner />
      <div className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:pb-8">{children}</div>
    </div>
  );
}
