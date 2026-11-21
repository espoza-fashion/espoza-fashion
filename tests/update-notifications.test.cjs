const assert = require("node:assert/strict");
const { createHmac, timingSafeEqual } = require("node:crypto");
const fs = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const { test } = require("node:test");
const vm = require("node:vm");

const source = stripTypeScriptTypes(
  fs.readFileSync("supabase/functions/espoza-updates/index.ts", "utf8").replace(/^import .*;\n/gm, "")
);
const origin = "https://espoza-fashion.github.io";
const release = "1795280003";
const signingKey = "test-dispatch-signing-key";
const device = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test-device",
  keys: { p256dh: "B" + "a".repeat(86), auth: "a".repeat(22) }
};

function fixture({ verified = true, pushStatus = 201 } = {}) {
  let handle;
  const calls = [];
  const payloads = [];
  const credentials = { publicKey: device.keys.p256dh, privateKey: "test-only", dispatchToken: signingKey };
  const recipient = {
    id: "test-device-1", endpoint: device.endpoint,
    client_auth: device.keys.auth, p256dh: device.keys.p256dh, locale: "ar"
  };
  vm.runInNewContext(source, {
    Deno: {
      env: { get: key => ({ SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "test-only", TURNSTILE_SECRET_KEY: "test-only" })[key] },
      serve: fn => { handle = fn; }
    },
    URL, URLSearchParams, Response, AbortSignal, TextEncoder, createHmac, timingSafeEqual,
    webpush: {
      generateRequestDetails(subscription, payload) {
        payloads.push(JSON.parse(payload));
        return { endpoint: subscription.endpoint, method: "POST", body: [1, 2, 3] };
      }
    },
    fetch: async (input, options = {}) => {
      const url = new URL(input);
      calls.push({ url, options });
      if (url.hostname === "challenges.cloudflare.com") {
        return Response.json({ success: verified, hostname: "espoza-fashion.github.io", action: "update_subscription" });
      }
      if (url.pathname.endsWith("app-release.js")) return new Response('self.espozaRelease = "' + release + '";');
      if (url.pathname.endsWith("espoza_update_credentials")) return Response.json(credentials);
      if (url.pathname.endsWith("claim_espoza_update_notifications")) return Response.json([recipient]);
      if (url.hostname === "fcm.googleapis.com") return new Response(null, { status: pushStatus });
      if (url.pathname.endsWith("espoza_update_subscriptions")) return new Response(null, { status: 204 });
      throw new Error("Unexpected network request");
    }
  });
  return { handle, calls, payloads };
}

function request(method, body, headers = { Origin: origin }) {
  return new Request("https://edge.example/espoza-updates", {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
}

test("device subscriptions require verification and start from the published release", async () => {
  const denied = fixture({ verified: false });
  const values = { action: "subscribe", subscription: device, turnstileToken: "sample-test-token", locale: "he" };
  assert.equal((await denied.handle(request("POST", values))).status, 403);
  assert.equal(denied.calls.length, 1);

  const allowed = fixture();
  assert.equal((await allowed.handle(request("POST", values))).status, 200);
  const write = allowed.calls.find(call => call.url.pathname.endsWith("espoza_update_subscriptions"));
  const row = JSON.parse(write.options.body);
  assert.equal(row.locale, "he");
  assert.equal(row.last_release, Number(release));
  const config = await (await allowed.handle(request("GET"))).json();
  assert.deepEqual(Object.keys(config), ["publicKey"]);
});

test("signed release dispatch records deliveries and discards expired subscriptions", async () => {
  function dispatch(timestamp, key) {
    const digest = createHmac("sha256", key).update("espoza-release:" + timestamp).digest("hex");
    return request("POST", null, {
      "X-Espoza-Dispatch-Time": String(timestamp),
      "X-Espoza-Dispatch-Signature": digest
    });
  }
  const now = Math.floor(Date.now() / 1000);
  const app = fixture();
  assert.equal((await app.handle(dispatch(now - 120, signingKey))).status, 403);
  assert.equal((await app.handle(dispatch(now, "wrong-key"))).status, 403);
  assert.equal(app.payloads.length, 0);

  const delivered = await (await app.handle(dispatch(now, signingKey))).json();
  assert.equal(delivered.sent, 1);
  assert.deepEqual(app.payloads, [{ type: "release", release, locale: "ar" }]);
  const update = app.calls.find(call => call.options.method === "PATCH");
  assert.equal(JSON.parse(update.options.body).last_release, Number(release));

  const expired = fixture({ pushStatus: 410 });
  const removed = await (await expired.handle(dispatch(now, signingKey))).json();
  assert.equal(removed.expired, 1);
  assert.ok(expired.calls.some(call => call.options.method === "DELETE"));
});
