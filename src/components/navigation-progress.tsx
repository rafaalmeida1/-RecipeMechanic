"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type Ctx = {
  startNavigation: () => void;
};

const NavigationProgressContext = createContext<Ctx | null>(null);

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  const startNavigation = useCallback(() => {
    setActive(true);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const el = (e.target as HTMLElement | null)?.closest("a[href]");
      if (!el || !(el instanceof HTMLAnchorElement)) return;
      if (el.target === "_blank" || el.hasAttribute("download")) return;
      const href = el.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))
        return;
      try {
        const u = new URL(href, window.location.href);
        if (u.origin !== window.location.origin) return;
        const next = u.pathname + u.search;
        const current = window.location.pathname + window.location.search;
        if (next === current) return;
        startNavigation();
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [startNavigation]);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => setActive(false), 12000);
    return () => window.clearTimeout(t);
  }, [active]);

  return (
    <NavigationProgressContext.Provider value={{ startNavigation }}>
      {active ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/20"
          role="progressbar"
          aria-label="Carregando página"
          aria-busy="true"
        >
          <div className="ribeirocar-nav-indeterminate h-full w-2/5 bg-primary shadow-[0_0_14px_hsl(var(--primary))]" />
        </div>
      ) : null}
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const ctx = useContext(NavigationProgressContext);
  if (!ctx) {
    throw new Error("useNavigationProgress must be used within NavigationProgressProvider");
  }
  return ctx;
}

/** `useRouter` + barra de progresso em `push` / `replace` (navegação programática). */
export function useRouterWithLoading() {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        startNavigation();
        return router.push(...args);
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        startNavigation();
        return router.replace(...args);
      },
    }),
    [router, startNavigation],
  );
}
