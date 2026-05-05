import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { triggerCalendarSync } from '../../lib/googleAuth';

const FALLBACK_COLOR = '#94A3B8';

const GOOGLE_COLOR_IDS = {
  '1': '#7986CB',  // Lavender
  '2': '#33B679',  // Sage
  '3': '#8E24AA',  // Grape
  '4': '#E67C73',  // Flamingo
  '5': '#F6BF26',  // Banana
  '6': '#F4511E',  // Tangerine
  '7': '#039BE5',  // Peacock
  '8': '#616161',  // Graphite
  '9': '#3F51B5',  // Blueberry
  '10': '#0B8043', // Basil
  '11': '#D50000', // Tomato
};

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'];

function isoMondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDayHeader(date) {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()}. ${MONTHS[date.getMonth()]}`;
}

function formatDateRange(weekStart, weekEnd) {
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
  const sameMonth = sameYear && weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${weekStart.getDate()}. — ${weekEnd.getDate()}. ${MONTHS[weekEnd.getMonth()]}`;
  }
  if (sameYear) {
    return `${weekStart.getDate()}. ${MONTHS[weekStart.getMonth()]} — ${weekEnd.getDate()}. ${MONTHS[weekEnd.getMonth()]}`;
  }
  return `${weekStart.getDate()}. ${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()} — ${weekEnd.getDate()}. ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [snack, setSnack] = useState(null);
  const [events, setEvents] = useState([]);
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekStart, weekEnd, weekEndExcl } = useMemo(() => {
    const today = new Date();
    const base = isoMondayOf(today);
    const ws = new Date(base);
    ws.setDate(ws.getDate() + weekOffset * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6); // Sonntag (für Anzeige)
    const wee = new Date(ws);
    wee.setDate(wee.getDate() + 7); // exklusiver Cutoff für Bucketing
    return { weekStart: ws, weekEnd: we, weekEndExcl: wee };
  }, [weekOffset]);

  const loadEvents = async () => {
    if (!user?.id) return;
    setLoading(true);
    const timeMin = new Date(weekStart);
    timeMin.setDate(timeMin.getDate() - 1);
    const timeMax = new Date(weekEndExcl);
    timeMax.setDate(timeMax.getDate() + 1);

    const [evRes, prefRes] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', timeMin.toISOString())
        .lte('start_time', timeMax.toISOString())
        .order('start_time', { ascending: true }),
      supabase
        .from('user_calendar_preferences')
        .select('google_calendar_id, background_color')
        .eq('user_id', user.id),
    ]);

    if (evRes.error) {
      setSnack({ kind: 'error', text: `Termine laden fehlgeschlagen: ${evRes.error.message}` });
      setEvents([]);
    } else {
      setEvents(evRes.data || []);
    }
    setPrefs(prefRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, weekOffset]);

  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(() => setSnack(null), 4000);
    return () => clearTimeout(t);
  }, [snack]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await triggerCalendarSync(supabase);
      setSnack({ kind: 'success', text: `${result.events_synced} Termine synchronisiert` });
      await loadEvents();
    } catch (e) {
      setSnack({ kind: 'error', text: `Sync fehlgeschlagen: ${e.message}` });
    } finally {
      setSyncing(false);
    }
  };

  const colorFor = (event) => {
    if (event.color_id && GOOGLE_COLOR_IDS[event.color_id]) {
      return GOOGLE_COLOR_IDS[event.color_id];
    }
    const pref = prefs.find((p) => p.google_calendar_id === event.google_calendar_id);
    return pref?.background_color || FALLBACK_COLOR;
  };

  const weekDays = useMemo(() => {
    const today = new Date();
    const todayKey = dayKey(today);

    const byDay = new Map();
    for (const ev of events) {
      const k = dayKey(new Date(ev.start_time));
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(ev);
    }

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const k = dayKey(d);
      const rawItems = byDay.get(k) || [];

      const irisShifts = rawItems.filter((e) => e.summary === 'Iris Arbeit');
      const allDay = rawItems.filter((e) => e.is_all_day && e.summary !== 'Iris Arbeit');
      const timed = rawItems.filter((e) => !e.is_all_day && e.summary !== 'Iris Arbeit');
      timed.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      const compact = [...allDay];
      if (irisShifts.length > 0) {
        compact.push({
          id: `iris-arbeit-${k}`,
          _isIrisArbeit: true,
          google_calendar_id: irisShifts[0].google_calendar_id,
          color_id: irisShifts[0].color_id,
        });
      }
      days.push({ date: d, key: k, items: [...compact, ...timed], isToday: k === todayKey });
    }
    return days;
  }, [events, weekStart]);

  return (
    <div data-testid="calendar-page" className="pb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-lg active:opacity-70"
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h1
          className="text-xl font-bold text-slate-900 dark:text-slate-50 flex-1"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Kalender
        </h1>
        <button
          data-testid="calendar-sync-button"
          onClick={handleSync}
          disabled={syncing}
          aria-label="Synchronisieren"
          className="p-2 -mr-2 rounded-lg active:opacity-70 disabled:opacity-60"
        >
          <RefreshCw
            className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`}
            style={{ color: '#0EA5E9' }}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 py-3 px-1">
        <button
          data-testid="week-nav-prev"
          onClick={() => setWeekOffset((o) => o - 1)}
          className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 active:opacity-60"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Letzte Woche</span>
        </button>
        <div className="flex-1 flex flex-col items-center">
          <span
            className="font-semibold text-base text-slate-900 dark:text-slate-50"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {formatDateRange(weekStart, weekEnd)}
          </span>
          {weekOffset !== 0 && (
            <button
              data-testid="week-nav-today"
              onClick={() => setWeekOffset(0)}
              className="text-xs text-sky-600 dark:text-sky-400 active:opacity-60 mt-0.5"
            >
              Zurück zu dieser Woche
            </button>
          )}
        </div>
        <button
          data-testid="week-nav-next"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 active:opacity-60"
        >
          <span>Nächste Woche</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2.5">
        {weekDays.map((day) => (
          <div
            key={day.key}
            data-testid={`cal-day-${day.key}`}
            className={`rounded-xl border shadow-sm p-3 border-slate-200 dark:border-slate-800 ${
              day.isToday
                ? 'bg-sky-500/[0.08] dark:bg-sky-500/[0.24]'
                : 'bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-sm font-bold text-slate-700 dark:text-slate-200"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {formatDayHeader(day.date)}
              </span>
              {day.isToday && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white tracking-wider"
                  style={{ backgroundColor: '#0EA5E9' }}
                >
                  HEUTE
                </span>
              )}
            </div>
            {loading && day.items.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">Lade…</p>
            ) : day.items.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">Keine Termine</p>
            ) : (
              <div className="space-y-1.5">
                {day.items.map((ev) => {
                  if (ev._isIrisArbeit) {
                    return (
                      <div
                        key={ev.id}
                        data-testid={`cal-event-${ev.id}`}
                        className="flex items-center gap-2.5"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colorFor(ev) }}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Ganztags</span>
                        <span className="text-sm italic text-slate-900 dark:text-slate-50 truncate">
                          Iris arbeitet
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={ev.id}
                      data-testid={`cal-event-${ev.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: colorFor(ev) }}
                        aria-hidden="true"
                      />
                      {ev.is_all_day ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Ganztägig</span>
                      ) : (
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">
                          {formatTime(ev.start_time)}
                        </span>
                      )}
                      <span className="text-sm text-slate-900 dark:text-slate-50 truncate">
                        {ev.summary || '(Kein Titel)'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {snack && (
        <div
          data-testid="calendar-snackbar"
          className={`fixed z-50 left-3 right-3 sm:max-w-[476px] mx-auto rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${
            snack.kind === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom) + 12px)' }}
        >
          {snack.text}
        </div>
      )}
    </div>
  );
}
