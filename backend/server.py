from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import asyncio
import logging
import time
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from collections import defaultdict, deque

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# -------------------- Status models (existing) --------------------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# -------------------- Brain Dump AI Parser --------------------
ALLOWED_CATEGORIES = [
    "Obst & Gemüse",
    "Frisches Fleisch & Fisch",
    "Bäckerei & Brot",
    "Milch & Alternativen",
    "Kühlregal & Tiefkühl",
    "Konserven & Saucen",
    "Gewürze",
    "Getränke",
    "Snacks & Süsses",
]

ALLOWED_UNITS = ["Stück", "g", "kg", "ml", "L", "Packung", "Dose", "Flasche", "Bund", "Glas"]

ALLOWED_MISC_LOCATIONS = [
    "Apotheke",
    "Baumarkt",
    "Drogerie",
    "Zoohandlung",
    "Kleidung",
    "Sonstiges",
]

ALLOWED_PRIORITIES = ["high", "medium", "low"]


BRAIN_DUMP_SYSTEM_PROMPT_GROCERY = f"""Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in strukturierte Einkaufslisten-Einträge umwandelt.

Der Nutzer liefert einen freien Text (z.B. diktiert oder eingetippt) mit Lebensmitteln und anderen Einkaufsartikeln. Deine Aufgabe ist es, daraus eine saubere JSON-Liste zu extrahieren.

REGELN:
1. Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Kommentare, keine Markdown-Codeblöcke, keine Erklärungen.
2. Das JSON muss exakt diese Struktur haben: {{"items": [{{"name": string, "quantity": number, "unit": string, "category": string, "note": string}}, ...]}}
3. Jeder Artikel MUSS genau einer dieser Kategorien zugeordnet werden (wörtlich): {json.dumps(ALLOWED_CATEGORIES, ensure_ascii=False)}
4. Die Einheit (unit) muss aus dieser Liste stammen: {json.dumps(ALLOWED_UNITS, ensure_ascii=False)}. Wenn unklar → "Stück".
5. "name" ist der reine Artikelname im Singular, deutsch, mit großem Anfangsbuchstaben (z.B. "Apfel", "Hackfleisch", "Vollmilch"). Keine Mengen oder Einheiten im Namen.
6. "quantity" ist immer eine Zahl > 0. Wenn keine Menge genannt wird → 1.
7. "note" ist optional (leerer String "" wenn nichts relevant). Nutze es für Marken, Varianten oder Zusatzinfos (z.B. "Bio", "laktosefrei", "aus dem Glas").
8. Fasse Duplikate zusammen (z.B. "2 Äpfel und noch 3 Äpfel" → quantity 5).
9. Ignoriere Füllwörter, Höflichkeiten und nicht-Einkaufs-Text.
10. Bei Mengenangaben wie "500g Hack" → name: "Hackfleisch", quantity: 500, unit: "g".
11. Bei "eine Packung Nudeln" → quantity: 1, unit: "Packung".
12. Gib IMMER mindestens ein leeres items-Array zurück: {{"items": []}} falls nichts extrahierbar ist.

BEISPIEL-INPUT:
"2 Äpfel, 500g Hack, eine Packung Nudeln, Milch (am besten laktosefrei), und 6 Eier"

BEISPIEL-OUTPUT:
{{"items": [
  {{"name": "Apfel", "quantity": 2, "unit": "Stück", "category": "Obst & Gemüse", "note": ""}},
  {{"name": "Hackfleisch", "quantity": 500, "unit": "g", "category": "Frisches Fleisch & Fisch", "note": ""}},
  {{"name": "Nudeln", "quantity": 1, "unit": "Packung", "category": "Konserven & Saucen", "note": ""}},
  {{"name": "Milch", "quantity": 1, "unit": "L", "category": "Milch & Alternativen", "note": "laktosefrei"}},
  {{"name": "Eier", "quantity": 6, "unit": "Stück", "category": "Kühlregal & Tiefkühl", "note": ""}}
]}}"""


BRAIN_DUMP_SYSTEM_PROMPT_TODOS = f"""Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in strukturierte To-Do-Einträge für einen gemeinsamen Haushalt umwandelt.

Der Nutzer liefert einen freien Text mit Aufgaben (z.B. "Iris soll Auto waschen, morgen Müll raus, Arzttermin nächste Woche hochprio"). Deine Aufgabe: daraus eine saubere JSON-Liste extrahieren.

REGELN:
1. Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Kommentare, keine Markdown-Codeblöcke.
2. Format: {{"items": [{{"title": string, "priority": string, "due_date": string|null, "assignee_hint": string, "comment": string}}, ...]}}
3. "priority" MUSS genau einer dieser Werte sein: {json.dumps(ALLOWED_PRIORITIES)}
   - high: dringend, wichtig, sofort, heute, "asap", "hochprio"
   - medium: normal (Default wenn unklar)
   - low: irgendwann, nice-to-have, "low prio"
4. "due_date" ist ein ISO-8601 Timestamp (UTC) ODER null. Erkenne Zeitphrasen relativ zu HEUTE:
   - "heute" → heute 23:59 lokal
   - "morgen" → morgen 09:00 lokal
   - "übermorgen" → +2 Tage 09:00
   - "in N Tagen" → +N Tage 23:59
   - "Ende der Woche" → kommender Freitag 23:59
   - "nächste Woche" → kommender Montag 09:00
   - "am Freitag" / "Montag" → nächster passender Wochentag 09:00
   - Konkrete Datumsangaben → ISO konvertieren
   - Wenn keine Zeitangabe erkennbar → null.
5. "assignee_hint" ist der Vorname oder "Tim"/"Iris"/"ich"/"wir"/"" (leer). Beispiele: "Iris soll X machen" → assignee_hint: "Iris". "Ich muss Y" → "ich". "Müll rausbringen" (keine Zuweisung) → "".
6. "title" ist die Aufgabe kurz & klar auf Deutsch, ohne Datum/Prio-Wörter, erster Buchstabe groß. Keine Anrede.
7. "comment" optional für Kontext, sonst "".
8. Gib IMMER ein items-Array zurück: {{"items": []}} wenn nichts erkennbar.
9. HEUTE ist gemeint als Zeitpunkt des Requests (du brauchst das konkrete Datum nicht zu kennen – gib Zeitphrasen wie "morgen" als passenden ISO-Timestamp in deiner besten Näherung zurück; der Server wird absolute Zeiten bei Bedarf nachberechnen).

BEISPIEL-INPUT:
"Iris soll morgen früh Auto waschen. Müll heute raus bringen ist wichtig. Arzttermin in drei Tagen. Irgendwann mal Rasen mähen."

BEISPIEL-OUTPUT (das Datum dient nur als Format-Hinweis, echte Zeiten können variieren):
{{"items": [
  {{"title": "Auto waschen", "priority": "medium", "due_date": "2026-04-21T09:00:00Z", "assignee_hint": "Iris", "comment": ""}},
  {{"title": "Müll rausbringen", "priority": "high", "due_date": "2026-04-20T23:59:00Z", "assignee_hint": "", "comment": ""}},
  {{"title": "Arzttermin", "priority": "medium", "due_date": "2026-04-23T23:59:00Z", "assignee_hint": "", "comment": ""}},
  {{"title": "Rasen mähen", "priority": "low", "due_date": null, "assignee_hint": "", "comment": ""}}
]}}"""



BRAIN_DUMP_SYSTEM_PROMPT_MISC = f"""Du bist ein hilfreicher Assistent, der unstrukturierten deutschen Text in strukturierte Einkaufs-Einträge für NICHT-Lebensmittel umwandelt.


Der Nutzer liefert einen freien Text mit Non-Food-Artikeln (Medikamente, Werkzeug, Drogerie-/Körperpflege-Artikel, Tierbedarf, Kleidung etc.). Deine Aufgabe: daraus eine saubere JSON-Liste extrahieren und jeden Artikel einem LOCATION_TAG (Geschäft) zuordnen.

REGELN:
1. Gib AUSSCHLIESSLICH gültiges JSON zurück – keine Kommentare, keine Markdown-Codeblöcke.
2. Format: {{"items": [{{"name": string, "location_tag": string, "note": string}}, ...]}}
3. "location_tag" MUSS genau einer dieser Werte sein: {json.dumps(ALLOWED_MISC_LOCATIONS, ensure_ascii=False)}
4. Zuordnungs-Heuristik (wichtig!):
   - Apotheke: Medikamente (Ibuprofen, Aspirin, Paracetamol), Vitamine, Pflaster, Tabletten, Salben, Nasenspray, Hustensaft, Rezepte
   - Baumarkt: Schrauben, Nägel, Farbe, Werkzeug (Hammer, Bohrer, Säge), Dübel, Silikon, Holz, Elektrokabel
   - Drogerie: Shampoo, Zahnpasta, Seife, Deo, Kosmetik, Windeln, Toilettenpapier, Körperpflege, Make-up
   - Zoohandlung: Hundefutter, Katzenfutter, Vogelfutter, Leckerlies, Katzenstreu, Spielzeug (für Haustiere), Halsband
   - Kleidung: Hose, T-Shirt, Socken, Schuhe, Jacke, Unterwäsche, Pyjama
   - Sonstiges: alles andere (Batterien, Kerzen, Karten, Geschenkpapier, Büromaterial, Deko)
5. "name" auf Deutsch, Singular, großer Anfangsbuchstabe. Keine Mengen im Namen.
6. "note" optional: Marke, Größe, Menge, Variante (z.B. "3 Stück", "4mm", "Größe 42", "Nassfutter"). Leer "" wenn nichts.
7. Mengenangaben wie "3 Batterien" → name: "Batterien", note: "3 Stück".
8. Im Zweifel → "Sonstiges".
9. Gib IMMER mindestens ein leeres items-Array zurück: {{"items": []}}.

BEISPIEL-INPUT:
"Ibuprofen, 3 Akkus AA, Hundefutter Nassfutter, Schrauben 4mm, Zahnpasta und ein paar Socken"

BEISPIEL-OUTPUT:
{{"items": [
  {{"name": "Ibuprofen", "location_tag": "Apotheke", "note": ""}},
  {{"name": "Batterien AA", "location_tag": "Sonstiges", "note": "3 Stück"}},
  {{"name": "Hundefutter", "location_tag": "Zoohandlung", "note": "Nassfutter"}},
  {{"name": "Schrauben", "location_tag": "Baumarkt", "note": "4mm"}},
  {{"name": "Zahnpasta", "location_tag": "Drogerie", "note": ""}},
  {{"name": "Socken", "location_tag": "Kleidung", "note": ""}}
]}}"""


class BrainDumpParseRequest(BaseModel):
    user_id: str
    text: str
    mode: Literal["grocery", "misc", "todos"] = "grocery"


# In-memory rate limiter: user_id -> deque of timestamps (seconds)
RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW_SEC = 3600
_rate_limit_store: dict = defaultdict(deque)


def _check_rate_limit(user_id: str) -> tuple[bool, int]:
    now = time.time()
    dq = _rate_limit_store[user_id]
    cutoff = now - RATE_LIMIT_WINDOW_SEC
    while dq and dq[0] < cutoff:
        dq.popleft()
    if len(dq) >= RATE_LIMIT_MAX:
        retry_after = int(dq[0] + RATE_LIMIT_WINDOW_SEC - now) + 1
        return False, max(retry_after, 1)
    dq.append(now)
    return True, 0


def _extract_json(raw: str) -> dict:
    if not raw:
        raise ValueError("Empty response from LLM")
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    candidate = fence.group(1) if fence else raw
    if not fence:
        first = candidate.find("{")
        last = candidate.rfind("}")
        if first != -1 and last != -1 and last > first:
            candidate = candidate[first:last + 1]
    return json.loads(candidate)


def _normalize_grocery_item(raw_item: dict) -> Optional[dict]:
    if not isinstance(raw_item, dict):
        return None
    name = str(raw_item.get("name", "")).strip()
    if not name:
        return None
    try:
        quantity = float(raw_item.get("quantity", 1))
        if quantity <= 0:
            quantity = 1
    except (TypeError, ValueError):
        quantity = 1
    unit = str(raw_item.get("unit", "Stück")).strip() or "Stück"
    if unit not in ALLOWED_UNITS:
        unit = "Stück"
    category = str(raw_item.get("category", "")).strip()
    if category not in ALLOWED_CATEGORIES:
        category = "Konserven & Saucen"
    note = str(raw_item.get("note", "") or "").strip()
    return {"name": name, "quantity": quantity, "unit": unit, "category": category, "note": note}


def _normalize_misc_item(raw_item: dict) -> Optional[dict]:
    if not isinstance(raw_item, dict):
        return None
    name = str(raw_item.get("name", "")).strip()
    if not name:
        return None
    location = str(raw_item.get("location_tag", "")).strip()
    if location not in ALLOWED_MISC_LOCATIONS:
        location = "Sonstiges"
    note = str(raw_item.get("note", "") or "").strip()
    return {"name": name, "location_tag": location, "note": note}


def _normalize_todo_item(raw_item: dict) -> Optional[dict]:
    if not isinstance(raw_item, dict):
        return None
    title = str(raw_item.get("title", "")).strip()
    if not title:
        return None
    priority = str(raw_item.get("priority", "medium")).strip().lower()
    if priority not in ALLOWED_PRIORITIES:
        priority = "medium"
    due_date = raw_item.get("due_date")
    if due_date is not None:
        due_date = str(due_date).strip() or None
        # Drop dates that are clearly bogus (more than 30 days in the past) or
        # malformed — Claude's training cutoff can produce stale/odd dates.
        # User can set an explicit date in the preview.
        if due_date:
            try:
                parsed_dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                if parsed_dt < datetime.now(timezone.utc) - timedelta(days=30):
                    due_date = None
            except (ValueError, TypeError):
                due_date = None
    assignee_hint = str(raw_item.get("assignee_hint", "") or "").strip()
    comment = str(raw_item.get("comment", "") or "").strip()
    return {
        "title": title,
        "priority": priority,
        "due_date": due_date,
        "assignee_hint": assignee_hint,
        "comment": comment,
    }


async def _call_claude(user_text: str, system_prompt: str) -> tuple[str, str]:
    session_id = f"braindump-{uuid.uuid4().hex[:12]}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    response = await chat.send_message(UserMessage(text=user_text))
    return response, session_id


@api_router.post("/brain-dump/parse")
async def brain_dump_parse(req: BrainDumpParseRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text darf nicht leer sein.")
    if len(text) > 500:
        raise HTTPException(status_code=400, detail="Text zu lang (max. 500 Zeichen).")
    if not req.user_id:
        raise HTTPException(status_code=400, detail="user_id fehlt.")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM-Key nicht konfiguriert.")

    allowed, retry_after = _check_rate_limit(req.user_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit erreicht. Bitte in {retry_after} Sekunden erneut versuchen.",
            headers={"Retry-After": str(retry_after)},
        )

    system_prompt = (
        BRAIN_DUMP_SYSTEM_PROMPT_MISC if req.mode == "misc"
        else BRAIN_DUMP_SYSTEM_PROMPT_TODOS if req.mode == "todos"
        else BRAIN_DUMP_SYSTEM_PROMPT_GROCERY
    )
    # Inject today's date into the todos prompt so Claude returns fresh ISO dates
    # instead of stale ones from its training cutoff.
    if req.mode == "todos":
        today_iso = datetime.now(timezone.utc).date().isoformat()
        system_prompt = f"HEUTE ist {today_iso} (UTC). Nutze dieses Datum als Referenz für alle relativen Zeitangaben.\n\n" + system_prompt

    last_error: Optional[Exception] = None
    raw_response: Optional[str] = None
    session_id: Optional[str] = None
    start_ts = time.time()
    for attempt in (1, 2):
        try:
            raw_response, session_id = await asyncio.wait_for(
                _call_claude(text, system_prompt), timeout=15.0
            )
            break
        except asyncio.TimeoutError as e:
            last_error = e
            logger.warning(f"[brain-dump] attempt {attempt} timeout user={req.user_id} mode={req.mode}")
        except Exception as e:
            last_error = e
            logger.warning(f"[brain-dump] attempt {attempt} error user={req.user_id} mode={req.mode}: {e}")
        if attempt == 1:
            await asyncio.sleep(0.5)

    duration_ms = int((time.time() - start_ts) * 1000)

    if raw_response is None:
        logger.error(f"[brain-dump] failed after retry user={req.user_id} mode={req.mode} err={last_error}")
        raise HTTPException(
            status_code=504 if isinstance(last_error, asyncio.TimeoutError) else 502,
            detail="KI-Service nicht erreichbar. Bitte später erneut versuchen.",
        )

    approx_input_tokens = max(1, len(text) // 4)
    approx_output_tokens = max(1, len(raw_response) // 4)
    logger.info(
        f"[brain-dump] ok user={req.user_id} mode={req.mode} session={session_id} "
        f"duration_ms={duration_ms} input_chars={len(text)} output_chars={len(raw_response)} "
        f"approx_input_tokens={approx_input_tokens} approx_output_tokens={approx_output_tokens}"
    )

    try:
        parsed = _extract_json(raw_response)
    except Exception as e:
        logger.error(f"[brain-dump] json parse failed user={req.user_id} mode={req.mode}: {e} raw={raw_response[:200]!r}")
        raise HTTPException(status_code=502, detail="KI-Antwort konnte nicht verarbeitet werden.")

    raw_items = parsed.get("items", []) if isinstance(parsed, dict) else []
    if req.mode == "misc":
        normalizer = _normalize_misc_item
    elif req.mode == "todos":
        normalizer = _normalize_todo_item
    else:
        normalizer = _normalize_grocery_item
    items = [n for n in (normalizer(ri) for ri in raw_items) if n]
    return {"items": items, "mode": req.mode}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
