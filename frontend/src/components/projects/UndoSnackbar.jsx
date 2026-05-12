import React from 'react';

/**
 * Snackbar shown after a microtask is soft-deleted. Persists for 5s (controlled
 * by ProjectsContext.pendingMicrotaskDelete state). Sits above the BottomNav.
 *
 * Pattern mirrors UndoSnackbar in TasksTab/ShoppingTab — local copy intentional
 * for now; consolidation into a shared component is tracked tech-debt.
 *
 * @param {string} name - title of the deleted microtask, shown in the message
 * @param {() => void} onUndo - handler invoked when user taps "Rückgängig"
 */
export default function UndoSnackbar({ name, onUndo }) {
  return (
    <div
      data-testid="undo-snackbar-microtask"
      className="fixed z-50 left-3 right-3 sm:max-w-[476px] mx-auto"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom) + 12px)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 shadow-xl shadow-black/20">
        <p
          className="flex-1 text-sm font-medium text-white dark:text-slate-900 truncate"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          „{name}" gelöscht
        </p>
        <button
          data-testid="undo-delete-button-microtask"
          onClick={onUndo}
          className="text-sm font-bold text-blue-400 dark:text-blue-600 active:opacity-70 shrink-0"
        >
          Rückgängig
        </button>
      </div>
    </div>
  );
}
