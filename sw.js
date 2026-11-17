const CACHE_NAME = "espoza-shell-v17";

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

/* Network-first for the storefront shell and same-origin assets:
   installed apps get current code/content whenever online, with offline fallback. */
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === "navigate";
  const isStaticAsset = ["script", "style", "image", "font"].includes(request.destination);
  if (!isNavigation && !isStaticAsset) return;

  const isAdminPage = url.pathname.includes("/admin");
  if (isAdminPage) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request, { cache: "no-store" });
      if (response && response.ok) {
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (isNavigation) {
        return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#641f34"><title>Espoza Fashion</title><body style="font-family:Arial,sans-serif;background:#faf7f2;color:#641f34;text-align:center;padding:15vh 24px"><main style="max-width:420px;margin:auto;background:#fff;border:1px solid #eadfe1;border-radius:24px;padding:34px 24px;box-shadow:0 18px 50px #43132118"><div style="color:#b9985a;font-size:28px">✦</div><h2 id="offlineTitle">تعذّر الاتصال بالمتجر</h2><p id="offlineText">تحققي من اتصال الإنترنت ثم أعيدي المحاولة.</p><button id="offlineButton" onclick="location.reload()" style="padding:12px 24px;border:0;border-radius:24px;background:#641f34;color:white">إعادة المحاولة</button></main><script>try{const l=localStorage.getItem("espoza_lang");const lang=["ar","en","he"].includes(l)?l:"ar";const d={ar:{dir:"rtl",title:"تعذّر الاتصال بالمتجر",text:"تحققي من اتصال الإنترنت ثم أعيدي المحاولة.",button:"إعادة المحاولة"},en:{dir:"ltr",title:"Store connection unavailable",text:"Check your internet connection and try again.",button:"Try again"},he:{dir:"rtl",title:"אין חיבור לחנות",text:"בדקי את חיבור האינטרנט ונסי שוב.",button:"נסי שוב"}}[lang];document.documentElement.lang=lang;document.documentElement.dir=d.dir;document.getElementById("offlineTitle").textContent=d.title;document.getElementById("offlineText").textContent=d.text;document.getElementById("offlineButton").textContent=d.button;}catch(e){}</script></body></html>', {
          headers: { "Content-Type": "text/html; charset=utf-8" },
          status: 503
        });
      }
      return Response.error();
    }
  })());
});