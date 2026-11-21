(function () {
  "use strict";

  const copy = {
    ar: {
      install: "تثبيت تطبيق Espoza",
      ios: "افتحي المتجر في Safari، ثم اضغطي على زر المشاركة واختاري «إضافة إلى الشاشة الرئيسية». فعّلي «فتح كتطبيق ويب» إذا ظهر الخيار، ثم اضغطي «إضافة».",
      browser: "من قائمة المتصفح اختاري «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».",
      done: "تم",
      update: "تحديث Espoza جاهز",
      updateBody: "نسخة جديدة من التطبيق جاهزة للتفعيل.",
      accept: "تحديث الآن",
      later: "لاحقًا",
      working: "جارٍ التحديث…",
      updated: "تم تشغيل أحدث نسخة من Espoza.",
      retry: "إعادة المحاولة",
      updateError: "تعذّر إكمال التحديث. تحققي من الاتصال وحاولي مرة أخرى.",
      busy: "انتظري حتى يكتمل إرسال الطلب، ثم حدّثي التطبيق.",
      notifications: "إشعارات التحديث",
      notificationInfo: "يوصلك إشعار على هذا الجهاز عند نشر نسخة جديدة.",
      enableNotifications: "تفعيل الإشعارات",
      disableNotifications: "إيقاف الإشعارات",
      notificationsOn: "إشعارات التحديث مفعّلة على هذا الجهاز.",
      notificationDenied: "اسمحي بإشعارات Espoza من إعدادات الجهاز لتفعيلها.",
      notificationError: "تعذّر حفظ إعداد الإشعارات. جرّبي مرة أخرى."
    },
    en: {
      install: "Install Espoza",
      ios: "Open the store in Safari, tap Share, then Add to Home Screen. Turn on Open as Web App if shown, then tap Add.",
      browser: "Open the browser menu and choose Install app or Add to Home screen.",
      done: "Done",
      update: "Espoza update ready",
      updateBody: "A new version of the app is ready to activate.",
      accept: "Update now",
      later: "Later",
      working: "Updating…",
      updated: "The latest version of Espoza is running.",
      retry: "Try again",
      updateError: "The update could not finish. Check your connection and try again.",
      busy: "Wait for your order to finish submitting, then update the app.",
      notifications: "Update notifications",
      notificationInfo: "Get a notification on this device when a new version is published.",
      enableNotifications: "Enable notifications",
      disableNotifications: "Turn off notifications",
      notificationsOn: "Update notifications are enabled on this device.",
      notificationDenied: "Allow Espoza notifications in your device settings to enable them.",
      notificationError: "The notification setting could not be saved. Try again."
    },
    he: {
      install: "התקנת Espoza",
      ios: "פתחי את החנות ב‑Safari, לחצי על שיתוף ובחרי ״הוספה למסך הבית״. הפעילי ״פתיחה כיישום אינטרנט״ אם האפשרות מופיעה, ואז לחצי על ״הוספה״.",
      browser: "פתחי את תפריט הדפדפן ובחרי ״התקנת אפליקציה״ או ״הוספה למסך הבית״.",
      done: "סיום",
      update: "עדכון Espoza מוכן",
      updateBody: "גרסה חדשה של האפליקציה מוכנה להפעלה.",
      accept: "עדכון עכשיו",
      later: "מאוחר יותר",
      working: "מעדכן…",
      updated: "הגרסה העדכנית של Espoza פועלת.",
      retry: "נסי שוב",
      updateError: "לא ניתן היה להשלים את העדכון. בדקי את החיבור ונסי שוב.",
      busy: "המתיני לסיום שליחת ההזמנה ואז עדכני את האפליקציה.",
      notifications: "התראות עדכון",
      notificationInfo: "תקבלי התראה במכשיר הזה כאשר תפורסם גרסה חדשה.",
      enableNotifications: "הפעלת התראות",
      disableNotifications: "כיבוי התראות",
      notificationsOn: "התראות עדכון מופעלות במכשיר הזה.",
      notificationDenied: "כדי להפעיל התראות, אשרי התראות של Espoza בהגדרות המכשיר.",
      notificationError: "לא ניתן היה לשמור את הגדרת ההתראות. נסי שוב."
    }
  };

  const installedDisplay = window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)");
  const language = () => (document.documentElement.lang || "ar").slice(0, 2);
  const labels = () => copy[language()] || copy.ar;
  let installPrompt;
  let installed = false;

  function canInstall() {
    return !installed && !installedDisplay.matches && navigator.standalone !== true;
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    installPrompt = null;
  });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function button(className, text) {
    const node = element("button", className, text);
    node.type = "button";
    return node;
  }

  function showInstallHelp() {
    if (document.getElementById("espozaInstallHelp")) return;
    const text = labels();
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const dialog = element("dialog", "espoza-install-dialog");
    dialog.id = "espozaInstallHelp";
    dialog.dir = language() === "en" ? "ltr" : "rtl";
    dialog.setAttribute("aria-labelledby", "espozaInstallTitle");
    const icon = element("img", "espoza-install-icon");
    icon.src = "./icons/espoza-app-192.png";
    icon.alt = "";
    icon.width = 52;
    icon.height = 52;
    const title = element("h2", "", text.install);
    title.id = "espozaInstallTitle";
    const description = element("p", "", ios ? text.ios : text.browser);
    const close = button("espoza-update-accept", text.done);
    close.addEventListener("click", () => {
      dialog.remove();
      document.getElementById("menuBtn")?.focus();
    });
    dialog.addEventListener("cancel", () => {
      dialog.remove();
      document.getElementById("menuBtn")?.focus();
    });
    dialog.append(icon, title, description, close);
    document.body.append(dialog);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  window.espozaApp = {
    canInstall,
    async install() {
      if (!canInstall()) return;
      if (!installPrompt) {
        showInstallHelp();
        return;
      }
      const prompt = installPrompt;
      installPrompt = null;
      try {
        await prompt.prompt();
      } catch {
        showInstallHelp();
      }
    }
  };

  if (!("serviceWorker" in navigator)) return;
  const workers = navigator.serviceWorker;
  const releaseParameter = "espoza-release";
  let registration;
  let checking;
  let lastCheck = 0;
  let applying = false;
  let notificationsReady = false;
  let dismissedWorker;
  let updatePanel;
  let displayedWorker;

  async function notificationRequest(body) {
    const headers = { apikey: CUSTOMER_SUPABASE_KEY };
    if (body) headers["Content-Type"] = "application/json";
    const response = await fetch(CUSTOMER_SUPABASE_URL + "/functions/v1/espoza-updates", {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error("Espoza notification request failed");
    return response.json();
  }

  function canManageNotifications() {
    return notificationsReady;
  }

  async function refreshNotificationCapability() {
    notificationsReady = false;
    const controller = workers.controller;
    if (!controller || !registration?.pushManager || !("Notification" in window)) return;
    const release = await workerRelease(controller);
    if (workers.controller === controller) notificationsReady = Boolean(release);
  }

  async function openNotificationSettings() {
    if (!canManageNotifications() || document.getElementById("espozaNotificationSettings")) return;
    const text = labels();
    const panel = element("section", "espoza-update-notice espoza-notification-settings");
    panel.id = "espozaNotificationSettings";
    panel.dir = language() === "en" ? "ltr" : "rtl";
    panel.setAttribute("aria-label", text.notifications);
    const title = element("strong", "espoza-update-title", text.notifications);
    const description = element("p", "espoza-update-description", text.notificationInfo);
    description.setAttribute("role", "status");
    const actions = element("div", "espoza-update-actions");
    const toggle = button("espoza-update-accept", text.enableNotifications);
    const close = button("espoza-update-later", text.done);
    close.addEventListener("click", () => {
      panel.remove();
      document.getElementById("menuBtn")?.focus();
    });
    actions.append(toggle, close);
    panel.append(title, description, actions);
    document.body.append(panel);
    close.focus();

    const push = registration.pushManager;
    let subscription;
    let applicationServerKey;
    let loaded = false;

    function showPreference() {
      const denied = !subscription && Notification.permission === "denied";
      description.textContent = subscription ? text.notificationsOn
        : denied ? text.notificationDenied : text.notificationInfo;
      toggle.textContent = subscription ? text.disableNotifications : text.enableNotifications;
      toggle.disabled = denied;
      close.disabled = false;
    }

    async function loadPreference() {
      toggle.disabled = true;
      try {
        subscription = await push.getSubscription();
        if (!subscription && Notification.permission !== "denied") {
          const { publicKey } = await notificationRequest();
          if (typeof publicKey !== "string" || !/^B[A-Za-z0-9_-]{86}$/.test(publicKey)) {
            throw new Error("Missing public notification key");
          }
          const base64 = publicKey.replace(/-/g, "+").replace(/_/g, "/") + "=";
          applicationServerKey = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        }
        loaded = true;
        showPreference();
      } catch {
        description.textContent = text.notificationError;
        toggle.textContent = text.retry;
        toggle.disabled = false;
      }
    }

    toggle.addEventListener("click", async () => {
      if (!loaded) {
        await loadPreference();
        return;
      }
      toggle.disabled = true;
      close.disabled = true;
      let created;
      try {
        if (subscription) {
          const saved = subscription.toJSON();
          if (!await subscription.unsubscribe()) throw new Error("Push unsubscribe failed");
          subscription = null;
          await notificationRequest({ action: "unsubscribe", subscription: saved }).catch(() => {});
          if (!applicationServerKey) {
            loaded = false;
            await loadPreference();
            return;
          }
        } else {
          created = await push.subscribe({ userVisibleOnly: true, applicationServerKey });
          const turnstileToken = await window.getEspozaTurnstileToken("update_subscription");
          await notificationRequest({
            action: "subscribe",
            subscription: created.toJSON(),
            locale: language(),
            turnstileToken
          });
          subscription = created;
        }
        showPreference();
      } catch {
        if (created) await created.unsubscribe().catch(() => {});
        showPreference();
        if (Notification.permission !== "denied") description.textContent = text.notificationError;
      } finally {
        close.disabled = false;
      }
    });
    await loadPreference();
  }

  window.espozaApp.canManageNotifications = canManageNotifications;
  window.espozaApp.openNotificationSettings = openNotificationSettings;

  function orderInProgress() {
    return typeof orderSubmissionPending !== "undefined" && orderSubmissionPending;
  }

  function waitFor(target, event, ready, timeout = 20000) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const finish = error => {
        clearTimeout(timer);
        target.removeEventListener(event, check);
        if (error) reject(error);
        else resolve();
      };
      const check = () => { if (ready()) finish(); };
      const timer = setTimeout(() => finish(new Error("Espoza update timed out")), timeout);
      target.addEventListener(event, check);
    });
  }

  function workerRelease(worker) {
    if (!worker || typeof MessageChannel !== "function") return Promise.resolve(null);
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const finish = release => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(/^\d{1,12}$/.test(release) ? release : null);
      };
      const timer = setTimeout(() => finish(null), 2000);
      channel.port1.onmessage = event => finish(event.data?.release);
      try {
        worker.postMessage({ type: "GET_RELEASE" }, [channel.port2]);
      } catch {
        finish(null);
      }
    });
  }

  async function activateUpdate() {
    await checkForUpdate(true);
    const installing = registration.installing;
    if (installing) {
      await waitFor(installing, "statechange", () =>
        ["installed", "activating", "activated", "redundant"].includes(installing.state));
      if (installing.state === "redundant" && !registration.waiting) throw new Error("Installation failed");
    }

    const worker = registration.waiting || registration.active;
    if (!worker) throw new Error("No installed update");
    const release = await workerRelease(worker);
    await waitFor(window, "espoza:order-idle", () => !orderInProgress(), 90000);
    if (worker !== workers.controller) {
      if (registration.waiting === worker) worker.postMessage({ type: "SKIP_WAITING", release });
      await waitFor(workers, "controllerchange", () => workers.controller === worker);
    }
    await waitFor(window, "espoza:order-idle", () => !orderInProgress(), 90000);

    if (!release) {
      window.location.reload();
      return;
    }
    const next = new URL(window.location.href);
    next.searchParams.set(releaseParameter, release);
    window.location.replace(next.href);
  }

  function showUpdate() {
    if (applying) return;
    const waiting = registration?.waiting;
    if (!waiting || !workers.controller || waiting === dismissedWorker) {
      updatePanel?.remove();
      return;
    }
    if (waiting === displayedWorker && updatePanel?.isConnected) return;
    updatePanel?.remove();
    displayedWorker = waiting;

    const text = labels();
    const panel = element("section", "espoza-update-notice");
    panel.setAttribute("aria-label", text.update);
    panel.dir = language() === "en" ? "ltr" : "rtl";
    const title = element("strong", "espoza-update-title", text.update);
    const description = element("p", "espoza-update-description", text.updateBody);
    description.setAttribute("role", "status");
    const actions = element("div", "espoza-update-actions");
    const accept = button("espoza-update-accept", text.accept);
    const later = button("espoza-update-later", text.later);
    accept.addEventListener("click", async () => {
      if (applying) return;
      if (orderInProgress()) {
        description.textContent = text.busy;
        return;
      }
      applying = true;
      accept.disabled = true;
      later.disabled = true;
      accept.textContent = text.working;
      description.textContent = text.updateBody;
      try {
        await activateUpdate();
      } catch (error) {
        applying = false;
        accept.disabled = false;
        later.disabled = false;
        accept.textContent = text.retry;
        description.textContent = text.updateError;
        console.warn("Espoza could not activate an update:", error);
      }
    });
    later.addEventListener("click", () => {
      dismissedWorker = waiting;
      panel.remove();
    });
    actions.append(accept, later);
    panel.append(title, description, actions);
    document.body.append(panel);
    updatePanel = panel;
  }

  async function showAppliedUpdate() {
    const url = new URL(window.location.href);
    const expected = url.searchParams.get(releaseParameter);
    if (!expected) return;
    const active = await workerRelease(workers.controller);
    if (active !== expected) return;

    url.searchParams.delete(releaseParameter);
    window.history.replaceState(window.history.state, "", url.href);
    const panel = element("div", "espoza-update-notice espoza-update-success");
    panel.setAttribute("role", "status");
    panel.dir = language() === "en" ? "ltr" : "rtl";
    const message = element("strong", "espoza-update-title");
    panel.append(message);
    document.body.append(panel);
    requestAnimationFrame(() => { message.textContent = labels().updated; });
    setTimeout(() => panel.remove(), 5500);
  }

  async function checkForUpdate(force = false) {
    if (!registration) return;
    if (!navigator.onLine) {
      if (force) throw new Error("Espoza is offline");
      return;
    }
    if (!force && (document.hidden || Date.now() - lastCheck < 5000)) return;
    if (!checking) {
      lastCheck = Date.now();
      checking = registration.update().finally(() => { checking = null; });
    }
    await checking;
    showUpdate();
  }

  function refreshUpdates() {
    return checkForUpdate().catch(error => console.warn("Espoza update check failed:", error));
  }

  window.espozaApp.hasUpdate = () => Boolean(registration?.waiting && workers.controller);
  window.espozaApp.openUpdate = () => {
    dismissedWorker = null;
    showUpdate();
    void refreshUpdates();
  };

  workers.addEventListener("controllerchange", () => {
    showUpdate();
    void refreshNotificationCapability();
  });
  window.addEventListener("espoza:languagechange", () => {
    if (applying || !updatePanel?.isConnected) return;
    updatePanel.remove();
    showUpdate();
  });

  workers.addEventListener("message", event => {
    if (event.data?.type !== "ESPOZA_OPEN_UPDATE") return;
    dismissedWorker = null;
    void checkForUpdate(true).catch(() => showUpdate());
  });

  async function startUpdates() {
    try {
      registration = await workers.register("./sw.js", {
        scope: "./",
        updateViaCache: "none"
      });
      const watchInstallation = () => {
        registration.installing?.addEventListener("statechange", showUpdate);
      };
      registration.addEventListener("updatefound", watchInstallation);
      watchInstallation();
      showUpdate();
      void refreshNotificationCapability();
      document.addEventListener("visibilitychange", refreshUpdates);
      window.addEventListener("online", refreshUpdates);
      window.addEventListener("pageshow", refreshUpdates);
      window.setInterval(refreshUpdates, 60000);
      await showAppliedUpdate();
      await refreshUpdates();
    } catch (error) {
      console.warn("Espoza service worker unavailable:", error);
    }
  }

  if (document.readyState === "complete") startUpdates();
  else window.addEventListener("load", startUpdates, { once: true });
})();
