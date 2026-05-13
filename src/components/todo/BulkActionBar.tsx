import { useState } from 'react';
import { format, addDays, nextMonday, startOfDay } from 'date-fns';
import {
  CalendarClock,
  CheckCircle2,
  FolderInput,
  Trash2,
  X,
  ChevronDown,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import type { Todo, TodoStatus } from '@/lib/types';

interface Props {
  count: number;
  todos: Todo[];
  onClear: () => void;
  onSetStatus: (status: TodoStatus) => void;
  onSetDate: (due_date: string | null) => void;
  onSetProject: (project_id: string | null) => void;
  onDelete: () => void;
}

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export default function BulkActionBar({
  count,
  todos: _todos,
  onClear,
  onSetStatus,
  onSetDate,
  onSetProject,
  onDelete,
}: Props) {
  const { data: projects = [] } = useProjects();
  const [openMenu, setOpenMenu] = useState<'date' | 'project' | null>(null);

  if (count === 0) return null;

  const today = startOfDay(new Date());

  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-3xl">
      <div className="flex items-center gap-2 bg-text text-surface rounded-lg shadow-lg px-3 py-2 text-sm">
        <button
          onClick={onClear}
          className="opacity-70 hover:opacity-100"
          aria-label="Wis selectie"
        >
          <X size={14} />
        </button>
        <span className="font-medium tabular-nums">
          {count} geselecteerd
        </span>

        <div className="h-4 w-px bg-surface/30 mx-1" />

        <button
          onClick={() => onSetStatus('done')}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface/10"
        >
          <CheckCircle2 size={13} /> Voltooien
        </button>

        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'date' ? null : 'date')}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface/10"
          >
            <CalendarClock size={13} /> Plannen <ChevronDown size={11} />
          </button>
          {openMenu === 'date' && (
            <div className="absolute bottom-full mb-1 left-0 w-48 bg-surface text-text rounded-lg shadow-lg border border-border py-1 text-sm">
              <DateOption label="Vandaag" date={today} onClick={onSetDate} setOpen={setOpenMenu} />
              <DateOption label="Morgen" date={addDays(today, 1)} onClick={onSetDate} setOpen={setOpenMenu} />
              <DateOption label="Volgende maandag" date={nextMonday(today)} onClick={onSetDate} setOpen={setOpenMenu} />
              <DateOption label="Volgende week" date={addDays(today, 7)} onClick={onSetDate} setOpen={setOpenMenu} />
              <button
                onClick={() => {
                  onSetDate(null);
                  setOpenMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-surface2 text-muted"
              >
                Geen datum
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'project' ? null : 'project')}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface/10"
          >
            <FolderInput size={13} /> Verplaats <ChevronDown size={11} />
          </button>
          {openMenu === 'project' && (
            <div className="absolute bottom-full mb-1 left-0 w-56 bg-surface text-text rounded-lg shadow-lg border border-border py-1 text-sm max-h-80 overflow-y-auto">
              <button
                onClick={() => {
                  onSetProject(null);
                  setOpenMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-surface2"
              >
                📥 Inbox (geen project)
              </button>
              {projects.length > 0 && <div className="border-t border-border my-1" />}
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSetProject(p.id);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-surface2 truncate"
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/20 text-red-300"
        >
          <Trash2 size={13} /> Verwijderen
        </button>
      </div>
    </div>
  );
}

function DateOption({
  label,
  date,
  onClick,
  setOpen,
}: {
  label: string;
  date: Date;
  onClick: (d: string) => void;
  setOpen: (v: null) => void;
}) {
  return (
    <button
      onClick={() => {
        onClick(ymd(date));
        setOpen(null);
      }}
      className="w-full px-3 py-1.5 text-left hover:bg-surface2 flex items-center justify-between"
    >
      <span>{label}</span>
      <span className="text-[10px] text-muted tabular-nums">{format(date, 'EEE d MMM')}</span>
    </button>
  );
}
