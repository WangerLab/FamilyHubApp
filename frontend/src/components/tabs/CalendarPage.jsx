import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { triggerCalendarSync } from '../../lib/googleAuth';

export default function CalendarPage() {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [snack, setSnack] = useState(null);

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
    } catch (e) {
      setSnack({ kind: 'error', text: `Sync fehlgeschlagen: ${e.message}` });
    } finally {
      setSyncing(false);
    }
  };

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

      <div className="flex items-center justify-center pt-16">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Wochenliste folgt in H-5b
        </p>
      </div>

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
