import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, CheckSquare, RefreshCw, Wallet,
  Calendar, Pin, Cake, Settings as SettingsIcon, Trophy,
  Apple, ShoppingBag, User, Flame, ListTodo,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGrocery } from '../../contexts/GroceryContext';
import { useMisc } from '../../contexts/MiscContext';
import { useTodos } from '../../contexts/TodosContext';
import { useChores } from '../../contexts/ChoresContext';
import { useExpenses } from '../../contexts/ExpensesContext';

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

function Tile({ icon: Icon, label, rows, color, onClick, disabled, testid, placeholderText }) {
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
        {rows && rows.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {row.icon && (
                  <row.icon
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: row.iconColor || color }}
                    strokeWidth={2.5}
                  />
                )}
                <span className="text-slate-700 dark:text-slate-300 flex-1 truncate">
                  {row.label}
                </span>
                <span
                  className="font-bold tabular-nums"
                  style={{ color: row.valueColor || 'inherit' }}
                >
                  {row.value}
                </span>
              </div>
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
  const { activeTodos = [], houseMembers = [] } = useTodos() || {};
  const chores = useChores();
  const expenses = useExpenses();

  const name = member?.display_name || '';
  const currentUserId = member?.user_id;

  const sortedMembers = [...(houseMembers || [])].sort((a, b) =>
    a.user_id === currentUserId ? -1 : b.user_id === currentUserId ? 1 : 0
  );

  // ---- Tasks ----
  const highPrioCount = activeTodos.filter((t) => t.priority === 'high').length;
  const taskRows = [
    ...sortedMembers.map((m) => ({
      icon: User,
      iconColor: m.color,
      label: m.display_name,
      value: activeTodos.filter((t) => t.assigned_to === m.user_id).length,
    })),
    ...(highPrioCount > 0 ? [{
      icon: Flame,
      iconColor: '#EF4444',
      label: 'Hohe Prio',
      value: highPrioCount,
      valueColor: '#EF4444',
    }] : []),
  ];

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
      icon: User,
      iconColor: m.color,
      label: m.display_name,
      value: weeklyStats[m.user_id] || 0,
    })),
    ...(openChores > 0 ? [{
      icon: ListTodo,
      iconColor: '#8B5CF6',
      label: 'Offen',
      value: openChores,
    }] : []),
  ];

  // ---- Shopping ----
  const shoppingRows = [
    { icon: Apple, label: 'Nahrung', value: grocery?.uncheckedCount || 0 },
    { icon: ShoppingBag, label: 'Sonstiges', value: misc?.uncheckedCount || 0 },
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
    { icon: null, label: 'Balance', value: balanceText },
    { icon: null, label: monthName, value: euroFmt.format(monthlySum) },
    { icon: null, label: 'Letzter', value: relativeDay(lastExpenseDate) },
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
          color="#3B82F6"
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
        <PlaceholderTile icon={Calendar} label="Woche" testid="tile-week-placeholder" />
        <PlaceholderTile icon={Pin} label="Pinboard" testid="tile-pinboard-placeholder" />

        <PlaceholderTile icon={Cake} label="Geburtstage" testid="tile-birthdays-placeholder" />
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
          label="Einstellungen"
          placeholderText="Konto →"
          color="#64748B"
          onClick={() => navigate('/settings')}
        />
      </div>
    </div>
  );
}
