// Vercel Serverless Function — Brain Dump AI Parser
// Replaces the Python FastAPI backend/server.py endpoint

const ALLOWED_CATEGORIES = [
  "Obst & Gemüse","Bäckerei & Brot","Fisch & Meeresfrüchte",
  "Pflanzliche Proteine","Fleisch & Wurst","Milchprodukte pflanzlich & Milch",
  "Käse & Aufschnitt","Tiefkühl","Trockenwaren & Backen",
  "Konserven & Saucen","Gewürze & Öl","Getränke","Snacks & Süßes",
];
const ALLOWED_UNITS = ["Stück","g","kg","ml","L","Packung","Dose","Flasche","Bund","Glas"];
const ALLOWED_ASIA_CATEGORIES = [
  "Saucen & Pasten","Gewürze","Reis & Mehle","Nudeln & Teigwaren",
  "Konserven & Trocken","Frisch & TK","Snacks & Süß","Sonstiges Asia",
];
const ALLOWED_MISC_LOCATIONS = [
  "Apotheke","Baumarkt","Hygieneartikel","Haushalt","Zoohandlung",
  "Kleidung","Bücher & Büro","Elektro & Technik","Geschenke","Sonstiges",
];
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

function normalizeAsia(item) {
  const name = String(item.name || "").trim();
  if (!name) return null;

  let quantity = parseFloat(item.quantity);
  if (!quantity || quantity <= 0) quantity = null;

  let unit = item.unit ? String(item.unit).trim() : null;
  if (unit && !ALLOWED_UNITS.includes(unit)) unit = null;

  let category = String(item.category || "").trim();
  if (!ALLOWED_ASIA_CATEGORIES.includes(category)) category = "Sonstiges Asia";

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

function normalizeProjectNote(parsed) {
  const note_markdown = String(parsed?.note_markdown || "").trim();
  const rawFollowUps = Array.isArray(parsed?.follow_ups) ? parsed.follow_ups : [];
  const follow_ups = rawFollowUps
    .map(fu => {
      const title = String(fu?.title || "").trim();
      if (!title) return null;
      const description = String(fu?.description || "").trim();
      return { title, description };
    })
    .filter(Boolean)
    .slice(0, 5);
  return { note_markdown, follow_ups };
}

function normalizeProjectPlanClarify(parsed) {
  const needs = !!parsed?.needs_clarification;
  if (!needs) return { needs_clarification: false };
  const rawQs = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const questions = rawQs
    .map(q => String(q || "").trim())
    .filter(Boolean)
    .slice(0, 3);
  // Wenn AI needs_clarification:true sagt aber keine Fragen liefert: als false interpretieren
  if (questions.length === 0) return { needs_clarification: false };
  return { needs_clarification: true, questions };
}

function normalizeProjectPlanStructure(parsed) {
  const name = String(parsed?.name || "Unbenanntes Projekt").trim();
  const summary = String(parsed?.summary || "").trim();
  const ALLOWED_SUGGESTED = ['tim', 'iris', 'both'];
  const rawClusters = Array.isArray(parsed?.clusters) ? parsed.clusters : [];
  const clusters = rawClusters
    .map((c, ci) => {
      const cname = String(c?.name || "").trim();
      if (!cname) return null;
      const cid = String(c?.id || `c-${ci + 1}`).trim();
      const cdesc = String(c?.description || "").trim();
      const rawTasks = Array.isArray(c?.microtasks) ? c.microtasks : [];
      const microtasks = rawTasks
        .map((t, ti) => {
          const ttitle = String(t?.title || "").trim();
          if (!ttitle) return null;
          const tid = String(t?.id || `mt-${ci + 1}-${ti + 1}`).trim();
          const tdesc = String(t?.description || "").trim();
          let effort = parseInt(t?.effort_weight, 10);
          if (!effort || effort < 1 || effort > 5) effort = 2;
          const rawDeps = Array.isArray(t?.depends_on) ? t.depends_on : [];
          const depends_on = rawDeps.map(d => String(d || "").trim()).filter(Boolean);
          let sfor = t?.suggested_for;
          if (sfor === null || sfor === undefined) sfor = null;
          else if (!ALLOWED_SUGGESTED.includes(sfor)) sfor = null;
          return { id: tid, title: ttitle, description: tdesc, effort_weight: effort, depends_on, suggested_for: sfor };
        })
        .filter(Boolean);
      return { id: cid, name: cname, description: cdesc, microtasks };
    })
    .filter(Boolean);
  return { name, summary, clusters };
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

const PROMPT_ASIA = `Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in Asia-Einkaufslisten-Einträge umwandelt.
Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Kommentare, keine Markdown-Codeblöcke.
Format: {"items": [{"name": string, "quantity": number|null, "unit": string|null, "category": string, "note": string}, ...]}
Kategorien (wörtlich, alle 8): ["Saucen & Pasten","Gewürze","Reis & Mehle","Nudeln & Teigwaren","Konserven & Trocken","Frisch & TK","Snacks & Süß","Sonstiges Asia"]
Einheiten (wenn genannt): ["Stück","g","kg","ml","L","Packung","Dose","Flasche","Bund","Glas"]

Beispiele zu category-Zuordnung:
- Saucen & Pasten: Sojasauce, Mirin, Fischsauce, Hoisin, Gochujang, Miso, Sriracha, Currypaste, Tamarindenpaste, Erdnusssauce.
- Gewürze: Sternanis, Galgant, Zitronengras, Kaffirblätter, Kreuzkümmel, Kurkuma, Fünf-Gewürze, Szechuanpfeffer, Furikake, Togarashi.
- Reis & Mehle: Jasminreis, Sushireis, Klebreis, Reismehl, Klebreismehl, Tapiokastärke, Maniokmehl.
- Nudeln & Teigwaren: Udon, Soba, Ramen, Glasnudeln, Reisnudeln, Mie, Wantan-Blätter, Reispapier, Shirataki.
- Konserven & Trocken: Kokosmilch, Bambussprossen, Wasserkastanien, getrocknete Pilze (Shiitake, Mu-Err, Enoki, Shimeji, Maitake), Nori, Wakame, Kombu, Dashi, Bonitoflocken.
- Frisch & TK: Tofu, Tempeh, Edamame, Sojasprossen, Dumplings (TK), Gyoza (TK), Pak Choi, Bok Choy, Daikon, Lotuswurzel, Mochi-Eis, Thai-Basilikum.
- Snacks & Süß: Pocky, Mochi (frisch), Daifuku, Reiscracker, Sembei, Krupuk, getrocknete Mango, Lychee, Ramune, Calpis, Anko, Azuki.
- Sonstiges Asia: Items die zu Asia gehören aber in keinen der obigen Buckets passen, ODER nicht-asiatische Items die der User trotzdem in die Asia-Liste gepackt hat (z.B. "Brokkoli" oder "Hammer" — landen hier statt verloren zu gehen).

WICHTIG zu Menge und Einheit:
- quantity: NUR setzen wenn im Text explizit eine Zahl steht ("500g Reismehl" → 500). Sonst null.
- unit: NUR setzen wenn im Text explizit eine Einheit steht ("500g Reismehl" → "g"). Sonst null.
- NIEMALS raten. Keine Menge im Text = null.

name: Singular, Deutsch, Großbuchstabe (z.B. "Sojasauce", "Tamarindenpaste"). note: Marke/Variante/Größe oder "".
Gib {"items": []} zurück wenn nichts erkennbar.`;

const PROMPT_MISC = `Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in Non-Food-Einkaufs-Einträge umwandelt.
Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Markdown-Codeblöcke.
Format: {"items": [{"name": string, "location_tag": string, "note": string}, ...]}
location_tag MUSS einer sein: ["Apotheke","Baumarkt","Hygieneartikel","Haushalt","Zoohandlung","Kleidung","Bücher & Büro","Elektro & Technik","Geschenke","Sonstiges"]
Apotheke: Medikamente, Vitamine, Pflaster, Tests. Baumarkt: Schrauben, Werkzeug, Farbe, Garten, Bauholz. Hygieneartikel: Shampoo, Zahnpasta, Kosmetik, Körperpflege, Deo, Rasur, Periode, Windeln. Haushalt: Waschmittel, Reiniger, Küchenrolle, Müllbeutel, Kerzen, Haushaltsbatterien. Zoohandlung: Tierfutter, Katzenstreu, Spielzeug für Haustiere. Kleidung: Textilien, Schuhe, Accessoires, Taschen. Bücher & Büro: Bücher, Stifte, Hefte, Ordner, Drucker-Tinte, Bastelzubehör. Elektro & Technik: Kabel, Ladegeräte, Akkus, Lampen, Kopfhörer, Adapter, Handyzubehör. Geschenke: Grußkarten, Geschenkpapier, Blumen, Gutscheine. Sonstiges: alles andere.
name: Singular, Deutsch, Großbuchstabe. note: Größe/Menge/Variante oder "".
Gib {"items": []} zurück wenn nichts erkennbar.`;

const PROMPT_TODOS = `Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in To-Do-Einträge umwandelt.
Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Markdown-Codeblöcke.
Format: {"items": [{"title": string, "priority": string, "due_date": string|null, "assignee_hint": string, "comment": string}, ...]}
priority: "high" (dringend/heute/sofort), "medium" (default), "low" (irgendwann)
due_date: ISO-8601 UTC oder null. Zeitphrasen relativ zu HEUTE berechnen.
assignee_hint: Vorname ("Tim","Iris","ich") oder "".

WICHTIG zu title vs. comment:
- title: Maximal 6 Wörter. Kurz, scanbar, im Imperativ ("Kinderarzt anrufen", "Müll rausbringen", "Geschenk für Iris kaufen"). Kein Datum, keine Prio-Wörter, keine Details.
- comment: ALLE zusätzlichen Details — wer/was/warum/Kontext, Sub-Aufgaben, Ortshinweise, Telefonnummern, Wünsche. Mehrere Punkte mit Zeilenumbruch (\\n) trennen. Datum und Priorität gehören NICHT in comment, die haben eigene Felder.
- Wenn der Eingabetext bereits kurz und ohne Zusatzinfo ist ("Müll rausbringen morgen"): title="Müll rausbringen", comment="". Niemals Details erfinden.

Beispiele:
- Eingabe: "Beim Kinderarzt anrufen wegen U7-Termin von Lasse, Allergietest-Ergebnisse erfragen, Termin am liebsten Freitag Nachmittag"
  → title: "Kinderarzt anrufen", comment: "U7-Termin von Lasse\\nAllergietest-Ergebnisse erfragen\\nWunsch: Freitag Nachmittag"
- Eingabe: "Iris fragen ob sie morgen die Pakete annehmen kann, DHL und Hermes, beide stehen schon bei der Nachbarin"
  → title: "Pakete bei Nachbarin abholen", comment: "DHL und Hermes\\nIris fragen ob sie das morgen machen kann", assignee_hint: "Iris"
- Eingabe: "Müll rausbringen morgen"
  → title: "Müll rausbringen", comment: ""
- Eingabe: "Steuerberater Mail schreiben"
  → title: "Steuerberater Mail schreiben", comment: ""

Gib {"items": []} zurück wenn nichts erkennbar.`;

const PROMPT_EXPENSE = `Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in Ausgaben-Einträge umwandelt.
Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Markdown-Codeblöcke.
Format: {"items": [{"description": string, "amount": number, "category": string, "expense_date": string|null}, ...]}
category: "Essen","Haushalt","Transport","Unterhaltung","Sonstiges"
expense_date: YYYY-MM-DD oder null. "gestern"/"heute" relativ zu HEUTE berechnen.
Gib {"items": []} zurück wenn nichts erkennbar.`;

const PROMPT_PROJECT_NOTE = `Du bist ein Brain-Dump-Strukturierer für eine Family-Hub-App. Der User hat einen Microtask in einem Projekt erledigt oder bearbeitet und schreibt jetzt frei, was dabei passiert ist. Deine Aufgabe: 1) Strukturiere den Brain-Dump zu einer aufgeräumten Notiz im Markdown-Format. 2) Erkenne, ob sich daraus konkrete neue Folge-Aufgaben (Follow-Ups) für dasselbe Projekt ergeben.

Regeln für die Notiz:
- Wenn der Brain-Dump Substanz hat: erste Zeile ist eine fettgedruckte Headline (was passierte), dann Leerzeile, dann Details als Fließtext.
- Wenn der Brain-Dump nur sehr kurz ist (1 kurzer Satz): nur dieser Satz, ohne Headline-Struktur.
- Keine eigenen Interpretationen oder Bewertungen ergänzen. Halte dich strikt an das, was im Brain-Dump steht.
- Deutsch.

Regeln für Follow-Ups:
- Nur extrahieren, wenn der User explizit erwähnt, dass etwas Neues zu tun ist (z.B. "wir brauchen noch X", "müssen wir noch besorgen", "sollten wir als Task ergänzen").
- Maximal 5 Follow-Ups.
- Jeder Follow-Up hat title (kurz, Imperativ-Form: "Mulch besorgen") und optional description (1 Satz Kontext).
- Bei reinen Status-Updates ohne neue Aufgaben: leeres Array.

Output AUSSCHLIESSLICH als JSON, ohne Markdown-Code-Fence, in dieser Form:
{
  "note_markdown": "string",
  "follow_ups": [
    { "title": "string", "description": "string" }
  ]
}`;

const PROMPT_PROJECT_PLAN_CLARIFY = `Du bist ein Projekt-Planungs-Assistent für eine Family-Hub-App. Tim oder Iris beschreiben ein neues Projekt, das sie planen wollen.

Aufgabe: Entscheide, ob du genug Information hast, um das Projekt direkt in Cluster und Microtasks zu strukturieren, oder ob du noch 1-3 Klarifikationsfragen stellen musst.

Regeln für die Entscheidung:
- Bei klaren, konkreten Brain-Dumps mit erkennbarem Scope und Tasks: needs_clarification = false.
- Bei vagen oder mehrdeutigen Eingaben: needs_clarification = true, formuliere 1-3 spezifische Fragen.
- Vermeide generische Fragen wie "Was ist dein Ziel?" — frag konkret, z.B. "Hast du ein Zeitfenster im Kopf?", "Material schon da oder soll ich Beschaffungs-Tasks einbauen?", "Soll das andere Haushaltsmitglied beteiligt sein?"
- Wichtig: Wenn der eingeloggte User bekannt ist, formuliere Fragen in der Du-Form des eingeloggten Users — also NICHT "Soll Tim das machen?" wenn Tim gerade eingeloggt ist, sondern "Willst du das selbst erledigen oder soll jemand anderes helfen?"
- Wenn schon eine Klarifikations-Runde stattgefunden hat und die Antworten meist beantwortet haben: needs_clarification = false (nicht endlos nachfragen).
- Hard-Limit: maximal 2 Runden — der Frontend zwingt nach Runde 2 zur Strukturierung. Wenn previous_rounds bereits 2 enthält, IMMER needs_clarification = false.

Input-Kontext:
- "brain_dump": Der ursprüngliche freie Text vom User.
- "previous_rounds": Array vorheriger Klarifikations-Runden. Jede Runde hat "questions" (deine bisherigen Fragen) und "answers" (User-Antworten).

Output AUSSCHLIESSLICH als JSON, ohne Markdown-Code-Fence, in einer dieser zwei Formen:

Wenn Klarifikation nötig:
{
  "needs_clarification": true,
  "questions": ["string", "string"]
}

Wenn direkt strukturierbar:
{
  "needs_clarification": false
}`;

const PROMPT_PROJECT_PLAN_STRUCTURE = `Du bist ein Projekt-Planungs-Assistent für eine Family-Hub-App. Tim und Iris haben einen Brain Dump für ein neues Projekt gegeben (plus optional Klarifikations-Antworten). Deine Aufgabe: Strukturiere das zu einem vollständigen Projekt-JSON.

Datenmodell:
- Project (top-level): name (kurz, prägnant), summary (1 Satz)
- Clusters: Gruppierungen verwandter Arbeit. Jeder Cluster: name (kurz), description (1 Satz), enthält Microtasks.
- Microtasks: Konkrete einzelne Aktionen. Jeder Microtask: title (Imperativ-Form, kurz), description (1 Satz Kontext, optional leer), effort_weight (1-5 je nach Aufwand), depends_on (Array von Microtask-IDs falls Abhängigkeiten bestehen — oder leer), suggested_for ('tim' | 'iris' | 'both' | null).

Regeln:
- Cluster gruppieren VERWANDTE Tasks. Typische Projekt-Größe: 2-6 Cluster, 3-7 Tasks pro Cluster.
- effort_weight: 1 = ganz schnell (< 10 Min), 2 = klein (< 30 Min), 3 = mittel (30-60 Min), 4 = größer (1-3h), 5 = großer Brocken (> 3h). Default 2 bei Unsicherheit.
- depends_on: NUR setzen wenn die Reihenfolge wirklich erzwungen ist. IDs sind die microtask-IDs aus deinem Output (z.B. "mt-3" referenziert von "mt-7"). Cross-Cluster-Dependencies sind OK.
- suggested_for: Entscheide pro Task basierend auf dem Brain Dump.
  - 'tim' = klar Tim
  - 'iris' = klar Iris
  - 'both' = unklar oder beide gemeinsam
  - null = reine Beschaffung/Recherche ohne Personenbezug
- Bei Brain Dumps die explizit "beide" sagen: 'both' als Default für die meisten Tasks.
- Deutsch. Knapp formulieren.

Output AUSSCHLIESSLICH als JSON, ohne Markdown-Code-Fence:
{
  "name": "string",
  "summary": "string",
  "clusters": [
    {
      "id": "c-1",
      "name": "string",
      "description": "string",
      "microtasks": [
        {
          "id": "mt-1",
          "title": "string",
          "description": "string",
          "effort_weight": 2,
          "depends_on": [],
          "suggested_for": "both"
        }
      ]
    }
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  const { user_id, text, mode = "grocery", user_name } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ detail: "Text darf nicht leer sein." });
  const maxLen = ['project_plan_clarify', 'project_plan_structure', 'project_note', 'project_review'].includes(mode) ? 5000 : 500;
  if (text.length > maxLen) return res.status(400).json({ detail: `Text zu lang (max. ${maxLen} Zeichen).` });
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
    mode === "project_plan_clarify" ? (user_name ? `Der eingeloggte User ist: ${user_name}. Der andere Haushaltsmitglied ist: ${user_name === 'Tim' ? 'Iris' : 'Tim'}.\n\n` + PROMPT_PROJECT_PLAN_CLARIFY : PROMPT_PROJECT_PLAN_CLARIFY) :
    mode === "project_plan_structure" ? PROMPT_PROJECT_PLAN_STRUCTURE :
    mode === "project_note" ? PROMPT_PROJECT_NOTE :
    mode === "asia" ? PROMPT_ASIA :
    mode === "misc" ? PROMPT_MISC :
    mode === "todos" ? `HEUTE ist ${today} (UTC).\n\n` + PROMPT_TODOS :
    mode === "expense" ? `HEUTE ist ${today} (UTC).\n\n` + PROMPT_EXPENSE :
    PROMPT_GROCERY;
  const maxTokens = mode === "project_plan_structure" ? 4096 : 1024;

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
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: "user", content: text.trim() }],
          }),
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), mode === 'project_plan_structure' ? 45000 : mode === 'project_plan_clarify' ? 30000 : 15000)),
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

  if (mode === "project_plan_clarify") {
    const result = normalizeProjectPlanClarify(parsed);
    return res.status(200).json({ ...result, mode });
  }
  if (mode === "project_plan_structure") {
    const result = normalizeProjectPlanStructure(parsed);
    return res.status(200).json({ ...result, mode });
  }
  if (mode === "project_note") {
    const result = normalizeProjectNote(parsed);
    return res.status(200).json({ ...result, mode });
  }

  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
  const normalizer =
    mode === "asia" ? normalizeAsia :
    mode === "misc" ? normalizeMisc :
    mode === "todos" ? normalizeTodo :
    mode === "expense" ? normalizeExpense :
    normalizeGrocery;

  const items = rawItems.map(normalizer).filter(Boolean);
  return res.status(200).json({ items, mode });
}
