import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { addDays, addWeeks, format, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { nl } from 'date-fns/locale';
import { clsx } from 'clsx';
import {
  currentWeekStart,
  useWeeklyReview,
  useUpsertWeeklyReview,
} from '@/hooks/useWeeklyReview';
import { useTodos } from '@/hooks/useTodos';

type Step = 'reflect' | 'carry' | 'plan' | 'done';

const STEPS: { id: Step; label: string }[] = [
  { id: 'reflect', label: 'Reflectie' },
  { id: 'carry', label: 'Wat verschuift' },
  { id: 'plan', label: 'Top 3 per dag' },
  { id: 'done', label: 'Klaar' },
];

const WEEKDAYS = [
  { id: 'mon', label: 'Maandag' },
  { id: 'tue', label: 'Dinsdag' },
  { id: 'wed', label: 'Woensdag' },
  { id: 'thu', label: 'Donderdag' },
  { id: 'fri', label: 'Vrijdag' },
];

export default function WeeklyReviewPage() {
  const [weekStart, setWeekStart] = useState<string>(currentWeekStart());
  const { data: review, isLoading } = useWeeklyReview(weekStart);
  const upsert = useUpsertWeeklyReview();
  const { data: openTodos = [] } = useTodos({ status: 'todo' });

  const [step, setStep] = useState<Step>('reflect');
  const [wentWell, setWentWell] = useState('');
  const [timeWasters, setTimeWasters] = useState('');
  const [carryOver, setCarryOver] = useState('');
  const [top3, setTop3] = useState<Record<string, string[]>>({});

  // Sync state when review loads
  useEffect(() => {
    setWentWell(review?.went_well ?? '');
    setTimeWasters(review?.time_wasters ?? '');
    setCarryOver(review?.carry_over ?? '');
    setTop3(review?.next_week_top3 ?? {});
    setStep(review?.completed_at ? 'done' : 'reflect');
  }, [review?.id, weekStart]);

  const weekStartDate = parseISO(weekStart);
  const weekLabel = `${format(weekStartDate, 'd MMM', { locale: nl })} – ${format(
    addDays(weekStartDate, 6),
    'd MMM yyyy',
    { locale: nl }
  )}`;

  // Open todos with a due date in the upcoming week (helpful for planning)
  const upcomingTodos = useMemo(() => {
    const nextWeekStart = format(addWeeks(weekStartDate, 1), 'yyyy-MM-dd');
    const nextWeekEnd = format(addDays(addWeeks(weekStartDate, 1), 6), 'yyyy-MM-dd');
    return openTodos
      .filter((t) => t.due_date && t.due_date >= nextWeekStart && t.due_date <= nextWeekEnd)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
  }, [openTodos, weekStartDate]);

  async function saveDraft() {
    await upsert.mutateAsync({
      week_start: weekStart,
      went_well: wentWell || null,
      time_wasters: timeWasters || null,
      carry_over: carryOver || null,
      next_week_top3: top3,
    });
  }

  async function complete() {
    await upsert.mutateAsync({
      week_start: weekStart,
      went_well: wentWell || null,
      time_wasters: timeWasters || null,
      carry_over: carryOver || null,
      next_week_top3: top3,
      completed_at: new Date().toISOString(),
    });
    setStep('done');
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div className="page-header-meta">
          <div className="page-eyebrow">
            <ClipboardList size={11} /> Weekly review
          </div>
          <h1 className="page-title">Weekly review</h1>
          <p className="page-sub">
            Week van {weekLabel}
            {review?.completed_at && (
              <>
                {' '}· afgerond{' '}
                {format(parseISO(review.completed_at), 'd MMM HH:mm', { locale: nl })}
              </>
            )}
          </p>
        </div>
        <div className="page-actions">
          <button
            onClick={() => setWeekStart(format(subWeeks(weekStartDate, 1), 'yyyy-MM-dd'))}
            className="btn btn-ghost"
            aria-label="Vorige week"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={() => setWeekStart(format(addWeeks(weekStartDate, 1), 'yyyy-MM-dd'))}
            className="btn btn-ghost"
            aria-label="Volgende week"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Progress steps */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex items-center gap-1">
            <button
              onClick={() => setStep(s.id)}
              className={clsx(
                'flex-1 text-xs py-1.5 px-2 rounded-md transition-colors',
                step === s.id
                  ? 'bg-accent text-white'
                  : i < stepIndex
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface2 text-muted hover:text-text'
              )}
            >
              {s.label}
            </button>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Laden...
        </div>
      ) : step === 'reflect' ? (
        <Step
          title="Reflectie"
          description="Kijk terug. Eerlijk maar zonder oordeel."
          onNext={async () => {
            await saveDraft();
            setStep('carry');
          }}
        >
          <Field
            label="Wat ging goed?"
            placeholder="Concrete momenten. Wat heb je geleerd, wat is af, wat voelde lekker?"
            value={wentWell}
            onChange={setWentWell}
            rows={4}
          />
          <Field
            label="Wat heeft tijd gekost zonder waarde op te leveren?"
            placeholder="Vergaderingen, scope creep, doom-scrollen, meatloaf..."
            value={timeWasters}
            onChange={setTimeWasters}
            rows={3}
          />
        </Step>
      ) : step === 'carry' ? (
        <Step
          title="Wat verschuift naar volgende week?"
          description="Open todos die nog niet af zijn — schrijf op wat je echt mee neemt."
          onBack={() => setStep('reflect')}
          onNext={async () => {
            await saveDraft();
            setStep('plan');
          }}
        >
          {upcomingTodos.length > 0 && (
            <div className="text-xs text-muted bg-surface2/50 rounded-md p-3">
              <div className="font-medium text-text mb-1">
                Al gepland voor volgende week ({upcomingTodos.length}):
              </div>
              <ul className="space-y-0.5">
                {upcomingTodos.slice(0, 8).map((t) => (
                  <li key={t.id} className="truncate">
                    · {t.title}{' '}
                    <span className="text-muted">({t.due_date})</span>
                  </li>
                ))}
                {upcomingTodos.length > 8 && (
                  <li className="text-muted italic">
                    + {upcomingTodos.length - 8} meer
                  </li>
                )}
              </ul>
            </div>
          )}
          <Field
            label="Carry-over"
            placeholder="Wat wil je écht volgende week afmaken? Niet alles, alleen wat telt."
            value={carryOver}
            onChange={setCarryOver}
            rows={5}
          />
        </Step>
      ) : step === 'plan' ? (
        <Step
          title="Top 3 per dag"
          description="Maximaal drie outcomes per dag. Geen vier."
          onBack={() => setStep('carry')}
          onComplete={complete}
          completePending={upsert.isPending}
        >
          {WEEKDAYS.map((d) => (
            <DayPlanner
              key={d.id}
              label={d.label}
              values={top3[d.id] ?? ['', '', '']}
              onChange={(values) =>
                setTop3((prev) => ({ ...prev, [d.id]: values }))
              }
            />
          ))}
        </Step>
      ) : (
        <DoneView
          weekLabel={weekLabel}
          wentWell={wentWell}
          timeWasters={timeWasters}
          carryOver={carryOver}
          top3={top3}
          onEdit={() => setStep('reflect')}
        />
      )}
    </div>
  );
}

function Step({
  title,
  description,
  children,
  onBack,
  onNext,
  onComplete,
  completePending,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => Promise<void> | void;
  onComplete?: () => Promise<void> | void;
  completePending?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {children}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        {onBack ? (
          <button
            onClick={onBack}
            className="text-sm text-muted hover:text-text flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Terug
          </button>
        ) : (
          <span />
        )}
        {onNext ? (
          <button
            onClick={onNext}
            className="px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 flex items-center gap-2"
          >
            Volgende <ArrowRight size={14} />
          </button>
        ) : onComplete ? (
          <button
            onClick={onComplete}
            disabled={completePending}
            className="px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {completePending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Afronden
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted mb-1.5 block">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm focus:border-accent transition-colors resize-y"
      />
    </div>
  );
}

function DayPlanner({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const padded = [values[0] ?? '', values[1] ?? '', values[2] ?? ''];
  return (
    <div className="bg-surface border border-border rounded-md p-3">
      <div className="text-xs font-medium text-muted mb-2">{label}</div>
      <div className="space-y-1.5">
        {padded.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted w-3">{i + 1}.</span>
            <input
              value={v}
              onChange={(e) => {
                const next = [...padded];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={`Outcome ${i + 1}`}
              className="flex-1 px-2 py-1.5 bg-surface2 border border-transparent rounded text-sm focus:border-accent focus:bg-surface transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DoneView({
  weekLabel,
  wentWell,
  timeWasters,
  carryOver,
  top3,
  onEdit,
}: {
  weekLabel: string;
  wentWell: string;
  timeWasters: string;
  carryOver: string;
  top3: Record<string, string[]>;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="border border-accent/30 bg-accent/5 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle2 size={20} className="text-accent shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Review afgerond</p>
          <p className="text-xs text-muted">
            Week {weekLabel} is gepland. Druk vrijdag opnieuw.
          </p>
        </div>
        <button
          onClick={onEdit}
          className="text-sm text-accent hover:underline"
        >
          Bewerken
        </button>
      </div>

      <Section title="Wat ging goed">
        <p className="text-sm whitespace-pre-wrap text-muted">
          {wentWell || 'Niets ingevuld.'}
        </p>
      </Section>
      <Section title="Time wasters">
        <p className="text-sm whitespace-pre-wrap text-muted">
          {timeWasters || 'Niets ingevuld.'}
        </p>
      </Section>
      <Section title="Carry-over">
        <p className="text-sm whitespace-pre-wrap text-muted">
          {carryOver || 'Niets ingevuld.'}
        </p>
      </Section>

      <Section title="Top 3 per dag">
        <div className="grid sm:grid-cols-2 gap-2">
          {WEEKDAYS.map((d) => {
            const items = (top3[d.id] ?? []).filter(Boolean);
            return (
              <div
                key={d.id}
                className="bg-surface border border-border rounded-md p-3"
              >
                <div className="text-xs font-medium text-muted mb-1.5">
                  {d.label}
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted italic">Niks gepland.</p>
                ) : (
                  <ul className="space-y-0.5 text-sm">
                    {items.map((v, i) => (
                      <li key={i}>
                        <span className="text-muted text-xs mr-1">{i + 1}.</span>
                        {v}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}
