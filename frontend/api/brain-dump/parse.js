// Vercel Serverless Function — Brain Dump AI Parser
// Replaces the Python FastAPI backend/server.py endpoint

const ALLOWED_CATEGORIES = [
  "Obst & Gemüse","Bäckerei & Brot","Fisch & Meeresfrüchte",
  "Pflanzliche Proteine","Fleisch & Wurst","Milchprodukte pflanzlich & Milch",
  "Käse & Aufschnitt","Tiefkühl","Trockenwaren & Backen",
  "Konserven & Saucen","Gewürze & Öl","Getränke","Snacks & Süßes",
];
const ALLOWED_UNITS = ["Stück","g","kg","ml","L","Packung","Dose","Flasche","Bund","Glas"];
const ALLOWED_MISC_LOCATIONS = ["Apotheke","Baumarkt","Drogerie","Zoohandlung","Kleidung","Sonstiges"];
const ALLOWED_PRIORITIES = ["high","medium","low"];

// In-memory rate limit (resets on cold start — good enough for 2 users)
const rateLimitStore = new Map();
function checkRateLimit(userId) {
  const now = Date.now();
  const window = 3600 * 1000;
  const max = 10;
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

function normalizeGrocery(item) {
  const name = String(item.name || "").trim();
  if (!name) return null;

  // Menge: nur setzen wenn explizit genannt (Zahl > 0), sonst null
  let quantity = parseFloat(item.quantity);
  if (!quantity || quantity <= 0) quantity = null;

  // Einheit: nur setzen wenn explizit und erlaubt, sonst null
  let unit = item.unit ? String(item.unit).trim() : null;
  if (unit && !ALLOWED_UNITS.includes(unit)) unit = null;

  let category = String(item.category || "").trim();
  if (!ALLOWED_CATEGORIES.includes(category)) category = "Konserven & Saucen";

  return { name, quantity, unit, category, note: String(item.note || "").trim() };
}

function normalizeMisc(item) {
  const name = String(item.name || "").trim();
  if (!name) return null;
  let location_tag = String(item.location_tag || "").trim();
  if (!ALLOWED_MISC_LOCATIONS.includes(location_tag)) location_tag = "Sonstiges";
  return { name, location_tag, note: String(item.note || "").trim() };
}

function normalizeTodo(item) {
  const title = String(item.title || "").trim();
  if (!title) return null;
  let priority = String(item.priority || "medium").trim().toLowerCase();
  if (!ALLOWED_PRIORITIES.includes(priority)) priority = "medium";
  let due_date = item.due_date ? String(item.due_date).trim() : null;
  if (due_date) {
    try {
      const d = new Date(due_date);
      if (isNaN(d.getTime()) || d < new Date(Date.now() - 30 * 86400 * 1000)) due_date = null;
      else due_date = d.toISOString();
    } catch { due_date = null; }
  }
  return {
    title,
    priority,
    due_date,
    assignee_hint: String(item.assignee_hint || "").trim(),
    comment: String(item.comment || "").trim(),
  };
}

function normalizeExpense(item) {
  let amount = item.amount;
  if (typeof amount === "string") amount = parseFloat(amount.replace(",", ".").replace("€", ""));
  amount = parseFloat(amount);
  if (!amount || amount <= 0) return null;
  const description = String(item.description || "").trim() || "Ausgabe";
  const validCats = ["Essen","Haushalt","Transport","Unterhaltung","Sonstiges"];
  let category = String(item.category || "").trim();
  if (!validCats.includes(category)) category = "Sonstiges";
  let expense_date = item.expense_date ? String(item.expense_date).trim() : null;
  if (expense_date) {
    try {
      const d = new Date(expense_date);
      if (isNaN(d.getTime()) || d < new Date(Date.now() - 60 * 86400 * 1000)) expense_date = null;
      else expense_date = d.toISOString().split("T")[0];
    } catch { expense_date = null; }
  }
  return { description, amount: Math.round(amount * 100) / 100, category, expense_date };
}

const PROMPT_GROCERY = `Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in strukturierte Einkaufslisten-Einträge umwandelt.
Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Kommentare, keine Markdown-Codeblöcke.
Format: {"items": [{"name": string, "quantity": number|null, "unit": string|null, "category": string, "note": string}, ...]}
Kategorien (wörtlich): ["Obst & Gemüse","Bäckerei & Brot","Fisch & Meeresfrüchte","Pflanzliche Proteine","Fleisch & Wurst","Milchprodukte pflanzlich & Milch","Käse & Aufschnitt","Tiefkühl","Trockenwaren & Backen","Konserven & Saucen","Gewürze & Öl","Getränke","Snacks & Süßes"]
Einheiten (wenn genannt): ["Stück","g","kg","ml","L","Packung","Dose","Flasche","Bund","Glas"]
WICHTIG zu Menge und Einheit:
- quantity: NUR setzen wenn im Text explizit eine Zahl steht ("500g Mehl" → 500, "2 Liter Milch" → 2). Sonst null.
- unit: NUR setzen wenn im Text explizit eine Einheit steht ("500g Mehl" → "g"). Sonst null.
- Beispiele: "Mehl" → quantity:null, unit:null. "500g Mehl" → quantity:500, unit:"g". "2 Packungen Nudeln" → quantity:2, unit:"Packung".
- NIEMALS raten. Keine Menge im Text = null.
name: Singular, Deutsch, Großbuchstabe. note: Marke/Variante oder "".
Gib {"items": []} zurück wenn nichts erkennbar.`;

const PROMPT_MISC = `Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in Non-Food-Einkaufs-Einträge umwandelt.
Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Markdown-Codeblöcke.
Format: {"items": [{"name": string, "location_tag": string, "note": string}, ...]}
location_tag MUSS einer sein: ["Apotheke","Baumarkt","Drogerie","Zoohandlung","Kleidung","Sonstiges"]
Apotheke: Medikamente, Vitamine, Pflaster. Baumarkt: Schrauben, Werkzeug. Drogerie: Kosmetik, Körperpflege. Zoohandlung: Tierfutter. Kleidung: Textilien. Sonstiges: alles andere.
name: Singular, Deutsch, Großbuchstabe. note: Größe/Menge/Variante oder "".
Gib {"items": []} zurück wenn nichts erkennbar.`;

const PROMPT_TODOS = `Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in To-Do-Einträge umwandelt.
Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Markdown-Codeblöcke.
Format: {"items": [{"title": string, "priority": string, "due_date": string|null, "assignee_hint": string, "comment": string}, ...]}
priority: "high" (dringend/heute/sofort), "medium" (default), "low" (irgendwann)
due_date: ISO-8601 UTC oder null. Zeitphrasen relativ zu HEUTE berechnen.
assignee_hint: Vorname ("Tim","Iris","ich") oder "".
title: kurz, klar, Deutsch, kein Datum/Prio-Wörter.
Gib {"items": []} zurück wenn nichts erkennbar.`;

const PROMPT_EXPENSE = `Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in Ausgaben-Einträge umwandelt.
Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Markdown-Codeblöcke.
Format: {"items": [{"description": string, "amount": number, "category": string, "expense_date": string|null}, ...]}
category: "Essen","Haushalt","Transport","Unterhaltung","Sonstiges"
expense_date: YYYY-MM-DD oder null. "gestern"/"heute" relativ zu HEUTE berechnen.
Gib {"items": []} zurück wenn nichts erkennbar.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  const { user_id, text, mode = "grocery" } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ detail: "Text darf nicht leer sein." });
  if (text.length > 500) return res.status(400).json({ detail: "Text zu lang (max. 500 Zeichen)." });
  if (!user_id) return res.status(400).json({ detail: "user_id fehlt." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ detail: "ANTHROPIC_API_KEY nicht konfiguriert." });

  const { allowed, retryAfter } = checkRateLimit(user_id);
  if (!allowed) {
    return res.status(429)
      .setHeader("Retry-After", String(retryAfter))
      .json({ detail: `Rate limit erreicht. Bitte in ${retryAfter} Sekunden erneut versuchen.` });
  }

  const today = new Date().toISOString().split("T")[0];
  let systemPrompt =
    mode === "misc" ? PROMPT_MISC :
    mode === "todos" ? `HEUTE ist ${today} (UTC).\n\n` + PROMPT_TODOS :
    mode === "expense" ? `HEUTE ist ${today} (UTC).\n\n` + PROMPT_EXPENSE :
    PROMPT_GROCERY;

  let rawResponse = null;
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
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
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: text.trim() }],
          }),
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
      ]);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error?.message || `Anthropic ${r.status}`);
      }
      const data = await r.json();
      rawResponse = data.content?.[0]?.text || "";
      break;
    } catch (e) {
      lastError = e;
      if (attempt === 1) await new Promise(r => setTimeout(r, 500));
    }
  }

  if (!rawResponse) {
    const isTimeout = lastError?.message === "timeout";
    return res.status(isTimeout ? 504 : 502).json({ detail: "KI-Service nicht erreichbar. Bitte später erneut versuchen." });
  }

  let parsed;
  try {
    parsed = extractJson(rawResponse);
  } catch {
    return res.status(502).json({ detail: "KI-Antwort konnte nicht verarbeitet werden." });
  }

  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
  const normalizer =
    mode === "misc" ? normalizeMisc :
    mode === "todos" ? normalizeTodo :
    mode === "expense" ? normalizeExpense :
    normalizeGrocery;

  const items = rawItems.map(normalizer).filter(Boolean);
  return res.status(200).json({ items, mode });
}
