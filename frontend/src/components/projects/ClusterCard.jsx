import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { computeClusterProgress } from '../../lib/projectProgress';
import { useProjects } from '../../contexts/ProjectsContext';
import MicrotaskRow from './MicrotaskRow';
import AddMicrotaskForm from './AddMicrotaskForm';

export default function ClusterCard({ cluster, microtasks, projectId }) {
  const [expanded, setExpanded] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const { toggleMicrotaskComplete } = useProjects();
  const { percent, hasNoTasks } = computeClusterProgress(cluster.id, microtasks);

  const clusterTasks = microtasks
    .filter((m) => m.cluster_id === cluster.id && !m.archived && !m.removed_at)
    .sort((a, b) => (a.task_order || 0) - (b.task_order || 0));

  async function handleToggle(task) {
    try {
      await toggleMicrotaskComplete(task.id, task.completed);
    } catch (e) {
      // Realtime brings DB state on next tick — silent for now
    }
  }

  return (
    <div
      data-testid={`cluster-card-${cluster.id}`}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 active:opacity-80"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
        )}
        <div className="flex-1 text-left min-w-0">
          <h3
            className="text-base font-semibold text-slate-900 dark:text-slate-50 truncate"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {cluster.name}
          </h3>
          {cluster.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
              {cluster.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 w-10 text-right">
              {hasNoTasks ? '—' : `${percent}%`}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-slate-200 dark:border-slate-800 pt-2">
          {clusterTasks.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
              Noch keine Aufgaben in diesem Cluster
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {clusterTasks.map((t) => (
                <MicrotaskRow key={t.id} task={t} onToggle={handleToggle} allMicrotasks={microtasks} projectId={projectId} />
              ))}
            </div>
          )}
          {addingTask ? (
            <AddMicrotaskForm
              clusterId={cluster.id}
              existingTaskCount={clusterTasks.length}
              onCancel={() => setAddingTask(false)}
              onSaved={() => setAddingTask(false)}
            />
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              data-testid={`add-microtask-trigger-${cluster.id}`}
              className="w-full mt-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 active:opacity-70 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Aufgabe hinzufügen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
