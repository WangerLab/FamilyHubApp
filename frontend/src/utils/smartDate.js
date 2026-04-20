// Smart German date parser. Returns an ISO timestamptz string or null if no match.
// Also returns a "cleaned" title if the date phrase was inside the input.

const WEEKDAY_NAMES_DE = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];

function atTime(date, h, m) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Find next weekday (0=Sun..6=Sat). If today is the same weekday, returns +7 days.
function nextWeekday(target) {
  const d = new Date();
  const diff = ((target - d.getDay()) + 7) % 7 || 7;
  return addDays(d, diff);
}

const NUM_DE = {
  'einem': 1, 'einen': 1, 'einer': 1, 'eins': 1, 'eine': 1, 'ein': 1,
  'zwei': 2, 'drei': 3, 'vier': 4, 'fünf': 5, 'fuenf': 5, 'sechs': 6,
  'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10,
};

function parseInNumDays(lower) {
  // "in 3 Tagen" / "in drei Tagen"
  const m = lower.match(/\bin\s+(\d+|einem|einen|einer|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn)\s+tagen?\b/);
  if (!m) return null;
  const num = parseInt(m[1], 10) || NUM_DE[m[1]] || null;
  if (!num) return null;
  const date = atTime(addDays(new Date(), num), 23, 59);
  return { date, matched: m[0] };
}

/**
 * parseSmartDateDE(input)
 * Returns { date: Date, cleaned: string } or null if no date phrase.
 * Cleaned = input with the matched phrase removed (trimmed).
 */
export function parseSmartDateDE(input) {
  if (!input) return null;
  const lower = input.toLowerCase();

  // "morgen" → tomorrow 09:00
  if (/\bmorgen\b/.test(lower)) {
    return {
      date: atTime(addDays(new Date(), 1), 9, 0),
      cleaned: input.replace(/\bmorgen\b/i, '').replace(/\s+/g, ' ').trim(),
    };
  }

  // "übermorgen" → +2 days 09:00
  if (/\b(übermorgen|uebermorgen)\b/.test(lower)) {
    return {
      date: atTime(addDays(new Date(), 2), 9, 0),
      cleaned: input.replace(/\b(übermorgen|uebermorgen)\b/i, '').replace(/\s+/g, ' ').trim(),
    };
  }

  // "heute" → today 23:59
  if (/\bheute\b/.test(lower)) {
    return {
      date: atTime(new Date(), 23, 59),
      cleaned: input.replace(/\bheute\b/i, '').replace(/\s+/g, ' ').trim(),
    };
  }

  // "nächste Woche" / "naechste Woche" → next Monday 09:00
  if (/\bn(ä|ae)chste\s+woche\b/.test(lower)) {
    return {
      date: atTime(nextWeekday(1), 9, 0),
      cleaned: input.replace(/\bn(ä|ae)chste\s+woche\b/i, '').replace(/\s+/g, ' ').trim(),
    };
  }

  // "Ende der Woche" / "Wochenende" → Friday 23:59 (this Friday if still upcoming, else next Friday)
  if (/\bende\s+der\s+woche\b|\bwochenende\b/.test(lower)) {
    const today = new Date();
    const day = today.getDay();
    // Friday = 5. If already past Fri, go to next Fri
    const addDaysN = day < 5 ? (5 - day) : (5 + 7 - day);
    return {
      date: atTime(addDays(today, addDaysN), 23, 59),
      cleaned: input.replace(/\bende\s+der\s+woche\b|\bwochenende\b/i, '').replace(/\s+/g, ' ').trim(),
    };
  }

  // "in N Tagen" / "in drei Tagen"
  const inN = parseInNumDays(lower);
  if (inN) {
    return {
      date: inN.date,
      cleaned: input.replace(new RegExp(inN.matched, 'i'), '').replace(/\s+/g, ' ').trim(),
    };
  }

  // "am Freitag" / "Freitag" → next occurrence, 09:00
  for (let i = 0; i < WEEKDAY_NAMES_DE.length; i++) {
    const name = WEEKDAY_NAMES_DE[i];
    const re = new RegExp(`\\b(am\\s+)?${name}\\b`, 'i');
    if (re.test(lower)) {
      return {
        date: atTime(nextWeekday(i), 9, 0),
        cleaned: input.replace(re, '').replace(/\s+/g, ' ').trim(),
      };
    }
  }

  return null;
}

// Pretty-print a due date in German, relative where appropriate.
export function formatDueDateDE(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  if (diffMs < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 0) return 'heute überfällig';
    if (absDays === 1) return 'gestern überfällig';
    return `${absDays} Tage überfällig`;
  }
  if (diffDays === 0) return `heute ${hh}:${mm}`;
  if (diffDays === 1) return `morgen ${hh}:${mm}`;
  if (diffDays <= 6) {
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return `${weekdays[d.getDay()]} ${hh}:${mm}`;
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mo}. ${hh}:${mm}`;
}

export function isOverdue(iso, completed) {
  if (completed || !iso) return false;
  return new Date(iso) < new Date();
}

// Convert Date → "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
export function toDatetimeLocal(dateOrIso) {
  if (!dateOrIso) return '';
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
