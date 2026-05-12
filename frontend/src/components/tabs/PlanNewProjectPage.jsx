import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ConfirmDialog from '../projects/ConfirmDialog';

const PHASE_NUMBERS = {
  brain_dump: 1,
  clarifying: 2,
  structuring: 3,
  draft_review: 4,
};

const MOCK_DRAFT = {
  name: 'Mock Projekt',
  summary: 'Wird in Commit 6 echt befüllt.',
  clusters: [
    {
      id: 'c-1',
      name: 'Beispiel-Cluster',
      description: 'Mock-Daten',
      microtasks: [
        { id: 'mt-1', title: 'Mock-Task', description: '', effort_weight: 2, depends_on: [], suggested_for: null },
      ],
    },
  ],
};

export default function PlanNewProjectPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('brain_dump');
  const [brainDump, setBrainDump] = useState('');
  const [rounds, setRounds] = useState([]);
  const [draft, setDraft] = useState(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const phaseNumber = PHASE_NUMBERS[phase] || 1;

  function handleBack() {
    if (phase === 'brain_dump' && !brainDump.trim()) {
      navigate('/projects/plan-mode-hub');
    } else {
      setCancelConfirmOpen(true);
    }
  }

  return (
    <div
      data-testid="plan-new-project-page"
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
        <h1
          className="text-xl font-bold text-slate-900 dark:text-slate-50 flex-1 truncate"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Neues Projekt planen
        </h1>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Schritt {phaseNumber}/4
        </span>
      </div>

      <div className="px-4 pt-4">
        {phase === 'brain_dump' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 italic">Brain Dump UI kommt in Commit 4.</p>
            <button
              type="button"
              onClick={() => { setRounds([]); setPhase('clarifying'); }}
              className="w-full rounded-xl bg-rose-500 text-white py-3 text-sm font-semibold active:opacity-70"
            >
              Weiter (Mock)
            </button>
          </div>
        )}
        {phase === 'clarifying' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 italic">Klarifikation UI kommt in Commit 5.</p>
            <button
              type="button"
              onClick={() => setPhase('structuring')}
              className="w-full rounded-xl bg-rose-500 text-white py-3 text-sm font-semibold active:opacity-70"
            >
              Weiter (Mock)
            </button>
          </div>
        )}
        {phase === 'structuring' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 italic">Strukturierung UI kommt in Commit 6.</p>
            <button
              type="button"
              onClick={() => { setDraft(MOCK_DRAFT); setPhase('draft_review'); }}
              className="w-full rounded-xl bg-rose-500 text-white py-3 text-sm font-semibold active:opacity-70"
            >
              Weiter (Mock)
            </button>
          </div>
        )}
        {phase === 'draft_review' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 italic">Draft Review UI kommt in Commit 7.</p>
            {draft && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Mock-Draft: {draft.name} ({draft.clusters.length} Cluster)
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onConfirm={() => navigate('/projects/plan-mode-hub')}
        onCancel={() => setCancelConfirmOpen(false)}
        title="Planung verwerfen?"
        message="Deine Eingaben gehen verloren."
        confirmLabel="Verwerfen"
        cancelLabel="Weiter planen"
      />
    </div>
  );
}
