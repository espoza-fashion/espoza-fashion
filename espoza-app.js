(function () {
  "use strict";

  const copy = {
    ar: {
      install: "تثبيت تطبيق Espoza",
      ios: "افتحي المتجر في Safari، ثم اضغطي على زر المشاركة واختاري «إضافة إلى الشاشة الرئيسية». فعّلي «فتح كتطبيق ويب» إذا ظهر الخيار، ثم اضغطي «إضافة».",
      browser: "من قائمة المتصفح اختاري «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».",
      done: "تم",
      update: "تحديث جديد للمتجر",
      updateBody: "حدّثي التطبيق لعرض آخر نسخة من Espoza.",
      accept: "تحديث الآن",
      later: "لاحقًا",
      working: "جارٍ التحديث…",
      busy: "انتظري حتى يكتمل إرسال الطلب، ثم حدّثي التطبيق."
    },
    en: {
      install: "Install Espoza",
      ios: "Open the store in Safari, tap Share, then Add to Home Screen. Turn on Open as Web App if shown, then tap Add.",
      browser: "Open the browser menu and choose Install app or Add to Home screen.",
      done: "Done",
      update: "Store update available",
      updateBody: "Refresh the app to see the latest version of Espoza.",
      accept: "Update now",
      later: "Later",
      working: "Updating…",
      busy: "Wait for your order to finish submitting, then update the app."
    },
    he: {
      install: "התקנת Espoza",
      ios: "פתחי את החנות ב‑Safari, לחצי על שיתוף ובחרי ״הוספה למסך הבית״. הפעילי ״פתיחה כיישום אינטרנט״ אם האפשרות מופיעה, ואז לחצי על ״הוספה״.",
      browser: "פתחי את תפריט הדפדפן ובחרי ״התקנת אפליקציה״ או ״הוספה למסך הבית״.",
      done: "סיום",
      update: "עדכון חדש לחנות",
      updateBody: "רענני את האפליקציה כדי לראות את הגרסה העדכנית של Espoza.",
      accept: "עדכון עכשיו",
      later: "מאוחר יותר",
      working: "מעדכן…",
      busy: "המתיני לסיום שליחת ההזמנה ואז עדכני את האפליקציה."
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
  let approvedUpdate = false;
  let dismissedWorker;
  let updatePanel;

  function showUpdate(registration) {
    const waiting = registration.waiting;
    if (!waiting || !navigator.serviceWorker.controller ||
        waiting === dismissedWorker || updatePanel?.isConnected) return;

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
    accept.addEventListener("click", () => {
      if (typeof orderSubmissionPending !== "undefined" && orderSubmissionPending) {
        description.textContent = text.busy;
        return;
      }
      if (!registration.waiting) return;
      accept.disabled = true;
      later.disabled = true;
      accept.textContent = text.working;
      approvedUpdate = true;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
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

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    updatePanel?.remove();
    if (!approvedUpdate) return;
    approvedUpdate = false;
    window.location.reload();
  });

  async function startUpdates() {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", {
        scope: "./",
        updateViaCache: "none"
      });
      const watchInstallation = () => {
        registration.installing?.addEventListener("statechange", () => showUpdate(registration));
      };
      registration.addEventListener("updatefound", watchInstallation);
      watchInstallation();
      showUpdate(registration);

      let lastCheck = 0;
      async function checkForUpdate() {
        if (document.hidden || !navigator.onLine || Date.now() - lastCheck < 5000) return;
        lastCheck = Date.now();
        try {
          await registration.update();
          showUpdate(registration);
        } catch (error) {
          console.warn("Espoza update check failed:", error);
        }
      }

      document.addEventListener("visibilitychange", checkForUpdate);
      window.addEventListener("online", checkForUpdate);
      window.setInterval(checkForUpdate, 60000);
      await checkForUpdate();
    } catch (error) {
      console.warn("Espoza service worker unavailable:", error);
    }
  }

  if (document.readyState === "complete") startUpdates();
  else window.addEventListener("load", startUpdates, { once: true });
})();
