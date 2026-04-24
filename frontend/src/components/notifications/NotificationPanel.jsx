import React, { useEffect } from 'react';
import { X, Check, Bell, ShoppingCart, CheckSquare, RefreshCw, Package } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';
import { useAuth } from '../../contexts/AuthContext';

const ACTION_ICON = {
  grocery_add:    { Icon: ShoppingCart, color: '#22C55E' },
  grocery_check:  { Icon: Check,        color: '#0EA5E9' },
  misc_add:       { Icon: Package,      color: '#A855F7' },
  misc_check:     { Icon: Check,        color: '#A855F7' },
  shopping_complete: { Icon: ShoppingCart, color: '#22C55E' },
  todo_create:    { Icon: CheckSquare,  color: '#3B82F6' },
  todo_complete:  { Icon: Check,        color: '#22C55E' },
  todo_nudge:     { Icon: Bell,         color: '#F59E0B' },
  chore_complete: { Icon: RefreshCw,    color: '#22C55E' },
  expense_add:    { Icon: Package,      color: '#8B5CF6' },
};

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `vor ${days}T`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export default function NotificationPanel({ open, onClose }) {
  const { user } = useAuth();
  const { entries, unreadCount, markAllRead, memberMap } = useActivity() || {};

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        data-testid="notification-overlay"
        onClick={onClose}
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      />
      <div
        data-testid="notification-panel"
        className="fixed z-[56] left-0 right-0 bottom-0 sm:max-w-[480px] mx-auto bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl animate-[slideUp_0.25s_ease-out] max-h-[80vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              className="text-lg font-bold text-slate-900 dark:text-slate-50"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Benachrichtigungen
            </h2>
            {unreadCount > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {unreadCount} ungelesen
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                data-testid="mark-all-read-button"
                onClick={markAllRead}
                className="h-8 px-3 rounded-lg bg-blue-500 text-white text-xs font-semibold active:scale-95"
              >
                Alle gelesen
              </button>
            )}
            <button
              data-testid="notification-close"
              onClick={onClose}
              aria-label="Schließen"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {(!entries || entries.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-4">
                <Bell className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Noch keine Aktivitäten
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[240px]">
                Hier erscheint was Tim und Iris so treiben.
              </p>
            </div>
          ) : (
            <ul data-testid="notification-list" className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {entries.map((e) => {
                const unread = !(e.read_by_user_ids || []).includes(user?.id);
                const actor = memberMap?.[e.actor_id];
                const meta = ACTION_ICON[e.action_type] || { Icon: Bell, color: '#64748b' };
                const { Icon } = meta;
                const iconColor = actor?.color || meta.color;
                return (
                  <li
                    key={e.id}
                    data-testid={`notification-${e.id}`}
                    className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                      unread ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${iconColor}20`, color: iconColor }}
                    >
                      <Icon className="w-4 h-4" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] text-slate-800 dark:text-slate-100 leading-snug"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {e.description}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                        {timeAgo(e.created_at)}
                      </p>
                    </div>
                    {unread && (
                      <span
                        className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"
                        aria-label="ungelesen"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </>
  );
}
