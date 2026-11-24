// GitHub Pages renders a new release script on each publication.
// Service worker update checks include this import even when sw.js stays the same.
try {
  importScripts("./app-release.js");
} catch (error) {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);
  if (!local) throw error;
}

const CACHE_PREFIX = "espoza-shell-";
const RELEASE = String(self.espozaRelease || "local");
const CACHE_NAME = CACHE_PREFIX + "v23-" + RELEASE;
const releaseParameter = "espoza-release";
const scope = new URL(self.registration.scope);
const home = scope.href;
const indexPath = new URL("index.html", scope).pathname;
const adminPath = new URL("admin/", scope).pathname;

function previousShellCaches() {
  return caches.keys().then(keys => keys
    .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .reverse());
}

self.addEventListener("install", event => {
  const shellFiles = [
    "./", "./espoza-app.js", "./customer-sidebar.js?v=6", "./customer-sidebar.css?v=2",
    "./manifest.webmanifest", "./icons/espoza-luxe-emblem.svg", "./icons/espoza-app-192.png"
  ];
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(
    shellFiles.map(file => new Request(new URL(file, scope), { cache: "reload" }))
  )));
});

/* Keep an updated worker in the waiting phase until the visitor approves. */
self.addEventListener("message", event => {
  if (event.data?.type === "GET_RELEASE") {
    event.ports?.[0]?.postMessage({ release: RELEASE });
  } else if (event.data?.type === "SKIP_WAITING" &&
      (!event.data.release || event.data.release === RELEASE)) {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    /* Retain one previous shell cache as an offline recovery path. */
    const previous = await previousShellCaches();
    await Promise.all(previous.slice(1).map(key => caches.delete(key)));
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
  const isStaticAsset = ["script", "style", "image", "font", "manifest"].includes(request.destination);
  if (!isNavigation && !isStaticAsset) return;

  const isStorefront = url.pathname === scope.pathname || url.pathname === indexPath;
  if (url.pathname.startsWith(adminPath) || (isNavigation && !isStorefront)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // The static storefront serves the same shell for all URL parameters, including auth callbacks.
  const cacheKey = isNavigation ? home : request;
  event.respondWith((async () => {
    const source = isNavigation ? url : request.referrer && new URL(request.referrer);
    if (source?.origin === scope.origin && source.searchParams.get(releaseParameter) === RELEASE) {
      const installed = await caches.open(CACHE_NAME).then(cache => cache.match(cacheKey));
      if (installed) return installed;
    }
    try {
      const response = await fetch(request, { cache: "no-store" });
      if (response && response.ok) {
        await caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, response.clone())).catch(() => {});
      }
      return response;
    } catch (error) {
      const cached = await caches.open(CACHE_NAME).then(cache => cache.match(cacheKey));
      if (cached) return cached;

      /* If the new shell has not cached this resource yet, fall back to the
         last known-good shell instead of leaving the visitor with a blank page. */
      const previousKeys = await previousShellCaches();
      for (const previousKey of previousKeys) {
        const previousResponse = await (await caches.open(previousKey)).match(cacheKey);
        if (previousResponse) return previousResponse;
      }

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

const updateNotifications = {
  ar: ["تحديث جديد من Espoza", "اضغطي لفتح التطبيق وتفعيل أحدث نسخة."],
  en: ["New Espoza update", "Tap to open the app and activate the latest version."],
  he: ["עדכון חדש ל‑Espoza", "לחצי כדי לפתוח את האפליקציה ולהפעיל את הגרסה העדכנית."]
};

self.addEventListener("push", event => {
  let update;
  try { update = event.data?.json(); } catch { return; }
  if (update?.type !== "release" || !/^\d{1,12}$/.test(update.release)) return;
  const locale = ["ar", "en", "he"].includes(update.locale) ? update.locale : "ar";
  const [title, body] = updateNotifications[locale];
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: new URL("./icons/espoza-app-192.png", scope).href,
    tag: "espoza-store-update",
    dir: locale === "en" ? "ltr" : "rtl",
    lang: locale,
    data: { type: "release" }
  }));
});

self.addEventListener("notificationclick", event => {
  if (event.notification.data?.type !== "release") return;
  event.notification.close();
  event.waitUntil((async () => {
    const pages = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const page = pages.find(client => {
      const url = new URL(client.url);
      return url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === indexPath);
    });
    if (page) {
      await page.focus();
      page.postMessage({ type: "ESPOZA_OPEN_UPDATE" });
    } else {
      await self.clients.openWindow(home);
    }
  })());
});
