import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, CheckSquare, RefreshCw, Wallet,
  Calendar, Pin, Cake, Settings as SettingsIcon, Trophy,
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

function Tile({ icon: Icon, label, counter, subText, color, onClick, disabled, testid }) {
  const base = 'h-full rounded-2xl p-3 flex flex-col justify-between border transition-all';
  const enabled = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 active:scale-[0.97] shadow-sm hover:shadow-md cursor-pointer';
  const disabledStyle = 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 opacity-60 cursor-default';

  return (
    <button
      data-testid={testid}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${disabled ? disabledStyle : enabled}`}
      aria-label={label}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        {counter && (
          <span
            className="text-sm font-bold tabular-nums h-6 min-w-[24px] px-2 rounded-full flex items-center justify-center"
            style={{ backgroundColor: color, color: '#fff' }}
          >
            {counter}
          </span>
        )}
      </div>
      <div className="text-left">
        <h3
          className="text-[14px] font-bold text-slate-900 dark:text-slate-50 leading-tight"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {label}
        </h3>
        {subText && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight truncate">
            {subText}
          </p>
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
      subText="Demnächst"
      color="#94a3b8"
      disabled
      testid={testid}
    />
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { member } = useAuth();
  const grocery = useGrocery();
  const misc = useMisc();
  const { activeTodos = [], overdueCount = 0 } = useTodos() || {};
  const chores = useChores();
  const expenses = useExpenses();

  const name = member?.display_name || '';

  const shoppingUnchecked = (grocery?.uncheckedCount || 0) + (misc?.uncheckedCount || 0);

  const tasksOpen = activeTodos.length;
  const tasksOverdue = overdueCount;

  const choresCount = chores?.chores?.length || 0;

  const expensesSub = expenses?.balanceLabel || 'Übersicht';

  return (
    <div
      data-testid="dashboard-home"
      className="flex flex-col h-[calc(100dvh-140px)] min-h-[520px]"
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
          counter={shoppingUnchecked > 0 ? String(shoppingUnchecked) : null}
          subText={shoppingUnchecked === 0 ? 'Alles da' : `${shoppingUnchecked} offen`}
          color="#F97316"
          onClick={() => navigate('/shopping')}
        />
        <Tile
          testid="tile-tasks"
          icon={CheckSquare}
          label="Aufgaben"
          counter={tasksOpen > 0 ? String(tasksOpen) : null}
          subText={
            tasksOverdue > 0
              ? `! ${tasksOverdue} überfällig`
              : tasksOpen === 0
                ? 'Keine offen'
                : `${tasksOpen} offen`
          }
          color="#3B82F6"
          onClick={() => navigate('/tasks')}
        />
        <Tile
          testid="tile-chores"
          icon={RefreshCw}
          label="Chores"
          counter={choresCount > 0 ? String(choresCount) : null}
          subText={choresCount === 0 ? 'Nichts angelegt' : `${choresCount} aktiv`}
          color="#8B5CF6"
          onClick={() => navigate('/chores')}
        />

        <Tile
          testid="tile-expenses"
          icon={Wallet}
          label="Finanzen"
          subText={expensesSub}
          color="#10B981"
          onClick={() => navigate('/expenses')}
        />
        <PlaceholderTile icon={Calendar} label="Woche" testid="tile-week-placeholder" />
        <PlaceholderTile icon={Pin} label="Pinboard" testid="tile-pinboard-placeholder" />

        <PlaceholderTile icon={Cake} label="Geburtstage" testid="tile-birthdays-placeholder" />
        <Tile
          testid="tile-settings"
          icon={SettingsIcon}
          label="Einstellungen"
          color="#64748B"
          onClick={() => navigate('/settings')}
        />
        <Tile
          testid="tile-statistics"
          icon={Trophy}
          label="Statistik"
          color="#F59E0B"
          onClick={() => navigate('/statistics')}
        />
      </div>
    </div>
  );
}
