import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://apnaquran.com",
  "https://www.apnaquran.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

const MODEL = "models/gemini-3.8-live-extended-thinking";

const SYSTEM_INSTRUCTION = `You are the voice assistant for ApnaQuran.com. Be respectful, warm, concise, and clear. Help visitors navigate the website and discuss general Islamic learning carefully. Never invent Quran verses, surah/ayah references, hadith wording, citations, or scholarly rulings. If you cannot verify a religious claim, say so and direct the visitor to the Quran reader on ApnaQuran.com or a qualified scholar. Do not claim to be a scholar. Reply naturally for spoken conversation. Speak in the language the visitor uses when possible.`;

function json(data: unknown, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") {
    if (!ALLOWED_ORIGINS.has(origin)) return new Response("Origin not allowed.", { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin",
      },
    });
  }

  if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed." }, 403, origin);
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);

  const apiKey = Deno.env.get("GEMINI_LIVE_API_KEY");
  if (!apiKey) return json({ error: "GEMINI_LIVE_API_KEY is not configured." }, 503, origin);

  try {
    // Mint a short-lived, single-use token. The permanent API key never reaches the browser.
    const now = Date.now();
    const tokenResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        uses: 1,
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
        expireTime: new Date(now + 30 * 60_000).toISOString(),
        liveConnectConstraints: {
          model: MODEL,
          config: {
            responseModalities: ["AUDIO"],
            thinkingConfig: { thinkingLevel: "LOW" },
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: {},
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          },
        },
      }),
    });

    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) {
      console.error("Gemini token provisioning failed:", tokenResponse.status, JSON.stringify(tokenData).slice(0, 1200));
      return json({
        error: "Gemini Live token could not be created.",
        status: tokenResponse.status,
        details: tokenData?.error?.message ?? "The provider did not return a detailed message.",
      }, 502, origin);
    }

    if (typeof tokenData?.name !== "string" || !tokenData.name) {
      console.error("Gemini token response missing token name.");
      return json({ error: "Gemini returned an unexpected token response." }, 502, origin);
    }

    return json({
      token: tokenData.name,
      model: MODEL,
      expiresAt: tokenData.expireTime ?? new Date(now + 30 * 60_000).toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error("Live token function failed:", error instanceof Error ? error.message : String(error));
    return json({ error: "Could not prepare the live voice session. Please try again later." }, 500, origin);
  }
});
