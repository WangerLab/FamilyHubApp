import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, CheckSquare, RefreshCw, Wallet,
  Calendar, Cake, Settings as SettingsIcon, Trophy, FolderKanban,
  Apple, ShoppingBag, Soup, User, ListTodo,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { useGrocery } from '../../contexts/GroceryContext';
import { useMisc } from '../../contexts/MiscContext';
import { useAsia } from '../../contexts/AsiaContext';
import { useTodos } from '../../contexts/TodosContext';
import { useChores } from '../../contexts/ChoresContext';
import { useExpenses } from '../../contexts/ExpensesContext';
import ProjectsTile from './ProjectsTile';

const GOOGLE_COLOR_IDS = {
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
  '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
  '9': '#3F51B5', '10': '#0B8043', '11': '#D50000',
};

function formatTimeShort(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function formatDate() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function Tile({ icon: Icon, label, rows, color, onClick, disabled, testid, placeholderText, children }) {
  const tintStrength = typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--tile-tint').trim() || '14'
    : '14';
  const base = 'relative overflow-hidden h-full rounded-2xl p-3 flex flex-col border transition-all';
  const enabled = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-400 active:scale-[0.97] shadow-card cursor-pointer';
  const disabledStyle = 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 opacity-60 cursor-default';

  return (
    <button
      data-testid={testid}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${disabled ? disabledStyle : enabled}`}
      aria-label={label}
    >
      {!disabled && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            backgroundColor: `${color}${tintStrength}`,
            boxShadow: `inset 0 0 0 1px ${color}33`,
          }}
        />
      )}

      <div className="relative z-10 flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
        <h3
          className="text-base font-bold text-slate-900 dark:text-slate-50 leading-tight"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {label}
        </h3>
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {children ? (
          children
        ) : rows && rows.length > 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            {rows.map((row, i) => (
              row.layout === 'row' ? (
                <div key={i} className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {row.icon && (
                      <row.icon
                        className="w-4 h-4 shrink-0"
                        style={{ color: row.iconColor || color }}
                        strokeWidth={2.5}
                      />
                    )}
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                      {row.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {row.usePill ? (
                      <span
                        className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-base tabular-nums border-[1.5px] ${row.boldValue !== false ? 'font-bold' : ''}`}
                        style={{
                          borderColor: row.iconColor || color,
                          color: row.iconColor || color,
                          backgroundColor: 'transparent',
                        }}
                      >
                        {row.value}
                      </span>
                    ) : (
                      <span
                        className={`text-base tabular-nums ${row.boldValue !== false ? 'font-bold' : ''}`}
                        style={{ color: row.valueColor || 'inherit' }}
                      >
                        {row.value}
                      </span>
                    )}
                    {row.extra}
                  </div>
                </div>
              ) : (
              <div key={i} className="flex flex-col items-center gap-2.5">
                {row.layout === 'inline' ? (
                  <div className="flex items-center gap-1.5">
                    {row.icon && (
                      <row.icon
                        className="w-4 h-4"
                        style={{ color: row.iconColor || color }}
                        strokeWidth={2.5}
                      />
                    )}
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {row.label}
                    </span>
                  </div>
                ) : (
                  <>
                    {row.icon && (
                      <row.icon
                        className="w-4 h-4"
                        style={{ color: row.iconColor || color }}
                        strokeWidth={2.5}
                      />
                    )}
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {row.label}
                    </span>
                  </>
                )}
                <div className="flex items-center justify-center gap-2">
                  {row.usePill ? (
                    <span
                      className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-base tabular-nums border-[1.5px] ${row.boldValue !== false ? 'font-bold' : ''}`}
                      style={{
                        borderColor: row.iconColor || color,
                        color: row.iconColor || color,
                        backgroundColor: 'transparent',
                      }}
                    >
                      {row.value}
                    </span>
                  ) : (
                    <span
                      className={`text-base tabular-nums ${row.boldValue !== false ? 'font-bold' : ''}`}
                      style={{ color: row.valueColor || 'inherit' }}
                    >
                      {row.value}
                    </span>
                  )}
                  {row.extra}
                </div>
              </div>
              )
            ))}
          </div>
        ) : placeholderText ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-slate-400 dark:text-slate-500 italic">
              {placeholderText}
            </span>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </button>
  );
}

function PlaceholderTile({ icon: Icon, label, testid }) {
  return (
    <Tile
      icon={Icon}
      label={label}
      placeholderText="Demnächst"
      color="#94a3b8"
      disabled
      testid={testid}
    />
  );
}

const euroFmt = new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function relativeDay(dateStr) {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - d) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'heute';
  if (diffDays === 1) return 'gestern';
  return `vor ${diffDays}d`;
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { member } = useAuth();
  const grocery = useGrocery();
  const misc = useMisc();
  const asia = useAsia();
  const { activeTodos = [], houseMembers = [] } = useTodos() || {};
  const chores = useChores();
  const expenses = useExpenses();

  const name = member?.display_name || '';
  const currentUserId = member?.user_id;

  const sortedMembers = [...(houseMembers || [])].sort((a, b) =>
    a.user_id === currentUserId ? -1 : b.user_id === currentUserId ? 1 : 0
  );

  // ---- Calendar (heute/morgen, exkl. Iris-Schichten als reguläre Termine) ----
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarPrefs, setCalendarPrefs] = useState([]);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    (async () => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfDayAfterTomorrow = new Date(startOfToday);
      startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 2);
      const [evRes, prefRes] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('start_time, end_time, is_all_day, summary, google_calendar_id, color_id')
          .gte('start_time', startOfToday.toISOString())
          .lt('start_time', startOfDayAfterTomorrow.toISOString())
          .order('start_time', { ascending: true }),
        supabase
          .from('user_calendar_preferences')
          .select('google_calendar_id, background_color')
          .eq('user_id', currentUserId),
      ]);
      if (!cancelled) {
        setCalendarEvents(evRes.data || []);
        setCalendarPrefs(prefRes.data || []);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUserId]);

  const pillColorFor = (ev) => {
    if (ev.color_id && GOOGLE_COLOR_IDS[ev.color_id]) {
      return GOOGLE_COLOR_IDS[ev.color_id];
    }
    const pref = calendarPrefs.find((p) => p.google_calendar_id === ev.google_calendar_id);
    return pref?.background_color || '#94A3B8';
  };

  const calSummary = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfDayAfterTomorrow = new Date(startOfToday);
    startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 2);

    const todayAll = calendarEvents.filter((e) => {
      const s = new Date(e.start_time);
      return s >= startOfToday && s < startOfTomorrow;
    });
    const tomorrowAll = calendarEvents.filter((e) => {
      const s = new Date(e.start_time);
      return s >= startOfTomorrow && s < startOfDayAfterTomorrow;
    });

    const upcomingFilter = (e) => {
      const cmp = e.is_all_day ? new Date(e.end_time) : new Date(e.start_time);
      return cmp > now;
    };

    const todayUpcomingNonIris = todayAll.filter((e) => e.summary !== 'Iris Arbeit' && upcomingFilter(e));
    const todayIrisUpcoming = todayAll.filter((e) => e.summary === 'Iris Arbeit' && upcomingFilter(e));
    const todayIrisAll = todayAll.filter((e) => e.summary === 'Iris Arbeit');

    if (todayUpcomingNonIris.length > 0 || todayIrisUpcoming.length > 0) {
      const allDayUpcoming = todayUpcomingNonIris.filter((e) => e.is_all_day);
      const timedUpcoming = todayUpcomingNonIris
        .filter((e) => !e.is_all_day)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      const allDayItems = [...allDayUpcoming];
      if (todayIrisAll.length > 0) {
        allDayItems.push({
          id: 'iris-arbeit-tile-today',
          _isIrisArbeit: true,
          google_calendar_id: todayIrisAll[0].google_calendar_id,
          color_id: todayIrisAll[0].color_id,
        });
      }
      return {
        mode: 'today',
        allDayItems,
        nextTimed: timedUpcoming[0] || null,
        remainingTimedCount: Math.max(0, timedUpcoming.length - 1),
      };
    }

    const tomorrowNonIris = tomorrowAll.filter((e) => e.summary !== 'Iris Arbeit');
    const tomorrowIris = tomorrowAll.filter((e) => e.summary === 'Iris Arbeit');

    if (tomorrowNonIris.length > 0 || tomorrowIris.length > 0) {
      const allDayMorgen = tomorrowNonIris.filter((e) => e.is_all_day);
      const timedMorgen = tomorrowNonIris
        .filter((e) => !e.is_all_day)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      const allDayItems = [...allDayMorgen];
      if (tomorrowIris.length > 0) {
        allDayItems.push({
          id: 'iris-arbeit-tile-tomorrow',
          _isIrisArbeit: true,
          google_calendar_id: tomorrowIris[0].google_calendar_id,
          color_id: tomorrowIris[0].color_id,
        });
      }
      return {
        mode: 'tomorrow',
        allDayItems,
        nextTimed: timedMorgen[0] || null,
        remainingTimedCount: Math.max(0, timedMorgen.length - 1),
      };
    }

    return { mode: 'today', allDayItems: [], nextTimed: null, remainingTimedCount: 0 };
  }, [calendarEvents]);

  // ---- Tasks ----
  const taskRows = sortedMembers.map((m) => {
    const userTodos = activeTodos.filter((t) => t.assigned_to === m.user_id);
    const userHighPrio = userTodos.filter((t) => t.priority === 'high').length;
    return {
      layout: 'inline',
      icon: User,
      iconColor: m.color,
      label: m.display_name,
      value: userTodos.length,
      usePill: true,
      extra: userHighPrio > 0 ? (
        <span
          className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-base font-bold tabular-nums border-[1.5px]"
          style={{
            borderColor: '#EF4444',
            backgroundColor: '#EF444415',
            color: '#EF4444',
          }}
        >
          {userHighPrio}
        </span>
      ) : null,
    };
  });

  // ---- Chores ----
  const choresList = chores?.chores || [];
  const weeklyStats = chores?.weeklyStats || {};
  const periodCompletions = chores?.periodCompletions;
  const targetCount = chores?.targetCount;
  const openChores = (periodCompletions && targetCount)
    ? choresList.filter((c) => periodCompletions(c).length < targetCount(c)).length
    : 0;
  const choreRows = [
    ...sortedMembers.map((m) => ({
      layout: 'row',
      icon: User,
      iconColor: m.color,
      label: m.display_name,
      value: weeklyStats[m.user_id] || 0,
      usePill: true,
    })),
    ...(openChores > 0 ? [{
      layout: 'row',
      icon: ListTodo,
      iconColor: '#8B5CF6',
      label: 'Offen',
      value: openChores,
      usePill: true,
    }] : []),
  ];

  // ---- Shopping ----
  const shoppingRows = [
    { layout: 'row', icon: Apple, iconColor: '#10B981', label: 'Essen', value: grocery?.uncheckedCount || 0, usePill: true },
    { layout: 'row', icon: ShoppingBag, iconColor: '#F59E0B', label: 'Sonstiges', value: misc?.uncheckedCount || 0, usePill: true },
    { layout: 'row', icon: Soup, iconColor: '#14B8A6', label: 'Asia', value: asia?.uncheckedCount || 0, usePill: true },
  ];

  // ---- Finanzen ----
  const balance = expenses?.balance;
  const monthlySum = expenses?.sumAllUsersThisMonth || 0;
  const lastExpenseDate = expenses?.expenses?.[0]?.expense_date || null;

  let balanceText = '0 €';
  if (balance && !balance.quitt) {
    const sign = balance.owed_by === currentUserId ? '-' : '+';
    balanceText = `${sign}${euroFmt.format(balance.amount)}`;
  }
  const monthName = new Date().toLocaleDateString('de-DE', { month: 'long' });

  const financeRows = [
    { icon: null, label: 'Balance', value: balanceText, boldValue: false },
    { icon: null, label: monthName, value: euroFmt.format(monthlySum), boldValue: false },
    { icon: null, label: 'Letzter', value: relativeDay(lastExpenseDate), boldValue: false },
  ];

  return (
    <div
      data-testid="dashboard-home"
      className="flex flex-col h-[calc(100dvh-64px-80px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]"
    >
      <div className="pt-3 pb-4 px-1 shrink-0">
        <h1
          className="text-xl font-bold text-slate-900 dark:text-slate-50"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {greeting()}, {name}!
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
          {formatDate()}
        </p>
      </div>

      <div className="grid grid-cols-3 grid-rows-3 gap-3 flex-1 min-h-0 pb-2">
        <Tile
          testid="tile-shopping"
          icon={ShoppingCart}
          label="Shopping"
          rows={shoppingRows}
          color="#F97316"
          onClick={() => navigate('/shopping')}
        />
        <Tile
          testid="tile-tasks"
          icon={CheckSquare}
          label="Tasks"
          rows={taskRows}
          color="#6366F1"
          onClick={() => navigate('/tasks')}
        />
        <Tile
          testid="tile-chores"
          icon={RefreshCw}
          label="Chores"
          rows={choreRows}
          color="#8B5CF6"
          onClick={() => navigate('/chores')}
        />

        <Tile
          testid="tile-expenses"
          icon={Wallet}
          label="Finanzen"
          rows={financeRows}
          color="#10B981"
          onClick={() => navigate('/expenses')}
        />
        <Tile
          testid="tile-week"
          icon={Calendar}
          label="Woche"
          color="#0EA5E9"
          onClick={() => navigate('/calendar')}
        >
          <div className="flex-1 flex flex-col">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {calSummary.mode === 'today' ? 'Heute' : 'Morgen'}
            </p>

            {calSummary.allDayItems.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {calSummary.allDayItems.map((ev) => (
                  <span
                    key={ev.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 max-w-[140px]"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: pillColorFor(ev) }}
                      aria-hidden="true"
                    />
                    <span className={`truncate ${ev._isIrisArbeit ? 'italic' : ''}`}>
                      {ev._isIrisArbeit ? 'Iris arbeitet' : (ev.summary || '(Kein Titel)')}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {calSummary.allDayItems.length > 0 && calSummary.nextTimed && (
              <div className="border-t border-slate-200 dark:border-slate-800 my-2" />
            )}

            {calSummary.nextTimed && (
              <p className="text-xs text-slate-700 dark:text-slate-200 truncate">
                → {formatTimeShort(calSummary.nextTimed.start_time)} {calSummary.nextTimed.summary || '(Kein Titel)'}
              </p>
            )}

            {calSummary.remainingTimedCount > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                +{calSummary.remainingTimedCount} weitere
              </p>
            )}

            {calSummary.allDayItems.length === 0 && !calSummary.nextTimed && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Keine Termine
              </p>
            )}
          </div>
        </Tile>
        <Tile
          testid="tile-projects"
          icon={FolderKanban}
          label="Projekte"
          color="#E11D48"
          onClick={() => navigate('/projects')}
        >
          <ProjectsTile />
        </Tile>

        <PlaceholderTile icon={Cake} label="Birthdays" testid="tile-birthdays-placeholder" />
        <Tile
          testid="tile-statistics"
          icon={Trophy}
          label="Statistik"
          placeholderText="Übersicht →"
          color="#F59E0B"
          onClick={() => navigate('/statistics')}
        />
        <Tile
          testid="tile-settings"
          icon={SettingsIcon}
          label="Settings"
          placeholderText="Konto →"
          color="#64748B"
          onClick={() => navigate('/settings')}
        />
      </div>
    </div>
  );
}
