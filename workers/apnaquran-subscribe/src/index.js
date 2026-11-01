const BREVO_ENDPOINT = "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";
const ALLOWED_ORIGINS = new Set([
  "https://apnaquran.com",
  "https://www.apnaquran.com"
]);

function json(body, status = 200, origin = null) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/subscribe") {
      return new Response("Not found", { status: 404 });
    }

    const origin = request.headers.get("Origin");
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "Request not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, origin);
    }

    if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) {
      return json({ error: "Invalid request format." }, 415, origin);
    }

    const apiKey = env.BREVO_API_KEY;
    const templateId = Number(env.BREVO_DOI_TEMPLATE_ID);
    if (!apiKey || !Number.isSafeInteger(templateId) || templateId < 1) {
      return json({ error: "Signup is temporarily unavailable. Please try again later." }, 503, origin);
    }

    let data;
    try {
      const raw = await request.text();
      if (raw.length > 2048) return json({ error: "Invalid request." }, 413, origin);
      data = JSON.parse(raw);
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return json({ error: "Invalid request." }, 400, origin);
      }
    } catch {
      return json({ error: "Please enter a valid email address." }, 400, origin);
    }

    // Quietly accept bot submissions without sending mail.
    if (typeof data.website === "string" && data.website.trim()) {
      return json({ ok: true }, 200, origin);
    }

    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Please enter a valid email address." }, 400, origin);
    }

    let response;
    try {
      response = await fetch(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "accept": "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email,
          includeListIds: [3],
          templateId,
          redirectionUrl: "https://apnaquran.com/?subscription=confirmed"
        })
      });
    } catch {
      return json({ error: "We couldn't reach the signup service. Please try again shortly." }, 502, origin);
    }

    if (response.status === 201 || response.status === 204) {
      return json({ ok: true }, 200, origin);
    }
    if (response.status === 400 || response.status === 409) {
      return json({ error: "We couldn't process this address. Please check it or try again." }, 400, origin);
    }
    if (response.status === 429) {
      return json({ error: "Too many attempts. Please try again later." }, 429, origin);
    }
    return json({ error: "Signup is temporarily unavailable. Please try again later." }, 502, origin);
  }
};
