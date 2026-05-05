import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { triggerCalendarSync } from '../../lib/googleAuth';

const TIME_WINDOW_PAST_DAYS = 7;
const TIME_WINDOW_FUTURE_DAYS = 21;
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

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [snack, setSnack] = useState(null);
  const [events, setEvents] = useState([]);
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    if (!user?.id) return;
    setLoading(true);
    const now = new Date();
    const timeMin = new Date(now.getTime() - TIME_WINDOW_PAST_DAYS * 86400 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + TIME_WINDOW_FUTURE_DAYS * 86400 * 1000).toISOString();

    const [evRes, prefRes] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', timeMin)
        .lte('start_time', timeMax)
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
  }, [user?.id]);

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

  const sections = useMemo(() => {
    const today = new Date();
    const todayKey = dayKey(today);
    const thisMon = isoMondayOf(today);
    const nextMon = new Date(thisMon);
    nextMon.setDate(nextMon.getDate() + 7);

    const byDay = new Map();
    for (const ev of events) {
      const start = new Date(ev.start_time);
      const k = dayKey(start);
      if (!byDay.has(k)) {
        byDay.set(k, {
          date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
          items: [],
        });
      }
      byDay.get(k).items.push(ev);
    }

    const thisWeek = [];
    const nextWeek = [];
    for (const day of byDay.values()) {
      if (day.date < nextMon) thisWeek.push(day);
      else nextWeek.push(day);
    }
    thisWeek.sort((a, b) => a.date - b.date);
    nextWeek.sort((a, b) => a.date - b.date);

    return { thisWeek, nextWeek, todayKey };
  }, [events]);

  const renderDay = (day, todayKey) => {
    const isToday = dayKey(day.date) === todayKey;
    return (
      <div
        key={dayKey(day.date)}
        data-testid={`cal-day-${dayKey(day.date)}`}
        className={`rounded-xl px-3 py-2.5 ${isToday ? 'bg-sky-500/[0.08] dark:bg-sky-500/[0.24]' : ''}`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-sm font-bold text-slate-700 dark:text-slate-200"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {formatDayHeader(day.date)}
          </span>
          {isToday && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white tracking-wider"
              style={{ backgroundColor: '#0EA5E9' }}
            >
              HEUTE
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {day.items.map((ev) => (
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
          ))}
        </div>
      </div>
    );
  };

  const renderSection = (label, days, todayKey) => (
    <div key={label}>
      <h2
        className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {label}
      </h2>
      <div className="space-y-2">{days.map((d) => renderDay(d, todayKey))}</div>
    </div>
  );

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

      {loading ? (
        <div className="flex items-center justify-center pt-16">
          <p className="text-sm text-slate-400 dark:text-slate-500">Lade Termine…</p>
        </div>
      ) : sections.thisWeek.length === 0 && sections.nextWeek.length === 0 ? (
        <div className="flex items-center justify-center pt-16">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Keine Termine in den nächsten 4 Wochen
          </p>
        </div>
      ) : (
        <div className="pt-4 space-y-5">
          {sections.thisWeek.length > 0 && renderSection('Diese Woche', sections.thisWeek, sections.todayKey)}
          {sections.nextWeek.length > 0 && renderSection('Nächste Woche', sections.nextWeek, sections.todayKey)}
        </div>
      )}

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
