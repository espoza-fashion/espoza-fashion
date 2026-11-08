/* Espoza customer PWA: online-first documents, offline fallback only. */
const CACHE_NAME = "espoza-shell-v11";
const OFFLINE_HTML = '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#641F34"><title>Espoza Fashion</title><body style="font-family:Arial,sans-serif;background:#FBF9F5;color:#641F34;text-align:center;padding:15vh 24px"><h2>تعذّر الاتصال بالمتجر</h2><p>تحققي من اتصال الإنترنت ثم أعيدي المحاولة.</p><button onclick="location.reload()" style="padding:12px 24px;border:0;border-radius:24px;background:#641F34;color:white">إعادة المحاولة</button></body></html>';
self.addEventListener("install", event => { self.skipWaiting(); });
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("espoza-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/admin")) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await (event.preloadResponse || Promise.resolve(null)) || await fetch(request, { cache: "no-cache" });
      if (response.ok && response.type === "basic" && !response.headers.has("set-cookie")) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return await cache.match(request) || new Response(OFFLINE_HTML, {
        status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
      });
    }
  })());
});
