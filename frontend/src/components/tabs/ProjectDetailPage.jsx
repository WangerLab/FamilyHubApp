import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectsContext';
import { computeProjectProgress } from '../../lib/projectProgress';
import ClusterCard from '../projects/ClusterCard';
import AddClusterForm from '../projects/AddClusterForm';
import UndoSnackbar from '../projects/UndoSnackbar';
import ConfirmDialog from '../projects/ConfirmDialog';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, clusters, microtasks, loading, pendingMicrotaskDelete, undoMicrotaskDelete, softDeleteProject } = useProjects();

  const project = projects.find((p) => p.id === id);
  const projectClusters = clusters
    .filter((c) => c.project_id === id && !c.archived && !c.removed_at)
    .sort((a, b) => (a.cluster_order || 0) - (b.cluster_order || 0));
  const projectMicrotaskCount = microtasks.filter(
    (m) => projectClusters.some((c) => c.id === m.cluster_id) && !m.archived && !m.removed_at
  ).length;
  const [addingCluster, setAddingCluster] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function handleConfirmDelete() {
    try {
      await softDeleteProject(project.id);
      setConfirmDeleteOpen(false);
      navigate('/projects');
    } catch (e) {
      // Realtime brings DB state on next tick — silent for now
      setConfirmDeleteOpen(false);
    }
  }
  const { percent, hasNoTasks } = project
    ? computeProjectProgress(project.id, clusters, microtasks)
    : { percent: 0, hasNoTasks: true };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Lade…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div
        data-testid="project-detail-not-found"
        className="pb-4"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        <div className="sticky top-0 z-10 -mx-4 px-4 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 -ml-2 rounded-lg active:opacity-70"
            aria-label="Zurück"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <h1
            className="text-xl font-bold text-slate-900 dark:text-slate-50 flex-1"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Projekt nicht gefunden
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Dieses Projekt existiert nicht oder wurde gelöscht.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="project-detail-page"
      className="pb-4"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 -ml-2 rounded-lg active:opacity-70"
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h1
          className="text-xl font-bold text-slate-900 dark:text-slate-50 flex-1 truncate"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {project.name}
        </h1>
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          className="p-2 -mr-2 rounded-lg active:opacity-70"
          aria-label="Projekt löschen"
        >
          <Trash2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      <div className="px-4 pt-4">
        {project.summary && (
          <p className="text-sm text-slate-600 dark:text-slate-400">{project.summary}</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm text-slate-700 dark:text-slate-300 w-12 text-right font-medium">
            {hasNoTasks ? '—' : `${percent}%`}
          </span>
        </div>
      </div>

      {projectClusters.length === 0 && (
        <div className="px-4 mt-6">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Dieses Projekt hat noch keine Cluster.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              Lege unten einen ersten Cluster an, um Aufgaben zu strukturieren.
            </p>
          </div>
        </div>
      )}

      <div className="px-4 mt-6 space-y-3">
        {projectClusters.map((c) => (
          <ClusterCard key={c.id} cluster={c} microtasks={microtasks} projectId={id} />
        ))}
      </div>

      <div className="px-4 mt-3">
        {addingCluster ? (
          <AddClusterForm
            projectId={project.id}
            existingClusterCount={projectClusters.length}
            onCancel={() => setAddingCluster(false)}
            onSaved={() => setAddingCluster(false)}
          />
        ) : (
          <button
            onClick={() => setAddingCluster(true)}
            data-testid="add-cluster-trigger"
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 active:opacity-70 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Cluster hinzufügen
          </button>
        )}
      </div>

      {pendingMicrotaskDelete && (
        <UndoSnackbar name={pendingMicrotaskDelete.task.title} onUndo={undoMicrotaskDelete} />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
        title="Projekt löschen?"
        message={
          projectClusters.length === 0
            ? 'Dieses Projekt enthält keine Cluster. Trotzdem löschen?'
            : `${projectClusters.length} ${projectClusters.length === 1 ? 'Cluster' : 'Cluster'} mit ${projectMicrotaskCount} ${projectMicrotaskCount === 1 ? 'Aufgabe' : 'Aufgaben'} werden mitgelöscht.`
        }
      />
    </div>
  );
}
