import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Flame, ChevronDown, User, Calendar as CalIcon } from 'lucide-react';
import { useTodos } from '../../contexts/TodosContext';
import { useAuth } from '../../contexts/AuthContext';
import { parseSmartDateDE, toDatetimeLocal } from '../../utils/smartDate';

const PRIORITY_OPTIONS = [
  { id: 'high',   label: 'Hoch',    color: '#EF4444', emoji: '🔴' },
  { id: 'medium', label: 'Mittel',  color: '#F59E0B', emoji: '🟡' },
  { id: 'low',    label: 'Niedrig', color: '#22C55E', emoji: '🟢' },
];

export default function AddTodoInput() {
  const { addTodo, houseMembers } = useTodos();
  const { user } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState(''); // '' = unassigned
  const [dueLocal, setDueLocal] = useState(''); // datetime-local value
  const [smartDateHint, setSmartDateHint] = useState(null);
  const [busy, setBusy] = useState(false);

  // Smart date detection (live preview only — not auto-applied unless user clicks hint)
  useEffect(() => {
    const parsed = parseSmartDateDE(title);
    setSmartDateHint(parsed ? { ...parsed, iso: parsed.date.toISOString() } : null);
  }, [title]);

  const reset = () => {
    setTitle('');
    setPriority('medium');
    setAssignee('');
    setDueLocal('');
    setSmartDateHint(null);
  };

  const submit = async () => {
    const cleanTitle = (smartDateHint ? smartDateHint.cleaned : title).trim();
    if (!cleanTitle || busy) return;
    setBusy(true);
    let dueIso = null;
    if (dueLocal) {
      dueIso = new Date(dueLocal).toISOString();
    } else if (smartDateHint) {
      dueIso = smartDateHint.iso;
    }
    await addTodo({
      title: cleanTitle,
      priority,
      due_date: dueIso,
      assigned_to: assignee || null,
    });
    reset();
    setBusy(false);
    setExpanded(false);
  };

  const applySmartDate = () => {
    if (smartDateHint) {
      setDueLocal(toDatetimeLocal(smartDateHint.date));
      setTitle(smartDateHint.cleaned);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  // Quick-add collapsed view
  if (!expanded) {
    return (
      <div className="px-1">
        <button
          data-testid="add-todo-expand"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-2 h-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-3 active:opacity-70 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Neue Aufgabe
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-1 pb-1">
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2 shadow-sm">
        <input
          data-testid="add-todo-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Was ist zu tun? z.B. Müll rausbringen morgen"
          className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none text-[15px]"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        />

        {/* Smart date hint */}
        {smartDateHint && !dueLocal && (
          <button
            data-testid="smart-date-hint"
            onClick={applySmartDate}
            className="w-full flex items-center gap-2 h-9 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium active:opacity-70"
          >
            <CalIcon className="w-3.5 h-3.5" />
            <span>
              Automatisch erkannt: {smartDateHint.date.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="ml-auto text-[10px] opacity-70">tippen zum Übernehmen</span>
          </button>
        )}

        {/* Priority chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.id}
              data-testid={`priority-${p.id}`}
              onClick={() => setPriority(p.id)}
              className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                priority === p.id ? 'ring-2' : 'opacity-60'
              }`}
              style={{
                backgroundColor: `${p.color}18`,
                color: p.color,
                '--tw-ring-color': p.color,
              }}
            >
              <span>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Assignee + due date */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            data-testid="add-todo-assignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="h-9 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">Nicht zugewiesen</option>
            {houseMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name}{m.user_id === user?.id ? ' (ich)' : ''}
              </option>
            ))}
          </select>

          <input
            data-testid="add-todo-due"
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
            className="flex-1 min-w-[170px] h-9 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            data-testid="add-todo-cancel"
            onClick={() => { reset(); setExpanded(false); }}
            className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium active:bg-slate-50 dark:active:bg-slate-800"
          >
            Abbrechen
          </button>
          <button
            data-testid="add-todo-submit"
            onClick={submit}
            disabled={!title.trim() || busy}
            className="flex-[1.5] h-10 rounded-lg bg-blue-500 text-white text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-40"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}
