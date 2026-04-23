// Vercel Serverless Function — single-item category/location suggester
// Called from the Add buttons (Grocery + Misc) as a fallback when keyword
// detection doesn't match. Uses Haiku for cost/latency reasons.

const ALLOWED_GROCERY_CATEGORIES = [
  "Obst & Gemüse","Bäckerei & Brot","Fisch & Meeresfrüchte",
  "Pflanzliche Proteine","Fleisch & Wurst","Milchprodukte pflanzlich & Milch",
  "Käse & Aufschnitt","Tiefkühl","Trockenwaren & Backen",
  "Konserven & Saucen","Gewürze & Öl","Getränke","Snacks & Süßes",
];

const ALLOWED_MISC_LOCATIONS = [
  "Apotheke","Baumarkt","Hygieneartikel","Haushalt","Zoohandlung",
  "Kleidung","Bücher & Büro","Elektro & Technik","Geschenke","Sonstiges",
];

// In-memory rate limit (resets on cold start — good enough for 2 users)
const rateLimitStore = new Map();
function checkRateLimit(userId) {
  const now = Date.now();
  const window = 3600 * 1000;
  const max = 30;
  const timestamps = (rateLimitStore.get(userId) || []).filter(t => t > now - window);
  if (timestamps.length >= max) {
    const retryAfter = Math.ceil((timestamps[0] + window - now) / 1000) + 1;
    return { allowed: false, retryAfter };
  }
  timestamps.push(now);
  rateLimitStore.set(userId, timestamps);
  return { allowed: true, retryAfter: 0 };
}

function extractJson(raw) {
  if (!raw) throw new Error("Empty response");
  const fence = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  let candidate = fence ? fence[1] : raw;
  if (!fence) {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first !== -1 && last > first) candidate = candidate.slice(first, last + 1);
  }
  return JSON.parse(candidate);
}

const PROMPT_GROCERY = `Du ordnest einen einzelnen deutschen Einkaufsartikel einer von 13 Lebensmittelkategorien zu.
Gib AUSSCHLIESSLICH gültiges JSON zurück, ohne Markdown oder Kommentare.
Format: {"category": string}
Erlaubte Kategorien (wörtlich): ["Obst & Gemüse","Bäckerei & Brot","Fisch & Meeresfrüchte","Pflanzliche Proteine","Fleisch & Wurst","Milchprodukte pflanzlich & Milch","Käse & Aufschnitt","Tiefkühl","Trockenwaren & Backen","Konserven & Saucen","Gewürze & Öl","Getränke","Snacks & Süßes"]
Wenn unklar oder nicht lebensmittelbezogen → "Konserven & Saucen".`;

const PROMPT_MISC = `Du ordnest einen einzelnen deutschen Non-Food-Einkaufsartikel einer von 10 Kategorien zu.
Gib AUSSCHLIESSLICH gültiges JSON zurück, ohne Markdown oder Kommentare.
Format: {"location_tag": string}
Erlaubte Kategorien (wörtlich): ["Apotheke","Baumarkt","Hygieneartikel","Haushalt","Zoohandlung","Kleidung","Bücher & Büro","Elektro & Technik","Geschenke","Sonstiges"]
Kurz-Definitionen: Apotheke=Medikamente/Vitamine/Pflaster. Baumarkt=Werkzeug/Schrauben/Farbe/Garten. Hygieneartikel=Körperpflege/Make-up/Damenhygiene. Haushalt=Putzmittel/Waschmittel/Alufolie/Kerzen. Zoohandlung=Tierbedarf. Kleidung=Textilien/Schuhe. Bücher & Büro=Stifte/Hefte/Papier/Bücher. Elektro & Technik=Kabel/Batterien/Ladegeräte/Glühbirnen. Geschenke=Grußkarten/Geschenkpapier/konkrete Geschenke. Sonstiges=alles andere.
Wenn unklar → "Sonstiges".`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  const { user_id, name, mode = "grocery" } = req.body || {};
  if (!user_id) return res.status(400).json({ detail: "user_id fehlt." });
  if (!name?.trim()) return res.status(400).json({ detail: "name darf nicht leer sein." });
  if (name.length > 100) return res.status(400).json({ detail: "name zu lang (max. 100 Zeichen)." });
  if (mode !== "grocery" && mode !== "misc") return res.status(400).json({ detail: "mode muss 'grocery' oder 'misc' sein." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ detail: "ANTHROPIC_API_KEY nicht konfiguriert." });

  const { allowed, retryAfter } = checkRateLimit(user_id);
  if (!allowed) {
    return res.status(429)
      .setHeader("Retry-After", String(retryAfter))
      .json({ detail: `Rate limit erreicht. Bitte in ${retryAfter} Sekunden erneut versuchen.` });
  }

  const systemPrompt = mode === "misc" ? PROMPT_MISC : PROMPT_GROCERY;

  let rawResponse = null;
  try {
    const r = await Promise.race([
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 128,
          system: systemPrompt,
          messages: [{ role: "user", content: name.trim() }],
        }),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic ${r.status}`);
    }
    const data = await r.json();
    rawResponse = data.content?.[0]?.text || "";
  } catch (e) {
    const isTimeout = e.message === "timeout";
    return res.status(isTimeout ? 504 : 502).json({ detail: "KI-Service nicht erreichbar." });
  }

  let parsed;
  try {
    parsed = extractJson(rawResponse);
  } catch {
    return res.status(502).json({ detail: "KI-Antwort konnte nicht verarbeitet werden." });
  }

  if (mode === "misc") {
    let tag = String(parsed?.location_tag || "").trim();
    if (!ALLOWED_MISC_LOCATIONS.includes(tag)) tag = "Sonstiges";
    return res.status(200).json({ location_tag: tag });
  } else {
    let category = String(parsed?.category || "").trim();
    if (!ALLOWED_GROCERY_CATEGORIES.includes(category)) category = "Konserven & Saucen";
    return res.status(200).json({ category });
  }
}
