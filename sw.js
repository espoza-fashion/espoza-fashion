const CACHE_PREFIX = "espoza-app-";
self.addEventListener("install", event => {
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  event.respondWith(
    fetch(request, { cache: "no-store" }).catch(() => new Response(
      '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Espoza Fashion</title><body style="font-family:Arial,sans-serif;background:#faf7f2;color:#641f34;text-align:center;padding:15vh 24px"><h2>تعذّر الاتصال بالمتجر</h2><p>تحققي من اتصال الإنترنت ثم أعيدي المحاولة.</p><button onclick="location.reload()" style="padding:12px 24px;border:0;border-radius:24px;background:#641f34;color:white">إعادة المحاولة</button></body></html>',
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
    ))
  );
});