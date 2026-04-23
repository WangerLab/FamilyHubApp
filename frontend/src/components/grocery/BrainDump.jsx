import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Loader2, Check, Trash2 } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { MISC_LOCATIONS, getLocationMeta } from '../../constants/miscLocations';
import { useAuth } from '../../contexts/AuthContext';
import { useGrocery } from '../../contexts/GroceryContext';
import { useMisc } from '../../contexts/MiscContext';
import { useTodos } from '../../contexts/TodosContext';
import { useExpenses } from '../../contexts/ExpensesContext';
import { useActivity } from '../../contexts/ActivityContext';

const MAX_CHARS = 500;
const UNITS = ['Stück', 'g', 'kg', 'ml', 'L', 'Packung', 'Dose', 'Flasche', 'Bund', 'Glas'];

function formatCountdown(sec) {
  if (sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

/**
 * BrainDump — AI parser section.
 * Props:
 *   mode: 'grocery' | 'misc' (default 'grocery')
 */
export default function BrainDump({ mode = 'grocery', floating = false }) {
  const { user, member } = useAuth();
  const { addItem: addGroceryItem } = useGrocery();
  const miscCtx = useMisc();
  const addMiscItem = miscCtx?.addItem;
  const todosCtx = useTodos();
  const addTodoItem = todosCtx?.addTodo;
  const todosMembers = todosCtx?.houseMembers || [];
  const activity = useActivity();

  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [retryAfter, setRetryAfter] = useState(0);
  const textareaRef = useRef(null);
  const userColor = member?.color || '#3B82F6';
  const userId = user?.id;
  const API = '';

  const isMisc = mode === 'misc';
  const isTodos = mode === 'todos';
  const isExpense = mode === 'expense';
  useEffect(() => {
    setPreview(null);
    setError('');
  }, [mode]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const t = setInterval(() => setRetryAfter((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [retryAfter]);

  useEffect(() => {
    if (expanded && !preview && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [expanded, preview]);

  const charsLeft = MAX_CHARS - text.length;
  const overLimit = text.length > MAX_CHARS;
  const canParse = !loading && text.trim().length > 0 && !overLimit && retryAfter === 0 && userId;

  const placeholder = isExpense
    ? 'z.B. Rewe 73,20 €, gestern Tanken 62, Restaurant am Montag 45…'
    : isTodos
    ? 'z.B. Iris soll morgen Auto waschen, Müll heute raus, Arzttermin in drei Tagen hochprio…'
    : isMisc
    ? 'z.B. Ibuprofen, Schrauben 4mm, Hundefutter Nassfutter, Zahnpasta, Batterien AA…'
    : 'z.B. 2 Äpfel, 500g Hack, eine Packung Nudeln, Milch laktosefrei, 6 Eier…';

  const handleParse = async () => {
    if (!canParse) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/brain-dump/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, text: text.trim(), mode }),
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
      const items = (data.items || []).map((it, idx) => {
        const base = { ...it, _localId: `${Date.now()}-${idx}`, _selected: true };
        if (isTodos) {
          const hint = (it.assignee_hint || '').toLowerCase().trim();
          let assigned_to = null;
          if (hint === 'ich' || hint === 'mir' || hint === 'me') {
            assigned_to = userId;
          } else if (hint) {
            const match = todosMembers.find((m) =>
              (m.display_name || '').toLowerCase().startsWith(hint)
            );
            if (match) assigned_to = match.user_id;
          }
          return { ...base, assigned_to };
        }
        if (isExpense) {
          // Default paid_by = current user
          return { ...base, paid_by: userId };
        }
        return base;
      });
      if (items.length === 0) {
        setError('Keine Artikel erkannt. Versuche es mit einem klareren Text.');
        return;
      }
      setPreview(items);
    } catch (e) {
      console.error('[brain-dump] parse failed:', e);
      setError('Netzwerkfehler. Bitte Verbindung prüfen.');
    } finally {
      setLoading(false);
    }
  };

  const updatePreviewItem = (localId, patch) => {
    setPreview((prev) => prev.map((it) => (it._localId === localId ? { ...it, ...patch } : it)));
  };

  const removePreviewItem = (localId) => {
    setPreview((prev) => prev.filter((it) => it._localId !== localId));
  };

  const handleSaveAll = async () => {
    const toSave = preview.filter((it) => it._selected && it.name.trim());
    if (toSave.length === 0) return;
    setLoading(true);
    for (const it of toSave) {
      if (isMisc) {
        if (!addMiscItem) continue;
        await addMiscItem({
          name: it.name.trim(),
          location_tag: it.location_tag || 'Sonstiges',
          note: it.note?.trim() || null,
        }, { silent: true });
      } else if (isTodos) {
        if (!addTodoItem) continue;
        await addTodoItem({
          title: it.title.trim(),
          priority: it.priority || 'medium',
          due_date: it.due_date || null,
          assigned_to: it.assigned_to || null,
          comment: it.comment?.trim() || null,
        }, { silent: true });
      } else if (isExpense) {
        if (!addExpenseItem) continue;
        await addExpenseItem({
          description: it.description.trim(),
          amount: Number(it.amount) || 0,
          paid_by: it.paid_by || userId,
          expense_date: it.expense_date || null,
          category: it.category || null,
        }, { silent: true });
      } else {
        await addGroceryItem({
          name: it.name.trim(),
          category: it.category,
          quantity: Number(it.quantity) || 1,
          unit: it.unit || null,
          note: it.note?.trim() || null,
        }, { silent: true });
      }
    }
    // Aggregate activity log entry for the whole brain dump
    if (activity?.logActivity && toSave.length > 0 && member) {
      const noun =
        isTodos   ? `${toSave.length} Aufgabe${toSave.length === 1 ? '' : 'n'}` :
        isExpense ? `${toSave.length} Ausgabe${toSave.length === 1 ? '' : 'n'}` :
        isMisc    ? `${toSave.length} Sonstiges-Item${toSave.length === 1 ? '' : 's'}` :
                    `${toSave.length} Nahrungsmittel`;
      activity.logActivity({
        action_type: isTodos ? 'todo_create' : isExpense ? 'expense_add' : (isMisc ? 'misc_add' : 'grocery_add'),
        module: isTodos ? 'todos' : isExpense ? 'expenses' : (isMisc ? 'misc' : 'grocery'),
        item_id: null,
        description: `${member.display_name} hat per KI Brain Dump ${noun} hinzugefügt`,
      });
    }
    setLoading(false);
    setText('');
    setPreview(null);
    setExpanded(false);
  };

  const handleDiscardPreview = () => setPreview(null);

  const selectedCount = preview ? preview.filter((it) => it._selected).length : 0;

  const inner = (
    <div
      data-testid={`brain-dump-section-${mode}`}
      className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
    >
      <button
        data-testid={`brain-dump-toggle-${mode}`}
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
          {isExpense ? 'Ausgaben erfassen'
            : isTodos ? 'Aufgaben erkennen'
            : isMisc ? 'Non-Food in Artikel umwandeln'
            : 'freien Text in Artikel umwandeln'}
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
                  data-testid={`brain-dump-textarea-${mode}`}
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS + 20))}
                  placeholder={placeholder}
                  rows={4}
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[14px] leading-snug text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-60"
                  style={{ fontFamily: 'DM Sans, sans-serif', '--tw-ring-color': userColor }}
                />
                <div
                  data-testid={`brain-dump-charcount-${mode}`}
                  className={`absolute bottom-2 right-3 text-[11px] tabular-nums font-medium ${
                    overLimit ? 'text-red-500' : charsLeft < 50 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {text.length}/{MAX_CHARS}
                </div>
              </div>

              {error && (
                <div
                  data-testid={`brain-dump-error-${mode}`}
                  className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2"
                >
                  {error}
                  {retryAfter > 0 && (
                    <span className="ml-1 font-semibold">({formatCountdown(retryAfter)})</span>
                  )}
                </div>
              )}

              <button
                data-testid={`brain-dump-parse-button-${mode}`}
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
            <div data-testid={`brain-dump-preview-${mode}`} className="space-y-2">
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {preview.length} erkannt · {selectedCount} ausgewählt
                </p>
                <button
                  data-testid={`brain-dump-discard-${mode}`}
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
                    mode={mode}
                    item={it}
                    onChange={(patch) => updatePreviewItem(it._localId, patch)}
                    onRemove={() => removePreviewItem(it._localId)}
                    userColor={userColor}
                  />
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  data-testid={`brain-dump-cancel-${mode}`}
                  onClick={handleDiscardPreview}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm active:bg-slate-100 dark:active:bg-slate-800"
                >
                  Abbrechen
                </button>
                <button
                  data-testid={`brain-dump-save-${mode}`}
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

  if (floating) {
    return (
      <div className="w-72 rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {inner}
      </div>
    );
  }

  return inner;
}

function PreviewRow({ mode, item, onChange, onRemove, userColor }) {
  const isMisc = mode === 'misc';
  const isTodos = mode === 'todos';
  const isExpense = mode === 'expense';
  const cat = (!isMisc && !isTodos && !isExpense) ? CATEGORIES.find((c) => c.name === item.category) : null;
  const locMeta = isMisc ? getLocationMeta(item.location_tag || 'Sonstiges') : null;
  const todosCtx = useTodos();
  const houseMembers = todosCtx?.houseMembers || [];

  const prioEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
  const todoIcon = item.priority ? prioEmoji[item.priority] || '📝' : '📝';
  const titleFieldName = isTodos ? 'title' : (isExpense ? 'description' : 'name');

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
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">
              {isExpense ? '💶' : isTodos ? todoIcon : isMisc ? locMeta?.emoji : (cat?.emoji || '🛒')}
            </span>
            <input
              data-testid="brain-dump-preview-name"
              value={item[titleFieldName] || ''}
              onChange={(e) => onChange({ [titleFieldName]: e.target.value })}
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

          {!isMisc && !isTodos && !isExpense && (
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
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <select
                data-testid="brain-dump-preview-category"
                value={item.category}
                onChange={(e) => onChange({ category: e.target.value })}
                className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none flex-1 min-w-[120px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
          )}

          {isExpense && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="relative">
                <input
                  data-testid="brain-dump-preview-amount"
                  type="text"
                  inputMode="decimal"
                  value={item.amount ?? ''}
                  onChange={(e) => onChange({ amount: e.target.value.replace(/[^\d.]/g, '') })}
                  className="w-20 h-8 pl-2 pr-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-right tabular-nums text-slate-700 dark:text-slate-200 focus:outline-none"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
              </div>
              <select
                data-testid="brain-dump-preview-expense-category"
                value={item.category || 'Sonstiges'}
                onChange={(e) => onChange({ category: e.target.value })}
                className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {['Essen','Haushalt','Transport','Unterhaltung','Sonstiges'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                data-testid="brain-dump-preview-paidby"
                value={item.paid_by || ''}
                onChange={(e) => onChange({ paid_by: e.target.value })}
                className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {houseMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                ))}
              </select>
              {item.expense_date && (
                <span className="h-8 inline-flex items-center px-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[11px] text-blue-600 dark:text-blue-300 font-medium">
                  📅 {item.expense_date}
                </span>
              )}
            </div>
          )}

          {isTodos && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                data-testid="brain-dump-preview-priority"
                value={item.priority || 'medium'}
                onChange={(e) => onChange({ priority: e.target.value })}
                className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="high">🔴 Hoch</option>
                <option value="medium">🟡 Mittel</option>
                <option value="low">🟢 Niedrig</option>
              </select>
              <select
                data-testid="brain-dump-preview-assignee"
                value={item.assigned_to || ''}
                onChange={(e) => onChange({ assigned_to: e.target.value || null })}
                className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="">Nicht zugewiesen</option>
                {houseMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                ))}
              </select>
              {item.due_date && (
                <span
                  data-testid="brain-dump-preview-due"
                  className="h-8 inline-flex items-center px-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[11px] text-blue-600 dark:text-blue-300 font-medium"
                >
                  📅 {new Date(item.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

          {isMisc && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                data-testid="brain-dump-preview-location"
                value={item.location_tag || 'Sonstiges'}
                onChange={(e) => onChange({ location_tag: e.target.value })}
                className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {MISC_LOCATIONS.map((l) => (
                  <option key={l.id} value={l.name}>{l.emoji} {l.name}</option>
                ))}
              </select>
            </div>
          )}

          {(() => {
            const noteField = isTodos ? 'comment' : 'note';
            const value = item[noteField] || '';
            const hasValue = !!value;
            if (hasValue || item._showNote) {
              return (
                <input
                  data-testid="brain-dump-preview-note"
                  value={value}
                  onChange={(e) => onChange({ [noteField]: e.target.value })}
                  placeholder={isTodos ? 'Kommentar…' : 'Notiz…'}
                  className="w-full h-8 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none"
                />
              );
            }
            return (
              <button
                onClick={() => onChange({ _showNote: true })}
                className="text-[11px] text-slate-400 dark:text-slate-500 font-medium active:opacity-60"
              >
                + {isTodos ? 'Kommentar' : 'Notiz'}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
