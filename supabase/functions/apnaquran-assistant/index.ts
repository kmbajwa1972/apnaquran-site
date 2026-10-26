import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODEL = "gemini-3.8-flash";
const ALLOWED_ORIGINS = new Set([
  "https://apnaquran.com",
  "https://www.apnaquran.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);
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
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsBase,
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://apnaquran.com",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed." }, 403, origin);
  if (!GEMINI_API_KEY) return json({ error: "The assistant is not configured yet. Please try again later." }, 503, origin);

  try {
    const payload = await req.json();
    const message = typeof payload?.message === "string" ? payload.message.trim() : "";
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
- Reply in the language the visitor uses (English or Urdu where possible). Keep answers brief and easy to listen to.
- Do not claim that you searched or verified an external source unless you actually did.
- If asked for emergency, medical, legal, or other high-stakes advice, provide appropriate general safety guidance and recommend a qualified professional.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.35, maxOutputTokens: 700 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API returned", response.status, err.slice(0, 500));
      if (response.status === 429) return json({ error: "The free-tier request limit has been reached temporarily. Please wait a little and try again." }, 429, origin);
      if (response.status === 401 || response.status === 403) return json({ error: "The AI provider rejected the API key or model access. Please check the server configuration." }, 502, origin);
      return json({ error: "The AI service is temporarily unavailable. Please try again shortly." }, 502, origin);
    }
    const result = await response.json();
    const reply = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("\n").trim();
    if (!reply) return json({ error: "I couldn't prepare a reliable answer just now. Please try again." }, 502, origin);
    return json({ reply }, 200, origin);
  } catch (error) {
    console.error("ApnaQuran assistant error:", error instanceof Error ? error.message : String(error));
    return json({ error: "The assistant could not connect just now. Please try again." }, 500, origin);
  }
});
