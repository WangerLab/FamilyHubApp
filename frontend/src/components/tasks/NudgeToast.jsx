import React, { useState } from 'react';
import { X, Bell } from 'lucide-react';
import { useTodos } from '../../contexts/TodosContext';

export default function NudgeToast() {
  const { nudgeToast, dismissNudgeToast } = useTodos();
  if (!nudgeToast) return null;

  return (
    <div
      data-testid="nudge-toast"
      className="fixed z-[60] left-3 right-3 sm:max-w-[476px] mx-auto animate-[slideDown_0.25s_ease-out]"
      style={{ top: 'calc(64px + env(safe-area-inset-top) + 12px)' }}
    >
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-500 shadow-xl shadow-amber-900/30">
        <div className="w-8 h-8 rounded-lg bg-amber-400/40 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {nudgeToast.fromName} hat dich angestupst
          </p>
          <p className="text-sm text-amber-50 mt-0.5 truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            „{nudgeToast.title}"
          </p>
        </div>
        <button
          data-testid="nudge-toast-dismiss"
          onClick={dismissNudgeToast}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 active:bg-white/10 shrink-0"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
