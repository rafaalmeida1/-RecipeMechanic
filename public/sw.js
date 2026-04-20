/* RIBEIROCAR — cache mínimo para PWA (shell + assets estáticos). */
const CACHE = "ribeirocar-static-v1";
const PRECACHE = ["/", "/manifest.webmanifest", "/logo/logo_ribeirocar.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match("/")));
    }),
  );
});
