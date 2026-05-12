import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, ChevronDown, ChevronRight, Pencil, Check, Sparkles } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectsContext';
import InlineTitleEditor from '../projects/InlineTitleEditor';
import InlineTextareaEditor from '../projects/InlineTextareaEditor';
import EffortWeightStepper from '../projects/EffortWeightStepper';
import DependencyToggleList from '../projects/DependencyToggleList';
import NoteBrainDumpSheet from '../projects/NoteBrainDumpSheet';

const SUGGESTED_FOR_OPTIONS = [
  { value: 'tim', label: 'Tim', color: '#EC4899' },
  { value: 'iris', label: 'Iris', color: '#2563EB' },
  { value: 'both', label: 'Beide', color: '#94A3B8' },
];

export default function MicrotaskDetailPage() {
  const { id: projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { projects, clusters, microtasks, loading, updateMicrotask, addMicrotask, memberNameMap } = useProjects();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [moreDetailsExpanded, setMoreDetailsExpanded] = useState(false);
  const [editingDependencies, setEditingDependencies] = useState(false);
  const [noteBrainOpen, setNoteBrainOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const task = microtasks.find((m) => m.id === taskId);
  const cluster = task ? clusters.find((c) => c.id === task.cluster_id) : null;
  const dependencyTasks = task && Array.isArray(task.depends_on)
    ? task.depends_on
        .map((extId) =>
          microtasks.find((m) => m.external_id === extId && !m.archived && !m.removed_at)
        )
        .filter(Boolean)
    : [];
  const selectableTasks = task
    ? microtasks
        .filter(
          (m) =>
            m.cluster_id === task.cluster_id &&
            m.id !== task.id &&
            !m.archived &&
            !m.removed_at &&
            m.external_id
        )
        .sort((a, b) => (a.task_order || 0) - (b.task_order || 0))
    : [];

  async function handleSaveTitle(newTitle) {
    await updateMicrotask(task.id, { title: newTitle });
    setEditingTitle(false);
  }

  async function handleSaveDescription(newValue) {
    await updateMicrotask(task.id, { description: newValue });
    setEditingDescription(false);
  }

  async function handleSaveNote(newValue) {
    await updateMicrotask(task.id, { note: newValue });
    setEditingNote(false);
  }

  async function handleNoteSubmit({ note_markdown, appendChoice }) {
    if (!task) return;
    const newNote = appendChoice === 'append' && task.note
      ? `${task.note}\n\n---\n\n${note_markdown}`
      : note_markdown;
    await updateMicrotask(task.id, { note: newNote });
  }

  async function handleFollowUpsConfirmed(acceptedFollowUps) {
    if (!task || !cluster) return;
    const existingInCluster = microtasks.filter(
      (m) => m.cluster_id === task.cluster_id && !m.archived && !m.removed_at
    );
    const maxOrder = existingInCluster.reduce((max, m) => Math.max(max, m.task_order || 0), 0);
    let nextOrder = maxOrder + 1;
    for (const fu of acceptedFollowUps) {
      await addMicrotask(task.cluster_id, {
        title: fu.title,
        description: fu.description || '',
        effort_weight: 2,
        task_order: nextOrder,
      });
      nextOrder += 1;
    }
  }

  async function handleEffortChange(newValue) {
    if (!task) return;
    await updateMicrotask(task.id, { effort_weight: newValue });
  }

  async function handleSuggestedForChange(value) {
    if (!task) return;
    await updateMicrotask(task.id, { suggested_for: value });
  }

  async function handleToggleDependency(targetExternalId) {
    if (!task) return;
    const current = Array.isArray(task.depends_on) ? task.depends_on : [];
    const next = current.includes(targetExternalId)
      ? current.filter((id) => id !== targetExternalId)
      : [...current, targetExternalId];
    await updateMicrotask(task.id, { depends_on: next });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Lade…</p>
      </div>
    );
  }

  if (!project || !task) {
    return (
      <div
        data-testid="microtask-detail-not-found"
        className="pb-4"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        <div className="sticky top-0 z-10 -mx-4 px-4 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => navigate(projectId ? `/projects/${projectId}` : '/projects')}
            className="p-2 -ml-2 rounded-lg active:opacity-70"
            aria-label="Zurück"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <h1
            className="text-xl font-bold text-slate-900 dark:text-slate-50 flex-1"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Aufgabe nicht gefunden
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Diese Aufgabe existiert nicht oder wurde gelöscht.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="microtask-detail-page"
      className="pb-4"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="p-2 -ml-2 rounded-lg active:opacity-70"
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h1
          className="text-base font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {cluster?.name || project.name}
        </h1>
      </div>

      <div className="px-4 pt-5 space-y-5">
        <div>
          {editingTitle ? (
            <InlineTitleEditor
              initialValue={task.title}
              onSave={handleSaveTitle}
              onCancel={() => setEditingTitle(false)}
              ariaLabel="Titel"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="w-full text-left active:opacity-70"
              aria-label="Titel bearbeiten"
            >
              <h2
                className={`text-xl font-bold ${
                  task.completed
                    ? 'text-slate-400 dark:text-slate-500 line-through'
                    : 'text-slate-900 dark:text-slate-50'
                }`}
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {task.title}
              </h2>
            </button>
          )}
          {task.completed && task.completed_at && !editingTitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Erledigt{task.completed_by && memberNameMap?.[task.completed_by] ? ` von ${memberNameMap[task.completed_by]}` : ''} am {new Date(task.completed_at).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Beschreibung
          </h3>
          {editingDescription ? (
            <InlineTextareaEditor
              initialValue={task.description}
              onSave={handleSaveDescription}
              onCancel={() => setEditingDescription(false)}
              ariaLabel="Beschreibung"
              placeholder="Beschreibung eingeben…"
            />
          ) : task.description ? (
            <button
              type="button"
              onClick={() => setEditingDescription(true)}
              className="w-full text-left active:opacity-70"
              aria-label="Beschreibung bearbeiten"
            >
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {task.description}
              </p>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDescription(true)}
              className="text-sm text-rose-600 dark:text-rose-400 active:opacity-70 flex items-center gap-1.5"
              aria-label="Beschreibung hinzufügen"
            >
              <Plus className="w-4 h-4" />
              Beschreibung hinzufügen
            </button>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Notiz
          </h3>
          {editingNote ? (
            <InlineTextareaEditor
              initialValue={task.note}
              onSave={handleSaveNote}
              onCancel={() => setEditingNote(false)}
              ariaLabel="Notiz"
              placeholder="Notiz eingeben…"
            />
          ) : task.note ? (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              className="w-full text-left active:opacity-70"
              aria-label="Notiz bearbeiten"
            >
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {task.note}
              </p>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              className="text-sm text-rose-600 dark:text-rose-400 active:opacity-70 flex items-center gap-1.5"
              aria-label="Notiz hinzufügen"
            >
              <Plus className="w-4 h-4" />
              Notiz hinzufügen
            </button>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setNoteBrainOpen(true)}
            className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 active:opacity-70"
            aria-label="Brain Dump für Notiz öffnen"
          >
            <Sparkles className="w-4 h-4" />
            Brain Dump
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMoreDetailsExpanded((v) => !v)}
            className="w-full flex items-center justify-between text-left active:opacity-70 py-2"
            aria-expanded={moreDetailsExpanded}
          >
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Mehr Details
            </h3>
            {moreDetailsExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </button>
          {moreDetailsExpanded && (
            <div className="mt-2 space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Aufwand</p>
                <EffortWeightStepper
                  value={task.effort_weight || 2}
                  onChange={handleEffortChange}
                  ariaLabelMinus="Aufwand verringern"
                  ariaLabelPlus="Aufwand erhöhen"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Vorgeschlagen für</p>
                <div className="flex gap-2 flex-wrap">
                  {SUGGESTED_FOR_OPTIONS.map((opt) => {
                    const selected = task.suggested_for === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSuggestedForChange(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium active:opacity-70 flex items-center gap-1.5 ${
                          selected
                            ? 'text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                        style={selected ? { backgroundColor: opt.color } : undefined}
                        aria-pressed={selected}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: selected ? 'rgba(255,255,255,0.6)' : opt.color }}
                          aria-hidden="true"
                        />
                        {opt.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleSuggestedForChange(null)}
                    disabled={!task.suggested_for}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:opacity-70 disabled:opacity-30"
                    aria-label="Vorschlag zurücksetzen"
                  >
                    Niemand
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Abhängig von</p>
                  <button
                    type="button"
                    onClick={() => setEditingDependencies((v) => !v)}
                    className="text-xs text-rose-600 dark:text-rose-400 active:opacity-70 flex items-center gap-1"
                    aria-label={editingDependencies ? 'Bearbeitung beenden' : 'Abhängigkeiten bearbeiten'}
                  >
                    {editingDependencies ? (
                      <>
                        <Check className="w-3 h-3" />
                        Fertig
                      </>
                    ) : (
                      <>
                        <Pencil className="w-3 h-3" />
                        Bearbeiten
                      </>
                    )}
                  </button>
                </div>
                {editingDependencies ? (
                  <DependencyToggleList
                    selectableTasks={selectableTasks}
                    selectedExternalIds={task.depends_on || []}
                    onToggle={handleToggleDependency}
                  />
                ) : dependencyTasks.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                    Keine Abhängigkeiten
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dependencyTasks.map((dep) => (
                      <span
                        key={dep.id}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          dep.completed
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {dep.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <NoteBrainDumpSheet
        open={noteBrainOpen}
        onClose={() => setNoteBrainOpen(false)}
        existingNote={task?.note || null}
        onNoteSubmit={handleNoteSubmit}
        onFollowUpsConfirmed={handleFollowUpsConfirmed}
      />
    </div>
  );
}
