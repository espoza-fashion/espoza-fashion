import "jsr:@supabase/functions-js@2.119.2/edge-runtime.d.ts";
import { createHmac, timingSafeEqual } from "node:crypto";
import webpush from "npm:web-push@3.6.7";

const origin = "https://espoza-fashion.github.io";
const store = origin + "/espoza-fashion/";
const serviceUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

type Subscription = { endpoint: string; p256dh: string; client_auth: string };
type Recipient = Subscription & { id: string; locale: string };
type Credentials = { publicKey: string; privateKey: string; dispatchToken: string };

function reply(body: unknown, status = 200) {
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, content-type",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Vary": "Origin"
  };
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

async function database(path: string, method: string, body?: unknown, prefer?: string) {
  const headers: Record<string, string> = { apikey: serviceKey };
  if (serviceKey.startsWith("eyJ")) headers.Authorization = "Bearer " + serviceKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(serviceUrl + "/rest/v1/" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) throw new Error("Update database request failed: " + response.status);
  if (response.status === 204 || prefer) return null;
  return response.json();
}

async function credentials(): Promise<Credentials> {
  const value = await database("rpc/espoza_update_credentials", "POST", {});
  if (!value?.publicKey || !value?.privateKey || !value?.dispatchToken) {
    throw new Error("Update notification credentials are unavailable");
  }
  return value;
}

function signaturesMatch(provided: string, expected: string) {
  const encoder = new TextEncoder();
  return provided.length === expected.length &&
    timingSafeEqual(encoder.encode(provided), encoder.encode(expected));
}

function parseSubscription(value: any): Subscription | null {
  const endpoint = value?.endpoint;
  const p256dh = value?.keys?.p256dh;
  const auth = value?.keys?.auth;
  if (typeof endpoint !== "string" || endpoint.length > 1024 ||
      typeof p256dh !== "string" || !/^B[A-Za-z0-9_-]{86}$/.test(p256dh) ||
      typeof auth !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(auth)) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return null;
    const valid = (url.hostname === "fcm.googleapis.com" && /^\/(fcm\/send|wp)\/[^/]+$/.test(url.pathname)) ||
      (url.hostname === "updates.push.services.mozilla.com" && url.pathname.startsWith("/wpush/")) ||
      (url.hostname === "web.push.apple.com" || url.hostname.endsWith(".push.apple.com")) ||
      url.hostname.endsWith(".notify.windows.com");
    return valid ? { endpoint, p256dh, client_auth: auth } : null;
  } catch {
    return null;
  }
}

async function checkTurnstile(token: unknown) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret || typeof token !== "string" || token.length < 10 || token.length > 2048) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.hostname === "espoza-fashion.github.io" &&
    result.action === "update_subscription";
}

async function publishedRelease() {
  const url = new URL("app-release.js", store);
  url.searchParams.set("check", String(Math.floor(Date.now() / 60000)));
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error("Release marker is unavailable");
  const match = (await response.text()).match(/^\s*self\.espozaRelease\s*=\s*"(\d{1,12})";\s*$/);
  if (!match) throw new Error("Invalid release marker");
  return match[1];
}

async function notify(recipient: Recipient, release: string, keys: Credentials) {
  const params = parseSubscription({
    endpoint: recipient.endpoint,
    keys: { p256dh: recipient.p256dh, auth: recipient.client_auth }
  });
  const path = "espoza_update_subscriptions?" + new URLSearchParams({ id: "eq." + recipient.id });
  if (!params) {
    await database(path, "DELETE", undefined, "return=minimal");
    return "expired";
  }
  const details = webpush.generateRequestDetails({
    endpoint: params.endpoint,
    keys: { p256dh: params.p256dh, auth: params.client_auth }
  }, JSON.stringify({ type: "release", release, locale: recipient.locale }), {
    vapidDetails: { subject: store, publicKey: keys.publicKey, privateKey: keys.privateKey },
    TTL: 60 * 60 * 24,
    urgency: "normal",
    topic: "espoza_release"
  });

  const response = await fetch(details.endpoint, {
    method: details.method,
    headers: details.headers as Record<string, string>,
    body: new Uint8Array(details.body),
    redirect: "error",
    signal: AbortSignal.timeout(7000)
  });
  if (response.ok) {
    await database(path, "PATCH", { last_release: Number(release), retry_after: new Date().toISOString() }, "return=minimal");
    return "sent";
  }
  if (response.status === 404 || response.status === 410) {
    await database(path, "DELETE", undefined, "return=minimal");
    return "expired";
  }
  return "retry";
}

async function dispatch(keys: Credentials) {
  const release = await publishedRelease();
  const recipients: Recipient[] = await database("rpc/claim_espoza_update_notifications", "POST", {
    target_release: Number(release)
  });
  const counts = { sent: 0, expired: 0, retry: 0 };
  for (let offset = 0; offset < recipients.length; offset += 12) {
    const batch = recipients.slice(offset, offset + 12);
    const results = await Promise.all(batch.map(row => notify(row, release, keys).catch(() => "retry" as const)));
    for (const result of results) counts[result]++;
  }
  return reply({ release, ...counts });
}

Deno.serve(async request => {
  try {
    const signature = request.headers.get("X-Espoza-Dispatch-Signature");
    if (signature !== null) {
      const timestamp = request.headers.get("X-Espoza-Dispatch-Time") || "";
      if (request.method !== "POST" || !/^[0-9a-f]{64}$/.test(signature) ||
          !/^\d{10,12}$/.test(timestamp) ||
          Math.abs(Date.now() / 1000 - Number(timestamp)) > 90) {
        return reply({ error: "Forbidden" }, 403);
      }
      const keys = await credentials();
      const expected = createHmac("sha256", keys.dispatchToken).update("espoza-release:" + timestamp).digest("hex");
      if (!signaturesMatch(signature, expected)) {
        return reply({ error: "Forbidden" }, 403);
      }
      return await dispatch(keys);
    }

    if (request.headers.get("Origin") !== origin) return reply({ error: "Forbidden" }, 403);
    if (request.method === "OPTIONS") return reply(null, 204);
    if (request.method === "GET") return reply({ publicKey: (await credentials()).publicKey });
    if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);

    const data = await request.text();
    if (data.length > 6144) return reply({ error: "Invalid request" }, 400);
    let body: any;
    try { body = JSON.parse(data); } catch { return reply({ error: "Invalid request" }, 400); }
    const subscription = parseSubscription(body?.subscription);
    if (!subscription) return reply({ error: "Invalid subscription" }, 400);

    if (body.action === "unsubscribe") {
      const filter = new URLSearchParams({
        endpoint: "eq." + subscription.endpoint,
        client_auth: "eq." + subscription.client_auth
      });
      await database("espoza_update_subscriptions?" + filter, "DELETE", undefined, "return=minimal");
      return reply({ ok: true });
    }
    if (body.action !== "subscribe") return reply({ error: "Invalid subscription action" }, 400);
    if (!await checkTurnstile(body.turnstileToken)) return reply({ error: "Verification failed" }, 403);

    const locale = ["ar", "en", "he"].includes(body.locale) ? body.locale : "ar";
    await database("espoza_update_subscriptions?on_conflict=endpoint", "POST", {
      ...subscription, locale, last_release: Number(await publishedRelease())
    }, "resolution=ignore-duplicates,return=minimal");
    return reply({ ok: true });
  } catch (error) {
    console.error("Espoza update notifications failed:", error instanceof Error ? error.message : "Unknown error");
    return reply({ error: "Update notifications unavailable" }, 503);
  }
});
