// Minimal, security-first Service Worker for TransFlow PWA.
// Strictly caches only public static assets; NEVER caches authenticated routes, APIs, or third-party requests.

const CACHE_NAME = "transflow-static-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept or cache auth, API, or HTML documents
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.includes("/app/") ||
    url.pathname.includes("/onboarding") ||
    url.pathname.includes("/login") ||
    url.pathname.includes("/signup") ||
    req.mode === "navigate"
  ) {
    return;
  }

  // Cache-first only for immutable Next.js static chunks and static SVG icons
  const isImmutableStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/brand-icon.svg";

  if (!isImmutableStatic) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});
