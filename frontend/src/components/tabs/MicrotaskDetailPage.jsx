import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectsContext';
import InlineTitleEditor from '../projects/InlineTitleEditor';
import InlineTextareaEditor from '../projects/InlineTextareaEditor';

export default function MicrotaskDetailPage() {
  const { id: projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { projects, clusters, microtasks, loading, updateMicrotask } = useProjects();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingNote, setEditingNote] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const task = microtasks.find((m) => m.id === taskId);
  const cluster = task ? clusters.find((c) => c.id === task.cluster_id) : null;

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
              Erledigt am {new Date(task.completed_at).toLocaleDateString('de-DE', {
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
      </div>
    </div>
  );
}
