const CACHE_NAME = "espoza-shell-v4";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("espoza-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

/* Return cached HTML immediately on repeat launches; refresh it in background. */
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const network = fetch(request).then(response => {
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    });
    if (cached) {
      network.catch(() => {});
      return cached;
    }
    try { return await network; }
    catch (error) {
      return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#641f34"><title>Espoza Fashion</title><body style="font-family:Arial,sans-serif;background:#faf7f2;color:#641f34;text-align:center;padding:15vh 24px"><h2>تعذّر الاتصال بالمتجر</h2><p>تحققي من اتصال الإنترنت ثم أعيدي المحاولة.</p><button onclick="location.reload()" style="padding:12px 24px;border:0;border-radius:24px;background:#641f34;color:white">إعادة المحاولة</button></body></html>', { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 });
    }
  })());
});