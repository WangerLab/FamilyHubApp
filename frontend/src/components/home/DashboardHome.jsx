import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CheckSquare, RefreshCw, Calendar, ChevronRight, AlertCircle, Sparkles, Package, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGrocery } from '../../contexts/GroceryContext';
import { useMisc } from '../../contexts/MiscContext';
import { useTodos } from '../../contexts/TodosContext';
import { useChores } from '../../contexts/ChoresContext';
import { useExpenses } from '../../contexts/ExpensesContext';
import { formatDueDateDE } from '../../utils/smartDate';
import WeeklyRecap from './WeeklyRecap';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

const PRIORITY_META = {
  high:   { color: '#EF4444', emoji: '🔴' },
  medium: { color: '#F59E0B', emoji: '🟡' },
  low:    { color: '#22C55E', emoji: '🟢' },
};

function SectionCard({ children, onClick, testid, accentColor }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 active:scale-[0.99] transition-transform shadow-sm hover:shadow-md"
      style={accentColor ? { boxShadow: `0 1px 0 ${accentColor}15 inset` } : undefined}
    >
      {children}
    </button>
  );
}

function SectionHeader({ icon: Icon, title, color, count, trailingText }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18`, color }}
      >
        <Icon className="w-4 h-4" strokeWidth={2.2} />
      </div>
      <h3
        className="text-[15px] font-bold text-slate-900 dark:text-slate-50 flex-1"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {title}
      </h3>
      {count !== undefined && (
        <span
          className="text-xs font-bold tabular-nums h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {count}
        </span>
      )}
      {trailingText && (
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{trailingText}</span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
    </div>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { member } = useAuth();
  const grocery = useGrocery();
  const misc = useMisc();
  const { activeTodos = [] } = useTodos() || {};
  const chores = useChores();
  const expenses = useExpenses();

  const color = member?.color || '#3B82F6';
  const name = member?.display_name || '';

  // --- Upcoming todos: overdue OR (high priority AND due within 48h), max 3 ---
  const upcomingTodos = React.useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 48 * 3600 * 1000);
    const candidates = activeTodos.filter((t) => {
      if (!t.due_date) return t.priority === 'high';
      const due = new Date(t.due_date);
      return due < soon; // covers overdue + due within 48h
    });
    // Sort: overdue first, then by due_date asc, high priority boost
    candidates.sort((a, b) => {
      const aOv = a.due_date && new Date(a.due_date) < now;
      const bOv = b.due_date && new Date(b.due_date) < now;
      if (aOv !== bOv) return aOv ? -1 : 1;
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
    return candidates.slice(0, 3);
  }, [activeTodos]);

  const groceryCount = grocery?.uncheckedCount || 0;
  const miscCount = misc?.uncheckedCount || 0;
  const shoppingTotal = groceryCount + miscCount;

  // Chores: not yet completed in their current period
  const choresOpen = React.useMemo(() => {
    if (!chores?.chores) return [];
    return chores.chores.filter((c) => {
      const done = chores.periodCompletions(c).length;
      const target = chores.targetCount(c);
      return done < target;
    });
  }, [chores]);

  const totalOverdue = activeTodos.filter((t) => t.due_date && new Date(t.due_date) < new Date()).length;

  return (
    <div data-testid="dashboard-home" className="space-y-4 pb-4">
      {/* Greeting */}
      <div className="pt-2">
        <h1
          className="text-2xl font-bold text-slate-900 dark:text-slate-50 leading-tight"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {greeting()},{' '}
          <span style={{ color }}>{name}!</span>
        </h1>
        {totalOverdue > 0 ? (
          <p className="text-sm text-red-500 dark:text-red-400 mt-1 flex items-center gap-1 font-medium">
            <AlertCircle className="w-4 h-4" />
            {totalOverdue} überfällige Aufgabe{totalOverdue === 1 ? '' : 'n'}
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schön dich zu sehen.
          </p>
        )}
      </div>

      {/* Section: Upcoming Todos */}
      <SectionCard
        testid="dashboard-todos-card"
        accentColor="#3B82F6"
        onClick={() => navigate('/tasks')}
      >
        <SectionHeader
          icon={CheckSquare}
          title="Aktuell wichtig"
          color="#3B82F6"
          count={upcomingTodos.length}
        />
        {upcomingTodos.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Nichts Dringendes. Entspann dich 🌿
          </p>
        ) : (
          <div className="space-y-1.5">
            {upcomingTodos.map((t) => {
              const prio = PRIORITY_META[t.priority] || PRIORITY_META.medium;
              const overdue = t.due_date && new Date(t.due_date) < new Date();
              return (
                <div
                  key={t.id}
                  data-testid={`dashboard-todo-${t.id}`}
                  className={`flex items-center gap-2 pl-2 py-1.5 pr-1 rounded-lg ${
                    overdue ? 'bg-red-50 dark:bg-red-950/30' : ''
                  }`}
                >
                  <span
                    className="w-1 h-6 rounded-full shrink-0"
                    style={{ backgroundColor: prio.color }}
                  />
                  <p className="text-sm text-slate-800 dark:text-slate-200 flex-1 min-w-0 truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {t.title}
                  </p>
                  {t.due_date && (
                    <span
                      className={`text-[11px] tabular-nums shrink-0 ${overdue ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-slate-500'}`}
                    >
                      {formatDueDateDE(t.due_date)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Section: Shopping */}
      <SectionCard
        testid="dashboard-shopping-card"
        accentColor="#22C55E"
        onClick={() => navigate('/shopping')}
      >
        <SectionHeader
          icon={ShoppingCart}
          title="Einkaufsliste"
          color="#22C55E"
          count={shoppingTotal}
        />
        {shoppingTotal === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Liste ist leer</p>
        ) : (
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {groceryCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {groceryCount} Nahrungsmittel
              </span>
            )}
            {miscCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                {miscCount} Sonstiges
              </span>
            )}
          </div>
        )}
      </SectionCard>

      {/* Section: Chores */}
      <SectionCard
        testid="dashboard-chores-card"
        accentColor="#A855F7"
        onClick={() => navigate('/chores')}
      >
        <SectionHeader
          icon={RefreshCw}
          title="Wiederkehrendes"
          color="#A855F7"
          count={choresOpen.length}
          trailingText={choresOpen.length === 0 ? undefined : 'offen'}
        />
        {choresOpen.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {(chores?.chores?.length ?? 0) === 0 ? 'Noch nichts konfiguriert' : 'Alles erledigt 🎉'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {choresOpen.slice(0, 3).map((c) => {
              const done = chores.periodCompletions(c).length;
              const target = chores.targetCount(c);
              return (
                <div key={c.id} className="flex items-center gap-2" data-testid={`dashboard-chore-${c.id}`}>
                  <p className="text-sm text-slate-800 dark:text-slate-200 flex-1 min-w-0 truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {c.title}
                  </p>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {done}/{target}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Section: Expenses balance */}
      <SectionCard
        testid="dashboard-expenses-card"
        accentColor="#8B5CF6"
        onClick={() => navigate('/expenses')}
      >
        <SectionHeader icon={Wallet} title="Ausgaben" color="#8B5CF6" />
        {expenses?.balance?.quitt ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            🎉 Ihr seid quitt!
          </p>
        ) : expenses?.balance ? (
          <p className="text-sm text-slate-700 dark:text-slate-200" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <span className="font-semibold">
              {expenses.memberNameMap[expenses.balance.owed_by] || '—'}
            </span>
            {' '}schuldet{' '}
            <span className="font-semibold" style={{ color: expenses.memberColorMap[expenses.balance.owed_to] }}>
              {expenses.memberNameMap[expenses.balance.owed_to] || '—'}{' '}
              {Number(expenses.balance.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </p>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Ausgaben erfasst</p>
        )}
      </SectionCard>

      {/* Section: Birthdays placeholder */}
      <SectionCard testid="dashboard-birthdays-card" onClick={() => { /* noop for Session 6 */ }} accentColor="#F43F5E">
        <SectionHeader icon={Calendar} title="Geburtstage & Termine" color="#F43F5E" trailingText="bald" />
        <p className="text-sm text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Kommt in Session 8
        </p>
      </SectionCard>

      <WeeklyRecap />
    </div>
  );
}
