/* Espoza Fashion PWA update policy
   Always prefer the latest published site while online.
   Keep only the latest app shell as an offline fallback.
   Product/catalog/API requests are deliberately NOT cached here.
*/
const CACHE_NAME = "espoza-shell-v1";
const SHELL_URL = new URL("./", self.registration.scope).href;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const response = await fetch(SHELL_URL, { cache: "no-cache" });
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(SHELL_URL, response.clone());
      }
    } catch (_) {
      // First install can still complete; online navigation will fetch normally.
    }
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("espoza-shell-") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: "no-cache" });
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(SHELL_URL, response.clone());
      }
      return response;
    } catch (error) {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(SHELL_URL)) || Response.error();
    }
  })());
});
