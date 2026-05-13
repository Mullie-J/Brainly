import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Check,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useReviewQueue, useUpdateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';

// SM-2-lite intervals (days). Index advances on "remembered", resets to 0 on "forgot".
const INTERVALS = [1, 3, 7, 14, 30, 60, 120];

export default function Review() {
  const { data: queue = [], isLoading } = useReviewQueue();
  const { data: projects = [] } = useProjects();
  const update = useUpdateNote();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  // freeze queue at session start so it doesn't shift under us
  const session = useMemo(() => queue.slice(0, 20), [queue.length, isLoading]);

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
    setSessionDone(false);
  }, [session.length]);

  const current = session[index];
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  function nextInterval(currentInterval: number, remembered: boolean) {
    if (!remembered) return 1;
    const idx = INTERVALS.indexOf(currentInterval);
    if (idx === -1 || idx === INTERVALS.length - 1) return INTERVALS[INTERVALS.length - 1];
    return INTERVALS[idx + 1];
  }

  function judge(remembered: boolean) {
    if (!current) return;
    const newInterval = nextInterval(current.review_interval_days ?? 1, remembered);
    update.mutate({
      id: current.id,
      patch: {
        last_reviewed_at: new Date().toISOString(),
        review_interval_days: newInterval,
      },
    });
    if (index + 1 >= session.length) {
      setSessionDone(true);
    } else {
      setIndex(index + 1);
      setRevealed(false);
    }
  }

  function disableReview() {
    if (!current) return;
    update.mutate({
      id: current.id,
      patch: { review_enabled: false },
    });
    if (index + 1 >= session.length) {
      setSessionDone(true);
    } else {
      setIndex(index + 1);
      setRevealed(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-12 text-sm text-muted">
        Bezig met laden...
      </div>
    );
  }

  if (session.length === 0) {
    return (
      <EmptyState
        title="Niets te reviewen vandaag"
        subtitle="Notities met een ingevulde TL;DR komen hier automatisch terug op een uitdijend interval (1d → 3d → 7d → 14d → ...). Schrijf TL;DR's om je second brain als kennisapparaat te gebruiken."
      />
    );
  }

  if (sessionDone) {
    return (
      <EmptyState
        title="Sessie klaar 🎯"
        subtitle={`Je hebt ${session.length} ${session.length === 1 ? 'notitie' : 'notities'} doorlopen. Kom morgen terug.`}
      />
    );
  }

  if (!current) return null;

  const project = current.project_id ? projectMap.get(current.project_id) : null;
  const noteHref = current.project_id
    ? `/p/${current.project_id}/n/${current.id}`
    : `/n/${current.id}`;

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Brain size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
            <p className="text-xs text-muted">
              {index + 1} van {session.length} · spaced retrieval
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="tabular-nums">
            Volgend interval: {nextInterval(current.review_interval_days ?? 1, true)} dagen
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-surface2 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${((index + 1) / session.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div className="bg-surface border border-border rounded-xl p-6 md:p-8 mb-5">
        <div className="text-[11px] uppercase tracking-wider text-muted font-medium mb-2">
          {project ? project.title : 'Losse notitie'}
        </div>
        <h2 className="text-xl font-semibold tracking-tight mb-4">
          {current.title || 'Untitled'}
        </h2>

        <p className="text-xs text-muted italic mb-3">
          Probeer eerst zelf op te roepen wat je weet. Klik dan om de TL;DR te zien.
        </p>

        {revealed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-accent font-medium">
              <Sparkles size={12} /> TL;DR
            </div>
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {current.tldr}
            </p>
            <Link
              to={noteHref}
              className="text-xs text-muted hover:text-accent inline-flex items-center gap-1"
            >
              Open volledige notitie <ArrowRight size={11} />
            </Link>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-12 rounded-lg border border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors text-muted hover:text-text flex flex-col items-center gap-2"
          >
            <Eye size={20} />
            <span className="text-sm">Toon TL;DR</span>
          </button>
        )}
      </div>

      {/* Judgment buttons */}
      {revealed && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => judge(false)}
            className="flex-1 py-3 rounded-md border border-border bg-surface hover:border-red-500/40 hover:bg-red-500/5 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <X size={15} className="text-red-500" />
            Moeilijk · zie ik morgen weer
          </button>
          <button
            onClick={() => judge(true)}
            className="flex-1 py-3 rounded-md bg-accent text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Check size={15} />
            Goed onthouden
          </button>
        </div>
      )}

      {/* Skip / disable */}
      {revealed && (
        <div className="flex justify-center mt-4">
          <button
            onClick={disableReview}
            className="text-[11px] text-muted hover:text-text inline-flex items-center gap-1"
          >
            <EyeOff size={11} /> Niet meer reviewen
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Brain size={18} className="text-accent" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
      </div>
      <div className="border border-dashed border-border rounded-lg p-10 text-center">
        <RotateCcw size={20} className="mx-auto text-muted mb-3" />
        <p className="font-medium mb-1">{title}</p>
        <p className="text-sm text-muted max-w-md mx-auto">{subtitle}</p>
      </div>
    </div>
  );
}
