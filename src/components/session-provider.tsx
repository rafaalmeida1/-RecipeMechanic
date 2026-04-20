"use client";

import { SessionProvider } from "next-auth/react";
import { NavigationProgressProvider } from "@/components/navigation-progress";
import { RegisterServiceWorker } from "@/components/register-service-worker";

export function AppSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <NavigationProgressProvider>
        <RegisterServiceWorker />
        {children}
      </NavigationProgressProvider>
    </SessionProvider>
  );
}
