import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import BrainDump from './BrainDump';

const SUBTITLES = {
  grocery: 'Nahrungsmittel erfassen',
  misc: 'Non-Food erfassen',
  todos: 'Aufgaben erkennen',
  expense: 'Ausgaben erfassen',
};

export default function BrainDumpSheet({ open, onClose, mode }) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open && !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative max-w-[412px] w-full mx-auto max-h-[85dvh] rounded-t-3xl bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-transform duration-300 ${
          mounted ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onTransitionEnd={() => { if (!open) setVisible(false); }}
      >
        {/* Grabber + close */}
        <div className="relative pt-3 pb-1">
          <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-2 rounded-xl text-slate-400 dark:text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div className="px-4 pb-2">
          <p className="text-base font-bold text-slate-900 dark:text-slate-50" style={{ fontFamily: 'Manrope, sans-serif' }}>
            KI Brain Dump
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{SUBTITLES[mode] ?? 'Text in Einträge umwandeln'}</p>
        </div>

        {/* Content */}
        <BrainDump mode={mode} embedded={true} />
      </div>
    </div>
  );
}
