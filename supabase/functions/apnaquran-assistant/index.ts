import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash"];
const FREETTS_API_KEY = Deno.env.get("FREETTS_API_KEY") ?? "";
const ALLOWED_ORIGINS = new Set([
  "https://apnaquran.com",
  "https://www.apnaquran.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

// Lightweight per-runtime guardrail. This reduces bursts but is not a global quota:
// Edge Function instances do not share memory, so provider-side quotas remain essential.
const WINDOW_MS = 60_000;
const DAILY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_MINUTE = 6;
const MAX_PER_DAY = 40;
const clientUsage = new Map<string, { minuteStart: number; minuteCount: number; dayStart: number; dayCount: number }>();
const MAX_TRACKED_CLIENTS = 5000;

const corsBase = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsBase,
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://apnaquran.com",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function rateLimitKey(req: Request) {
  // Prefer the platform-provided client address; never log it.
  return req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim() ??
    "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  let usage = clientUsage.get(key);
  if (!usage) {
    if (clientUsage.size >= MAX_TRACKED_CLIENTS) {
      const oldestKey = clientUsage.keys().next().value;
      if (oldestKey) clientUsage.delete(oldestKey);
    }
    usage = { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
    clientUsage.set(key, usage);
  }
  if (now - usage.minuteStart >= WINDOW_MS) {
    usage.minuteStart = now;
    usage.minuteCount = 0;
  }
  if (now - usage.dayStart >= DAILY_MS) {
    usage.dayStart = now;
    usage.dayCount = 0;
  }
  if (usage.minuteCount >= MAX_PER_MINUTE || usage.dayCount >= MAX_PER_DAY) return true;
  usage.minuteCount++;
  usage.dayCount++;
  return false;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    ...corsBase,
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://apnaquran.com",
  }});
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed." }, 403, origin);
  if (!GEMINI_API_KEY) return json({ error: "The assistant is not configured yet. Please try again later." }, 503, origin);

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (declaredLength > 20_000) return json({ error: "Request is too large." }, 413, origin);
  if (isRateLimited(rateLimitKey(req))) {
    return json({ error: "You have reached the assistant's temporary usage limit. Please wait before trying again." }, 429, origin);
  }

  try {
    const payload = await req.json();
    if (payload?.action === "tts") {
      const text = typeof payload.text === "string" ? payload.text.trim() : "";
      if (!text || text.length > 1000) return json({ error: "Speech text must be between 1 and 1,000 characters." }, 400, origin);
      if (!FREETTS_API_KEY) return json({ error: "Urdu speech is not configured yet. Add the FREETTS_API_KEY secret in Supabase." }, 503, origin);
      let ttsResponse: Response;
      try {
        ttsResponse = await fetch("https://freetts.org/api/v1/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": FREETTS_API_KEY },
          body: JSON.stringify({ text, voice: "ur-PK-UzmaNeural", rate: "-10%", pitch: "+0Hz", output_format: "mp3" }),
          signal: AbortSignal.timeout(20000),
        });
      } catch (_) {
        return json({ error: "Urdu speech service timed out. Please try again." }, 504, origin);
      }
      if (!ttsResponse.ok) {
        const providerError = (await ttsResponse.text().catch(() => "")).slice(0, 400)
          .replaceAll(FREETTS_API_KEY, "[redacted]");
        console.error("FreeTTS generation failed", JSON.stringify({ status: ttsResponse.status, providerError }));
        return json({ error: ttsResponse.status === 429 ? "FreeTTS usage limit reached. Please try again later." : "FreeTTS rejected the Urdu speech request. The provider error has been recorded privately for diagnosis." }, ttsResponse.status === 429 ? 429 : 502, origin);
      }
      const ttsData = await ttsResponse.json().catch(() => ({}));
      if (typeof ttsData?.file_id !== "string" || !/^[a-f0-9-]{20,}$/i.test(ttsData.file_id)) {
        return json({ error: "FreeTTS returned an invalid audio reference." }, 502, origin);
      }
      const audioResponse = await fetch("https://freetts.org/api/audio/" + encodeURIComponent(ttsData.file_id), { signal: AbortSignal.timeout(20000) });
      if (!audioResponse.ok) return json({ error: "Could not download generated Urdu audio." }, 502, origin);
      return new Response(await audioResponse.arrayBuffer(), { status: 200, headers: { ...corsBase, "Access-Control-Allow-Origin": origin, "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const message = typeof payload?.message === "string" ? payload.message.trim() : "";
    const requestedLanguage = payload?.language === "ur" || payload?.language === "en" ? payload.language : "auto";
    const history = Array.isArray(payload?.history) ? payload.history.slice(-6) : [];
    if (!message) return json({ error: "Please enter a question." }, 400, origin);
    if (message.length > 1200) return json({ error: "Please keep your question under 1,200 characters." }, 413, origin);

    const contents = [];
    for (const item of history) {
      if (!item || !["user", "model"].includes(item.role) || typeof item.text !== "string") continue;
      contents.push({ role: item.role, parts: [{ text: item.text.slice(0, 1200) }] });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const systemInstruction = `You are the ApnaQuran website assistant. Be warm, respectful, concise, and helpful. You may help visitors navigate the website and discuss general Islamic learning.
Important accuracy and religious-safety rules:
- Never invent Quran verses, Arabic text, surah names, ayah numbers, hadith wording, sources, or scholarly rulings.
- Do not claim a quotation or exact reference unless you are certain. If asked for a specific verse or exact religious ruling and you cannot verify it, say so clearly and guide the visitor to the site's Quran reader or a qualified scholar.
- Distinguish general explanation from established religious text. For disputed matters, acknowledge differences and recommend consulting a qualified scholar.
- Never present yourself as a mufti or religious authority.
- Reply in the requested language. If the requested language is Urdu, or the visitor writes in Urdu script or Roman Urdu, reply in natural Urdu written in Urdu script (اردو), NOT Roman Urdu. Example: use "وعلیکم السلام! میں آپ کی کیا مدد کر سکتا ہوں؟" rather than "Wa alaikum assalam". If it is auto, infer from the latest user message and treat common Roman Urdu as Urdu. For substantive questions, answer every part of the question in a complete, useful response. In Urdu, write 4–6 clear, complete sentences in Urdu script when explanation is needed; include the main teaching and a brief practical explanation, not just a greeting or fragment. For simple greetings, a greeting alone is fine. Avoid repeating the previous answer unless the visitor asks you to repeat it. Use clear Urdu punctuation and complete sentences. Never stop mid-sentence; finish the final sentence before ending. Keep the answer concise, but do not omit essential explanation.
- Do not claim that you searched or verified an external source unless you actually did.
- If asked for emergency, medical, legal, or other high-stakes advice, provide appropriate general safety guidance and recommend a qualified professional.`;

    let response: Response | null = null;
    let activeModel = "";
    for (const model of MODELS) {
      try {
        const candidate = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction + "\n\nRequested response language: " + requestedLanguage }] },
            contents,
            generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
          }),
          signal: AbortSignal.timeout(25000),
        });
        response = candidate;
        activeModel = model;
        if (candidate.ok) break;
        console.error("Gemini API returned", candidate.status, "for model", model);
        // Do not retry rate limits or credential failures; fail over only on server/provider outages.
        if (![500, 502, 503, 504].includes(candidate.status)) break;
      } catch (error) {
        console.error("Gemini request failed for model", model, error instanceof Error ? error.message : String(error));
        if (model === MODELS[MODELS.length - 1]) {
          return json({ error: "The AI service timed out. Please try again shortly." }, 504, origin);
        }
      }
    }
    if (!response) return json({ error: "The AI service timed out. Please try again shortly." }, 504, origin);

    if (!response.ok) {
      console.error("Gemini fallback exhausted; last model:", activeModel, "status:", response.status);
      if (response.status === 401 || response.status === 403) {
        return json({ error: "The AI provider rejected the API key or model access. Please check the server configuration." }, 502, origin);
      }
      if (response.status === 429) {
        return json({ error: "The AI provider's request limit has been reached temporarily. Please wait and try again." }, 429, origin);
      }
      if ([500, 502, 503, 504].includes(response.status)) {
        return json({ error: "The AI service is temporarily busy. Please try again shortly." }, 503, origin);
      }
      return json({ error: "The AI service could not process that request. Please try again shortly." }, 502, origin);
    }

    const result = await response.json();
    const reply = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("\n").trim();
    if (!reply) return json({ error: "I couldn't prepare a reliable answer just now. Please try again." }, 502, origin);
    return json({ reply }, 200, origin);
  } catch (error) {
    console.error("ApnaQuran assistant error:", error instanceof Error ? error.message : String(error));
    return json({ error: "The assistant could not process that request just now. Please try again." }, 500, origin);
  }
});