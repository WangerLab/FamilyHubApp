import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { filterStaleSuggestions } from '../../lib/reviewSuggestions';
import { buildReviewContext } from '../../lib/reviewContext';
import ProjectPickerStep from '../projects/ProjectPickerStep';
import ContextDumpStep from '../projects/ContextDumpStep';

const PHASE_TITLES = {
  project_picker: 'Projekt wählen',
  context_dump: 'Kontext eingeben',
  suggestions_review: 'Vorschläge prüfen',
};

const PHASE_NUMBERS = {
  project_picker: 1,
  context_dump: 2,
  suggestions_review: 3,
};

export default function ReviewProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clusters, microtasks } = useProjects();

  const [phase, setPhase] = useState('project_picker');
  const [selectedProject, setSelectedProject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [staleCount, setStaleCount] = useState(0);

  const handlePick = (project) => {
    setSelectedProject(project);
    setErrorMessage('');
    setPhase('context_dump');
  };

  const handleSubmit = async (contextText) => {
    if (!selectedProject || !user) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const compositeText = buildReviewContext(selectedProject, clusters, microtasks, contextText);
      const res = await fetch('/api/brain-dump/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          mode: 'project_review',
          text: compositeText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || 'Vorschläge konnten nicht geholt werden.');
      }
      const raw = Array.isArray(data?.suggestions) ? data.suggestions : [];
      const { valid, stale } = filterStaleSuggestions(raw, clusters, microtasks, selectedProject.id);
      setSuggestions(valid);
      setStaleCount(stale.length);
      setPhase('suggestions_review');
    } catch (e) {
      setErrorMessage(e?.message || 'Unbekannter Fehler.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (phase === 'project_picker') {
      navigate('/projects/plan-mode-hub');
      return;
    }
    if (phase === 'context_dump') {
      setSelectedProject(null);
      setErrorMessage('');
      setPhase('project_picker');
      return;
    }
    if (phase === 'suggestions_review') {
      setSuggestions([]);
      setStaleCount(0);
      setPhase('context_dump');
      return;
    }
  };

  return (
    <div
      data-testid="review-project-page"
      className="pb-4"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-lg active:opacity-70"
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="text-base font-semibold text-slate-900 dark:text-slate-50 truncate"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Review {selectedProject ? `· ${selectedProject.name}` : ''}
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Schritt {PHASE_NUMBERS[phase]} / 3 · {PHASE_TITLES[phase]}
          </p>
        </div>
      </div>

      {phase === 'project_picker' && (
        <ProjectPickerStep onPick={handlePick} />
      )}

      {phase === 'context_dump' && selectedProject && (
        <ContextDumpStep
          project={selectedProject}
          clusters={clusters}
          microtasks={microtasks}
          onSubmit={handleSubmit}
          submitting={submitting}
          errorMessage={errorMessage}
        />
      )}

      {phase === 'suggestions_review' && (
        <div className="px-4 pt-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {suggestions.length} Vorschläge erhalten
            {staleCount > 0 ? ` (${staleCount} verworfen)` : ''}.
            UI dafür kommt in Commit 8b — vorerst Roh-JSON:
          </p>
          <pre
            data-testid="review-raw-json"
            className="text-[10px] bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-96"
          >
            {JSON.stringify(suggestions, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
