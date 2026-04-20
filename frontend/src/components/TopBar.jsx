import React from 'react';
import { Sun, Moon, Cpu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function TopBar() {
  const { member } = useAuth();
  const { mode, resolvedTheme, toggleTheme } = useTheme();

  const initials = member?.display_name
    ? member.display_name.slice(0, 2).toUpperCase()
    : '?';
  const color = member?.color || '#3B82F6';
  const displayName = member?.display_name || 'Loading…';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md max-w-[412px] mx-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(64px + env(safe-area-inset-top))' }}
    >
      {/* User info */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          data-testid="user-avatar"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md"
          style={{ backgroundColor: color, boxShadow: `0 2px 8px ${color}40` }}
          aria-label={`${displayName}'s avatar`}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p
            data-testid="user-display-name"
            className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate leading-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {displayName}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
            Wanger Family Hub
          </p>
        </div>
      </div>

      {/* Theme toggle */}
      <button
        data-testid="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch theme (currently ${mode === 'auto' ? 'auto: ' + resolvedTheme : resolvedTheme})`}
        className="relative w-11 h-11 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all duration-100"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
        {mode === 'auto' && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500"
            title="Following system preference"
          />
        )}
      </button>
    </header>
  );
}
