import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmDialog from '../projects/ConfirmDialog';
import BrainDumpStep from '../projects/BrainDumpStep';
import ClarificationStep from '../projects/ClarificationStep';
import StructuringStep from '../projects/StructuringStep';
import DraftReviewStep from '../projects/DraftReviewStep';

const PHASE_NUMBERS = {
  brain_dump: 1,
  clarifying: 2,
  structuring: 3,
  draft_review: 4,
};

export default function PlanNewProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState('brain_dump');
  const [brainDump, setBrainDump] = useState('');
  const [rounds, setRounds] = useState([]);
  const [draft, setDraft] = useState(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phaseNumber = PHASE_NUMBERS[phase] || 1;

  function handleBack() {
    if (phase === 'brain_dump' && !brainDump.trim()) {
      navigate('/projects/plan-mode-hub');
    } else {
      setCancelConfirmOpen(true);
    }
  }

  async function handleBrainDumpSubmit() {
    if (!brainDump.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/brain-dump/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          text: JSON.stringify({ brain_dump: brainDump, previous_rounds: [] }),
          mode: 'project_plan_clarify',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'KI-Antwort konnte nicht verarbeitet werden.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLoading(false);
      if (data.needs_clarification && data.questions?.length > 0) {
        setRounds([{ questions: data.questions, answers: data.questions.map(() => '') }]);
        setPhase('clarifying');
      } else {
        setPhase('structuring');
      }
    } catch (e) {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
      setLoading(false);
    }
  }

  function handleAnswerChange(roundIndex, questionIndex, value) {
    setRounds((prev) => {
      const next = [...prev];
      if (!next[roundIndex]) return prev;
      const newAnswers = [...next[roundIndex].answers];
      newAnswers[questionIndex] = value;
      next[roundIndex] = { ...next[roundIndex], answers: newAnswers };
      return next;
    });
  }

  async function handleClarificationSubmit() {
    if (loading) return;
    // Hard-Limit: nach 2 Runden zwingend zur Strukturierung
    if (rounds.length >= 2) {
      setPhase('structuring');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/brain-dump/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          text: JSON.stringify({ brain_dump: brainDump, previous_rounds: rounds }),
          mode: 'project_plan_clarify',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'KI-Antwort konnte nicht verarbeitet werden.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLoading(false);
      if (data.needs_clarification && data.questions?.length > 0) {
        setRounds((prev) => [...prev, { questions: data.questions, answers: data.questions.map(() => '') }]);
      } else {
        setPhase('structuring');
      }
    } catch (e) {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
      setLoading(false);
    }
  }

  async function runStructure() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/brain-dump/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          text: JSON.stringify({ brain_dump: brainDump, rounds }),
          mode: 'project_plan_structure',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'Strukturierung fehlgeschlagen.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLoading(false);
      if (!data.name || !Array.isArray(data.clusters) || data.clusters.length === 0) {
        setError('Die KI konnte kein Projekt erzeugen. Bitte ändere deinen Brain Dump und versuche es erneut.');
        return;
      }
      setDraft({
        name: data.name,
        summary: data.summary || '',
        clusters: data.clusters,
      });
      setPhase('draft_review');
    } catch (e) {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
      setLoading(false);
    }
  }

  useEffect(() => {
    if (phase === 'structuring' && !draft && !loading && !error) {
      runStructure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, draft, loading, error]);

  function handleRemoveTask(clusterId, taskId) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clusters: prev.clusters.map((c) =>
          c.id === clusterId
            ? { ...c, microtasks: c.microtasks.filter((t) => t.id !== taskId) }
            : c
        ),
      };
    });
  }

  function handleRemoveCluster(clusterId) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clusters: prev.clusters.filter((c) => c.id !== clusterId),
      };
    });
  }

  function handleAccept() {
    // Stub für Commit 7 — Commit 8 macht echten Insert + Navigate
    console.log('Akzeptieren-Stub: würde Draft jetzt in DB schreiben', draft);
    alert('Akzeptieren ist in Commit 8 echt — siehe Console für aktuellen Draft.');
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
          <BrainDumpStep
            value={brainDump}
            onChange={setBrainDump}
            onSubmit={handleBrainDumpSubmit}
            loading={loading}
            error={error}
          />
        )}
        {phase === 'clarifying' && (
          <ClarificationStep
            rounds={rounds}
            onAnswerChange={handleAnswerChange}
            onSubmit={handleClarificationSubmit}
            loading={loading}
            error={error}
            isLastRound={rounds.length >= 2}
          />
        )}
        {phase === 'structuring' && (
          <StructuringStep
            loading={loading}
            error={error}
            onRetry={() => { setError(''); runStructure(); }}
          />
        )}
        {phase === 'draft_review' && (
          <DraftReviewStep
            draft={draft}
            onRemoveTask={handleRemoveTask}
            onRemoveCluster={handleRemoveCluster}
            onAccept={handleAccept}
            accepting={false}
          />
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
