import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Palette, Monitor, Sun, Moon, ChevronRight, Check, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const PRESET_COLORS = [
  { label: "Tim Pink", value: "#EC4899" },
  { label: "Iris Blau", value: "#2563EB" },
  { label: "Emerald", value: "#10B981" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Cyan", value: "#06B6D4" },
];

export default function MoreTab() {
  const navigate = useNavigate();
  const { member, signOut, updateMemberColor, updateDisplayName } = useAuth();
  const { mode, resolvedTheme, toggleTheme, resetToAuto } = useTheme();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(member?.display_name || '');
  const [savingName, setSavingName] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const color = member?.color || '#3B82F6';

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === member?.display_name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    await updateDisplayName(nameInput.trim());
    setSavingName(false);
    setEditingName(false);
  };

  const handleColorChange = async (newColor) => {
    setSavingColor(true);
    await updateMemberColor(newColor);
    setSavingColor(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
  };

  return (
    <div
      data-testid="more-tab"
      className="space-y-6 pb-4"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Features section */}
      <section className="space-y-1">
        <h3
          className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pt-2"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Module
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            data-testid="more-expenses-link"
            onClick={() => navigate('/expenses')}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-100 dark:bg-violet-950/40">
              <Wallet className="w-5 h-5 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Ausgaben</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Gemeinsame Ausgaben & Saldo</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </section>

      {/* Profile section */}
      <section className="space-y-1">
        <h3
          className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pt-2"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Profile
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 dark:border-slate-800">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ backgroundColor: color }}
            >
              {member?.display_name?.slice(0, 2).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">Display Name</p>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    data-testid="display-name-input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                    className="flex-1 text-base font-semibold bg-transparent border-b-2 border-blue-500 outline-none text-slate-900 dark:text-slate-50"
                  />
                  <button
                    data-testid="save-display-name-button"
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="text-blue-500 font-medium text-sm"
                  >
                    {savingName ? '…' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  data-testid="edit-display-name-button"
                  onClick={() => { setNameInput(member?.display_name || ''); setEditingName(true); }}
                  className="flex items-center gap-1 text-base font-semibold text-slate-900 dark:text-slate-50 active:opacity-60 transition-opacity"
                >
                  {member?.display_name || '—'}
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
                </button>
              )}
            </div>
          </div>

          {/* Color picker */}
          <div className="px-4 py-4">
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Your Color
            </p>
            <div className="flex flex-wrap gap-3">
              {PRESET_COLORS.map(({ label, value }) => (
                <button
                  key={value}
                  data-testid={`color-swatch-${value.replace('#', '')}`}
                  onClick={() => handleColorChange(value)}
                  disabled={savingColor}
                  aria-label={label}
                  className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-100 relative"
                  style={{ backgroundColor: value }}
                >
                  {color === value && (
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Appearance section */}
      <section className="space-y-1">
        <h3
          className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Appearance
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {/* System auto */}
          <button
            data-testid="theme-system-button"
            onClick={resetToAuto}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === 'auto' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Monitor className={`w-5 h-5 ${mode === 'auto' ? 'text-blue-500' : 'text-slate-400'}`} />
            </div>
            <span className={`text-sm font-medium flex-1 ${mode === 'auto' ? 'text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-400'}`}>
              Follow System
            </span>
            {mode === 'auto' && <Check className="w-4 h-4 text-blue-500" />}
          </button>

          {/* Light mode */}
          <button
            data-testid="theme-light-button"
            onClick={() => { if (mode !== 'light') toggleTheme(); }}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === 'light' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Sun className={`w-5 h-5 ${mode === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>
            <span className={`text-sm font-medium flex-1 ${mode === 'light' ? 'text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-400'}`}>
              Light Mode
            </span>
            {mode === 'light' && <Check className="w-4 h-4 text-amber-500" />}
          </button>

          {/* Dark mode */}
          <button
            data-testid="theme-dark-button"
            onClick={() => { if (mode !== 'dark') toggleTheme(); }}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === 'dark' ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Moon className={`w-5 h-5 ${mode === 'dark' ? 'text-indigo-500' : 'text-slate-400'}`} />
            </div>
            <span className={`text-sm font-medium flex-1 ${mode === 'dark' ? 'text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-400'}`}>
              Dark Mode
            </span>
            {mode === 'dark' && <Check className="w-4 h-4 text-indigo-500" />}
          </button>
        </div>
      </section>

      {/* Account section */}
      <section className="space-y-1">
        <h3
          className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Account
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                {member?.display_name || '—'}
              </p>
            </div>
          </div>

          <button
            data-testid="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left active:bg-red-50 dark:active:bg-red-950/20 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-950/30">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500 flex-1">
              {loggingOut ? 'Signing out…' : 'Sign Out'}
            </span>
          </button>
        </div>
      </section>

      {/* App info */}
      <div className="text-center py-2">
        <p className="text-xs text-slate-300 dark:text-slate-700">
          Wanger Family Hub v1.0
        </p>
      </div>
    </div>
  );
}
