"use client";

import { useEffect } from "react";

/**
 * Registra o service worker em produção para cache do shell PWA.
 * Em desenvolvimento fica desligado para não mascarar atualizações.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* falha silenciosa — PWA continua instalável só com manifest */
    });
  }, []);
  return null;
}
