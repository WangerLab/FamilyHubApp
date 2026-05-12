import React, { useEffect, useState, useRef } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const MAX_LEN = 1500;
export default function NoteBrainDumpSheet({ open, onClose, existingNote, onResult }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);
  const [appendChoice, setAppendChoice] = useState(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setMounted(true));
      const t = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
    setMounted(false);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  useEffect(() => {
    if (retryAfter <= 0) return;
    const t = setInterval(() => setRetryAfter((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [retryAfter]);

  if (!open && !visible) return null;

  const overLimit = text.length > MAX_LEN;
  const needsChoice = !!existingNote && !appendChoice;
  const submitDisabled = !text.trim() || loading || retryAfter > 0 || needsChoice || overLimit;
  const handleSubmit = async () => {
    if (submitDisabled) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/brain-dump/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, text: text.trim(), mode: 'project_note' }),
      });
      if (res.status === 429) {
        const retry = parseInt(res.headers.get('Retry-After') || '60', 10);
        setRetryAfter(retry);
        setError(`Zu viele Anfragen. Bitte warte ${retry}s.`);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'Etwas ist schief gelaufen.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      onResult({
        note_markdown: data.note_markdown || '',
        follow_ups: data.follow_ups || [],
        appendChoice: existingNote ? appendChoice : 'overwrite',
      });
      setText('');
      setAppendChoice(null);
      setLoading(false);
    } catch (e) {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative sm:max-w-[480px] w-full mx-auto max-h-[85dvh] rounded-t-3xl bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-transform duration-300 ${mounted ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onTransitionEnd={() => { if (!open) setVisible(false); }}
      >
        <div className="relative pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-2 rounded-xl text-slate-400 dark:text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pt-2 pb-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50" style={{ fontFamily: 'Manrope, sans-serif' }}>Notiz Brain Dump</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Beschreibe, was passiert ist — die KI strukturiert und erkennt eventuelle Folge-Aufgaben.</p>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 resize-none"
            placeholder="z.B. Beet umgegraben, Mulch ist alle, brauchen noch eine zweite Gartenschere"
          />
          <p className={`text-xs text-right ${overLimit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {text.length} / {MAX_LEN}
          </p>
          {existingNote && (
            !appendChoice ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600 dark:text-slate-400">Es gibt bereits eine Notiz für diesen Task.</p>
                <div className="flex gap-2">
                  <button onClick={() => setAppendChoice('overwrite')} className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 text-sm font-medium active:opacity-70">Überschreiben</button>
                  <button onClick={() => setAppendChoice('append')} className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 text-sm font-medium active:opacity-70">Anhängen</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAppendChoice(null)} className="text-xs text-slate-500 dark:text-slate-400 underline active:opacity-70">
                Modus: {appendChoice === 'overwrite' ? 'Überschreiben' : 'Anhängen'}
              </button>
            )
          )}
          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{error}</div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="w-full rounded-xl bg-rose-500 text-white py-3 text-sm font-semibold active:opacity-70 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />KI denkt nach…</>
            ) : retryAfter > 0 ? (
              <>Bitte warten: {retryAfter}s</>
            ) : (
              <><Sparkles className="w-4 h-4" />Strukturieren</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
