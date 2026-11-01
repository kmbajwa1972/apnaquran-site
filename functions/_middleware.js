/**
 * ApnaQuran publisher password gate for Cloudflare Pages. Redeploy check.
 * Requires AUTH_PASSWORD and AUTH_SECRET environment variables in Pages.
 * Fails closed if either secret is missing.
 */
const COOKIE_NAME = "__Host-aq_publisher_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

function html(body, status = 200) {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>ApnaQuran Publisher Login</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f7f4;color:#183b2b;font:16px system-ui,sans-serif;padding:24px}
main{width:min(100%,420px);background:white;border:1px solid #dce7df;border-radius:18px;padding:30px;box-shadow:0 12px 40px #183b2b12}
h1{font-size:1.5rem;margin:0 0 8px}p{line-height:1.5;color:#52655a}label{display:block;font-weight:600;margin:20px 0 8px}
input{width:100%;padding:13px;border:1px solid #b9c9be;border-radius:9px;font:inherit}button{width:100%;margin-top:16px;padding:13px;border:0;border-radius:9px;background:#185c3a;color:white;font:inherit;font-weight:700;cursor:pointer}
.error{color:#a12626;min-height:1.4em}small{color:#68786d}
</style></head><body><main><h1>ApnaQuran Publisher</h1><p>This private dashboard requires the publisher password.</p>
${body}
<small>Access is restricted. Do not share this page's password.</small></main></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" }
  });
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
async function sign(secret, timestamp) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("apnaquran-publisher:" + timestamp)));
}
async function validSession(request, secret) {
  const raw = request.headers.get("Cookie") || "";
  const part = raw.split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE_NAME + "="));
  if (!part) return false;
  const value = part.slice(COOKIE_NAME.length + 1);
  const dot = value.indexOf(".");
  if (dot < 1) return false;
  const timestamp = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!/^\d{10,13}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const issued = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issued) || issued > now + 60 || now - issued > SESSION_SECONDS) return false;
  const expected = await sign(secret, timestamp);
  return constantTimeEqual(new TextEncoder().encode(signature), new TextEncoder().encode(expected));
}
function loginForm(error = "") {
  return `<form method="post" action="/__aq_login"><label for="password">Publisher password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
<p class="error" role="alert">${error}</p><button type="submit">Sign in</button></form>`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  // Public newsletter endpoint: let its dedicated Pages Function validate and handle this request.
  if (url.pathname === "/api/subscribe") return context.next();

  const password = env.AUTH_PASSWORD;
  const secret = env.AUTH_SECRET;

  // Fail closed: never serve the dashboard if the gate is not configured.
  if (typeof password !== "string" || password.length < 12 || typeof secret !== "string" || secret.length < 32) {
    return new Response("Publisher access is not configured. Contact the administrator.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
  }

  // A fresh click from the public site must always require the password, even if a prior session cookie exists.
  if (url.pathname === "/" && url.searchParams.get("login") === "1") {
    return html(loginForm());
  }

  if (url.pathname === "/__aq_logout") {
    return new Response(null, { status: 303, headers: {
      "Location": "/",
      "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
      "Cache-Control": "no-store"
    }});
  }

  if (url.pathname === "/__aq_login") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { "Allow": "POST", "Cache-Control": "no-store" } });
    let submitted = "";
    try {
      const form = await request.formData();
      submitted = String(form.get("password") || "");
    } catch {
      return html(loginForm("Invalid request."), 400);
    }
    if (submitted.length > 1024 || !constantTimeEqual(await sha256(submitted), await sha256(password))) {
      return html(loginForm("Incorrect password. Please try again."), 401);
    }
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await sign(secret, timestamp);
    return new Response(null, { status: 303, headers: {
      "Location": "/weekly-verse.html",
      "Set-Cookie": `${COOKIE_NAME}=${timestamp}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`,
      "Cache-Control": "no-store"
    }});
  }

  if (await validSession(request, secret)) {
    // The publisher domain should open the publisher dashboard, not the public Quran homepage.
    if (url.pathname === "/") {
      return new Response(null, { status: 302, headers: { "Location": "/weekly-verse.html", "Cache-Control": "no-store" } });
    }
    return context.next();
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Authentication required", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return html(loginForm());
}
