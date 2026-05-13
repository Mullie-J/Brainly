import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  value: string[];                            // ISO date strings
  onChange: (next: string[]) => void;
  onClose?: () => void;
}

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export default function RecurrenceDatePicker({ value, onChange, onClose }: Props) {
  const [cursor, setCursor] = useState(() => {
    // If user has dates, start at the first one. Otherwise current month.
    if (value.length > 0) return parseISO(value.slice().sort()[0]);
    return new Date();
  });

  const selectedSet = useMemo(() => new Set(value), [value]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) =>
      format(new Date(base.getTime() + i * 86400000), 'EEEEEE', { locale: nl })
    );
  }, []);

  function toggleDay(d: Date) {
    const key = ymd(d);
    if (selectedSet.has(key)) {
      onChange(value.filter((x) => x !== key));
    } else {
      onChange([...value, key].sort());
    }
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="rec-picker">
      <div className="rec-picker-head">
        <button
          onClick={() => setCursor(subMonths(cursor, 1))}
          className="wkp-nav"
          aria-label="Vorige maand"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="rec-picker-title">
          {format(cursor, 'MMMM yyyy', { locale: nl })}
        </span>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="wkp-nav"
          aria-label="Volgende maand"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="rec-picker-grid">
        {weekdayLabels.map((d) => (
          <span key={d} className="rec-picker-weekday">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const key = ymd(day);
          const selected = selectedSet.has(key);
          const inMonth = isSameMonth(day, cursor);
          const current = isToday(day);
          return (
            <button
              key={key}
              onClick={() => toggleDay(day)}
              className={clsx(
                'rec-picker-day',
                !inMonth && 'out',
                current && 'today',
                selected && 'selected'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      <div className="rec-picker-foot">
        <div className="rec-picker-count">
          <span className="tabular">{value.length}</span>{' '}
          {value.length === 1 ? 'datum' : 'datums'} geselecteerd
        </div>
        {value.length > 0 && (
          <button onClick={clearAll} className="btn btn-ghost">
            <X size={12} /> Alles wissen
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="btn btn-primary">
            Klaar
          </button>
        )}
      </div>

      {value.length > 0 && (
        <div className="rec-picker-chips">
          {value
            .slice()
            .sort()
            .map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(parseISO(d))}
                className="rec-picker-chip"
                title="Klik om te verwijderen"
              >
                {format(parseISO(d), 'd MMM', { locale: nl })}
                {isSameDay(parseISO(d), new Date()) && ' (vandaag)'}
                <X size={9} style={{ marginLeft: 3 }} />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
