// Minimal service worker — enables PWA installability.
// Network-first passthrough (no aggressive caching to avoid stale data).
const VERSION = "investwatcher-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Only handle GET navigations/assets; let everything else pass through.
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response("Offline", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain" },
        }),
    ),
  );
});
