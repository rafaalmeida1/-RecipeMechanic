"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function OnlineStatus() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const online = useSyncExternalStore(
    subscribe,
    getOnlineSnapshot,
    getServerSnapshot,
  );

  if (!mounted || online) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-950/50 px-2.5 py-1 text-[11px] font-medium text-amber-100"
      role="status"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>Sem internet</span>
    </div>
  );
}
