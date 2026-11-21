const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");
const { MessageChannel } = require("node:worker_threads");

const workerSource = fs.readFileSync("sw.js", "utf8");
const clientSource = fs.readFileSync("espoza-app.js", "utf8");

test("the manifest has correctly sized phone icons and uses the storefront URL", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(item => item.sizes === size + "x" + size);
    assert.equal(icon.type, "image/png");
    const png = fs.readFileSync(icon.src);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test("the app loads the latest page online and keeps a public shell for offline use", async () => {
  const root = "https://store.example/espoza-fashion/";
  const listeners = {};
  const storedResponses = new Map();
  let network = true;
  let html = "Initial store";
  const cacheKey = value => typeof value === "string" ? value : value.url;
  const fetch = async request => {
    if (!network) throw Error("Offline");
    return new Response(cacheKey(request).startsWith(root + "admin/") ? "Admin" : html);
  };
  const cache = {
    async addAll(requests) {
      for (const request of requests) storedResponses.set(request.url, await fetch(request));
    },
    async match(request) { return storedResponses.get(cacheKey(request))?.clone(); },
    async put(request, response) { storedResponses.set(cacheKey(request), response); }
  };
  const names = new Set();
  const self = {
    location: new URL(root),
    registration: { scope: root },
    addEventListener(name, handler) { listeners[name] = handler; }
  };
  vm.runInNewContext(workerSource, {
    self, URL, Request, Response, fetch,
    importScripts(path) {
      assert.equal(path, "./app-release.js");
      self.espozaRelease = "1795280002";
    },
    caches: {
      async open(name) { names.add(name); return cache; },
      async keys() { return Array.from(names); }
    }
  });

  let installation;
  listeners.install({ waitUntil(promise) { installation = promise; } });
  await installation;
  assert.ok(names.has("espoza-shell-v22-1795280002"));
  assert.ok(storedResponses.has(root));

  function navigate(url) {
    let result;
    listeners.fetch({
      request: { url, method: "GET", mode: "navigate", destination: "document" },
      respondWith(promise) { result = promise; }
    });
    return result;
  }

  html = "Latest store";
  assert.equal(await (await navigate(root + "?espoza-release=1795280002")).text(), "Initial store");
  const returnUrl = root + "index.html?code=example";
  assert.equal(await (await navigate(returnUrl)).text(), "Latest store");
  assert.ok(!storedResponses.has(returnUrl));
  assert.equal(await (await navigate(root + "admin/")).text(), "Admin");
  assert.ok(!storedResponses.has(root + "admin/"));

  network = false;
  assert.equal(await (await navigate(root)).text(), "Latest store");
  await assert.rejects(navigate(root + "admin/"), /Offline/);
});

test("the app uses the native install prompt when the browser offers it", async () => {
  const listeners = {};
  const window = {
    matchMedia: () => ({ matches: false }),
    addEventListener(name, handler) { listeners[name] = handler; }
  };
  vm.runInNewContext(clientSource, { window, navigator: {}, document: {} });
  let prevented = false;
  let prompted = false;
  listeners.beforeinstallprompt({
    preventDefault() { prevented = true; },
    async prompt() { prompted = true; }
  });
  assert.ok(window.espozaApp.canInstall());
  await window.espozaApp.install();
  assert.ok(prevented && prompted);
  listeners.appinstalled();
  assert.equal(window.espozaApp.canInstall(), false);
});

test("the app revalidates worker imports on launch and when it becomes visible", async () => {
  const documentListeners = {};
  let time = 10000;
  let checks = 0;
  const registration = {
    addEventListener() {},
    async update() { checks++; }
  };
  const navigator = {
    onLine: true,
    serviceWorker: {
      addEventListener() {},
      async register(script, options) {
        assert.equal(script, "./sw.js");
        assert.equal(options.updateViaCache, "none");
        return registration;
      }
    }
  };
  const document = {
    readyState: "complete",
    hidden: false,
    addEventListener(name, handler) { documentListeners[name] = handler; }
  };
  const window = {
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    location: new URL("https://store.example/espoza-fashion/"),
    setInterval() {}
  };
  vm.runInNewContext(clientSource, { window, navigator, document, URL, Date: { now: () => time } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(checks, 1);
  time += 6000;
  document.hidden = true;
  await documentListeners.visibilitychange();
  assert.equal(checks, 1);
  document.hidden = false;
  await documentListeners.visibilitychange();
  assert.equal(checks, 2);
});

function eventTarget(props = {}) {
  const listeners = new Map();
  return Object.assign(props, {
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
    },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    async emit(name, event) {
      return Promise.all(Array.from(listeners.get(name) || [], fn => fn(event)));
    }
  });
}

function fakeElement(tagName) {
  return eventTarget({
    tagName,
    children: [],
    isConnected: false,
    append(...children) {
      for (const child of children) {
        child.isConnected = true;
        this.children.push(child);
      }
    },
    remove() { this.isConnected = false; },
    setAttribute() {}
  });
}

function updateFixture(update) {
  const replaced = [];
  const initial = eventTarget({ state: "activated" });
  const waiting = eventTarget({ state: "installed", postMessage() {} });
  const registration = eventTarget({ waiting, active: initial, update });
  const serviceWorker = eventTarget({
    controller: initial,
    async register() { return registration; }
  });
  const navigator = { serviceWorker, onLine: true };
  const document = eventTarget({
    readyState: "complete",
    documentElement: { lang: "en" },
    body: fakeElement("body"),
    createElement: fakeElement
  });
  const window = eventTarget({
    matchMedia: () => ({ matches: false }),
    location: {
      href: "https://store.example/espoza-fashion/?source=app#shop",
      replace(url) { replaced.push(url); }
    },
    setInterval() {}
  });
  const runtime = vm.createContext({
    window, navigator, document, URL, MessageChannel, setTimeout, clearTimeout,
    orderSubmissionPending: false, console: { warn() {} }
  });
  vm.runInContext(clientSource, runtime);
  return { window, registration, serviceWorker, runtime, document, waiting, replaced };
}

test("Update now activates the newest installed worker and preserves the current page", { timeout: 2000 }, async () => {
  const readyToActivate = Promise.withResolvers();
  const recheckStarted = Promise.withResolvers();
  let checks = 0;
  const latest = eventTarget({
    state: "installing",
    postMessage(message, ports) {
      if (message.type === "GET_RELEASE") {
        ports[0].postMessage({ release: "1795280003" });
        ports[0].close();
      } else if (message.type === "SKIP_WAITING") {
        readyToActivate.resolve(message.release);
      }
    }
  });
  const app = updateFixture(async function () {
    if (++checks === 2) {
      this.installing = latest;
      recheckStarted.resolve();
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  app.waiting.postMessage = () => assert.fail("An earlier waiting worker was selected");
  const accept = app.document.body.children[0].children[2].children[0];
  const activation = accept.emit("click");
  await recheckStarted.promise;
  assert.equal(accept.textContent, "Updating…");
  assert.deepEqual(app.replaced, []);
  latest.state = "installed";
  app.registration.installing = null;
  app.registration.waiting = latest;
  await latest.emit("statechange");
  assert.equal(await readyToActivate.promise, "1795280003");
  assert.deepEqual(app.replaced, []);

  // An order began while the update was downloading.
  app.runtime.orderSubmissionPending = true;
  app.serviceWorker.controller = latest;
  app.registration.active = latest;
  app.registration.waiting = null;
  await app.serviceWorker.emit("controllerchange");
  assert.deepEqual(app.replaced, []);
  app.runtime.orderSubmissionPending = false;
  await app.window.emit("espoza:order-idle");
  await activation;
  assert.deepEqual(app.replaced, ["https://store.example/espoza-fashion/?source=app&espoza-release=1795280003#shop"]);
});

test("a failed update check leaves the installed app running and offers a retry", async () => {
  let checks = 0;
  const app = updateFixture(async () => {
    if (++checks === 2) throw Error("Network interrupted");
  });
  await new Promise(resolve => setImmediate(resolve));
  const notice = app.document.body.children[0];
  const accept = notice.children[2].children[0];
  await accept.emit("click");
  assert.deepEqual(app.replaced, []);
  assert.equal(accept.disabled, false);
  assert.equal(accept.textContent, "Try again");
  assert.match(notice.children[1].textContent, /could not finish/);
});

test("a release push shows localized device copy and opens the storefront on tap", async () => {
  const root = "https://store.example/espoza-fashion/";
  const listeners = {};
  const seen = [];
  const page = {
    url: root + "#shop",
    async focus() { seen.push("focus"); },
    postMessage(message) { seen.push(message.type); }
  };
  const self = {
    location: new URL(root),
    registration: {
      scope: root,
      async showNotification(title, options) { seen.push([title, options.lang, options.tag]); }
    },
    clients: {
      async matchAll() { return [ { url: root + "admin/" }, page ]; },
      async openWindow() { assert.fail("Opened a duplicate storefront window"); }
    },
    addEventListener(name, handler) { listeners[name] = handler; }
  };
  vm.runInNewContext(workerSource, {
    self, URL,
    importScripts() { self.espozaRelease = "1795280002"; }
  });
  const run = (type, event) => new Promise(resolve => listeners[type]({ ...event, waitUntil: resolve }));
  await run("push", { data: { json: () => ({ type: "release", release: "1795280003", locale: "ar" }) } });
  await run("notificationclick", {
    notification: { data: { type: "release" }, close() { seen.push("close"); } }
  });
  assert.deepEqual(seen, [
    ["تحديث جديد من Espoza", "ar", "espoza-store-update"],
    "close", "focus", "ESPOZA_OPEN_UPDATE"
  ]);
});
