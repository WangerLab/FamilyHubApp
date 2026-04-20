import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Loader2, X, Check, Trash2 } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useAuth } from '../../contexts/AuthContext';
import { useGrocery } from '../../contexts/GroceryContext';

const MAX_CHARS = 500;
const UNITS = ['Stück', 'g', 'kg', 'ml', 'L', 'Packung', 'Dose', 'Flasche', 'Bund', 'Glas'];

function formatCountdown(sec) {
  if (sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function BrainDump() {
  const { user, member } = useAuth();
  const { addItem } = useGrocery();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // array of items or null
  const [retryAfter, setRetryAfter] = useState(0);
  const textareaRef = useRef(null);
  const userColor = member?.color || '#3B82F6';
  const userId = user?.id;
  const API = process.env.REACT_APP_BACKEND_URL;

  // Countdown tick for rate-limit cooldown
  useEffect(() => {
    if (retryAfter <= 0) return;
    const t = setInterval(() => {
      setRetryAfter((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [retryAfter]);

  // Autofocus on expand
  useEffect(() => {
    if (expanded && !preview && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [expanded, preview]);

  const charsLeft = MAX_CHARS - text.length;
  const overLimit = text.length > MAX_CHARS;
  const canParse = !loading && text.trim().length > 0 && !overLimit && retryAfter === 0 && userId;

  const handleParse = async () => {
    if (!canParse) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/brain-dump/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, text: text.trim() }),
      });
      if (res.status === 429) {
        const retry = parseInt(res.headers.get('Retry-After') || '60', 10);
        setRetryAfter(retry);
        setError(`Zu viele Anfragen. Bitte warte ${formatCountdown(retry)}.`);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'Etwas ist schief gelaufen. Bitte erneut versuchen.');
        return;
      }
      const data = await res.json();
      const items = (data.items || []).map((it, idx) => ({
        ...it,
        _localId: `${Date.now()}-${idx}`,
        _selected: true,
      }));
      if (items.length === 0) {
        setError('Keine Artikel erkannt. Versuche es mit einem klareren Text.');
        return;
      }
      setPreview(items);
    } catch (e) {
      setError('Netzwerkfehler. Bitte Verbindung prüfen.');
    } finally {
      setLoading(false);
    }
  };

  const updatePreviewItem = (localId, patch) => {
    setPreview((prev) =>
      prev.map((it) => (it._localId === localId ? { ...it, ...patch } : it))
    );
  };

  const removePreviewItem = (localId) => {
    setPreview((prev) => prev.filter((it) => it._localId !== localId));
  };

  const handleSaveAll = async () => {
    const toSave = preview.filter((it) => it._selected && it.name.trim());
    if (toSave.length === 0) return;
    setLoading(true);
    for (const it of toSave) {
      await addItem({
        name: it.name.trim(),
        category: it.category,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || null,
        note: it.note?.trim() || null,
      });
    }
    setLoading(false);
    // Reset UI: clear, collapse, close preview
    setText('');
    setPreview(null);
    setExpanded(false);
  };

  const handleDiscardPreview = () => {
    setPreview(null);
  };

  const selectedCount = preview ? preview.filter((it) => it._selected).length : 0;

  return (
    <div
      data-testid="brain-dump-section"
      className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
    >
      {/* Header toggle */}
      <button
        data-testid="brain-dump-toggle"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 active:bg-slate-100 dark:active:bg-slate-900 transition-colors"
        aria-expanded={expanded}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${userColor}15`, color: userColor }}
        >
          <Sparkles className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <span
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          KI Brain Dump
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          freien Text in Artikel umwandeln
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-auto text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {!preview && (
            <>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  data-testid="brain-dump-textarea"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS + 20))}
                  placeholder="z.B. 2 Äpfel, 500g Hack, eine Packung Nudeln, Milch laktosefrei, 6 Eier…"
                  rows={4}
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[14px] leading-snug text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-60"
                  style={{ fontFamily: 'DM Sans, sans-serif', '--tw-ring-color': userColor }}
                />
                <div
                  data-testid="brain-dump-charcount"
                  className={`absolute bottom-2 right-3 text-[11px] tabular-nums font-medium ${
                    overLimit ? 'text-red-500' : charsLeft < 50 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {text.length}/{MAX_CHARS}
                </div>
              </div>

              {error && (
                <div
                  data-testid="brain-dump-error"
                  className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2"
                >
                  {error}
                  {retryAfter > 0 && (
                    <span className="ml-1 font-semibold">({formatCountdown(retryAfter)})</span>
                  )}
                </div>
              )}

              <button
                data-testid="brain-dump-parse-button"
                onClick={handleParse}
                disabled={!canParse}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
                style={{ backgroundColor: userColor, fontFamily: 'Manrope, sans-serif' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    KI denkt nach…
                  </>
                ) : retryAfter > 0 ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Warten ({formatCountdown(retryAfter)})
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    KI-Parse
                  </>
                )}
              </button>
            </>
          )}

          {preview && (
            <div data-testid="brain-dump-preview" className="space-y-2">
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {preview.length} erkannt · {selectedCount} ausgewählt
                </p>
                <button
                  data-testid="brain-dump-discard"
                  onClick={handleDiscardPreview}
                  className="text-xs text-slate-500 dark:text-slate-400 font-medium active:opacity-60"
                >
                  Verwerfen
                </button>
              </div>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto -mx-1 px-1">
                {preview.map((it) => (
                  <PreviewRow
                    key={it._localId}
                    item={it}
                    onChange={(patch) => updatePreviewItem(it._localId, patch)}
                    onRemove={() => removePreviewItem(it._localId)}
                    userColor={userColor}
                  />
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  data-testid="brain-dump-cancel"
                  onClick={handleDiscardPreview}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm active:bg-slate-100 dark:active:bg-slate-800"
                >
                  Abbrechen
                </button>
                <button
                  data-testid="brain-dump-save"
                  onClick={handleSaveAll}
                  disabled={loading || selectedCount === 0}
                  className="flex-[1.5] h-11 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: userColor, fontFamily: 'Manrope, sans-serif' }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {selectedCount} hinzufügen
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewRow({ item, onChange, onRemove, userColor }) {
  const cat = CATEGORIES.find((c) => c.name === item.category);
  return (
    <div
      data-testid="brain-dump-preview-row"
      className={`rounded-xl border p-2.5 transition-all ${
        item._selected
          ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
          : 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 opacity-60'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Select checkbox */}
        <button
          data-testid="brain-dump-preview-select"
          onClick={() => onChange({ _selected: !item._selected })}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
            item._selected ? 'border-transparent' : 'border-slate-300 dark:border-slate-600 bg-transparent'
          }`}
          style={item._selected ? { backgroundColor: userColor } : {}}
          aria-pressed={item._selected}
        >
          {item._selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Row 1: name */}
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">{cat?.emoji || '🛒'}</span>
            <input
              data-testid="brain-dump-preview-name"
              value={item.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="flex-1 min-w-0 bg-transparent text-[15px] font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            />
            <button
              data-testid="brain-dump-preview-remove"
              onClick={onRemove}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 active:bg-slate-100 dark:active:bg-slate-800 shrink-0"
              aria-label="Entfernen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Row 2: quantity + unit + category */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              data-testid="brain-dump-preview-qty"
              type="number"
              min="0"
              step="any"
              value={item.quantity}
              onChange={(e) => onChange({ quantity: e.target.value })}
              className="w-14 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-sm tabular-nums text-slate-700 dark:text-slate-200 focus:outline-none"
            />
            <select
              data-testid="brain-dump-preview-unit"
              value={item.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select
              data-testid="brain-dump-preview-category"
              value={item.category}
              onChange={(e) => onChange({ category: e.target.value })}
              className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none flex-1 min-w-[120px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 3: note (optional) */}
          {(item.note || item._showNote) && (
            <input
              data-testid="brain-dump-preview-note"
              value={item.note}
              onChange={(e) => onChange({ note: e.target.value })}
              placeholder="Notiz…"
              className="w-full h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none"
            />
          )}
          {!item.note && !item._showNote && (
            <button
              onClick={() => onChange({ _showNote: true })}
              className="text-[11px] text-slate-400 dark:text-slate-500 font-medium active:opacity-60"
            >
              + Notiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
