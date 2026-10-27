import { PageHeader } from '../components/PageHeader';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { ChevronIcon, HollowDay, Tick, HandCircle } from '../components/art';
import { PressedFlower, PressedFlowerDefs } from '../components/PressedFlower';
import { Sheet } from '../components/Sheet';
import { useDay } from '../data/DayProvider';
import { compareKeys, daysInMonth, monthOf, weekdayIndex } from '../domain/dates';
import { isDayWon } from '../domain/streak';
import type { DateKey, DayEntry } from '../domain/types';

type DayKind = 'won' | 'saved' | 'partial' | 'none';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const KIND_LABEL: Record<DayKind, string> = {
  won: 'day won',
  saved: 'saved by a savior',
  partial: 'partly done',
  none: 'no tasks',
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function longDate(key: DateKey): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return format(new Date(y, m - 1, d), 'EEEE, MMMM d');
}

export function CalScreen() {
  const { today, entries, state, streak } = useDay();
  const [month, setMonth] = useState(() => monthOf(today));
  const [selected, setSelected] = useState<DateKey | null>(null);
  const saved = useMemo(() => new Set(state?.savedDates ?? []), [state]);

  const kindOf = (key: DateKey): DayKind => {
    const entry = entries.get(key);
    if (isDayWon(entry)) return 'won';
    if (saved.has(key)) return 'saved';
    if (entry) return 'partial';
    return 'none';
  };

  const days = daysInMonth(month);
  const lead = weekdayIndex(days[0]!);
  const [y, mo] = month.split('-').map(Number) as [number, number];
  const monthLabel = format(new Date(y, mo - 1, 1), 'MMMM yyyy');
  const atCurrent = month >= monthOf(today);
  const selectedEntry: DayEntry | undefined = selected ? entries.get(selected) : undefined;

  return (
    <div className="flex flex-1 flex-col items-center pb-4">
      <PageHeader title="Cal" />
      <PressedFlowerDefs />

      <dl className="mt-4 grid w-full max-w-md grid-cols-3 gap-2 text-center">
        <div className="border-ink rounded-2xl border-2 px-2 py-3">
          <dt className="text-muted-ink text-[13px]">Current streak</dt>
          <dd className="text-[22px] font-medium tabular-nums">{streak.current}</dd>
        </div>
        <div className="border-ink rounded-2xl border-2 px-2 py-3">
          <dt className="text-muted-ink text-[13px]">Best streak</dt>
          <dd className="text-[22px] font-medium tabular-nums">{streak.best}</dd>
        </div>
        <div className="border-ink rounded-2xl border-2 px-2 py-3">
          <dt className="text-muted-ink text-[13px]">Saviors</dt>
          <dd className="text-[22px] font-medium tabular-nums">
            {state?.saviors ?? 0} <span className="text-muted-ink text-[14px]">of 2</span>
          </dd>
        </div>
      </dl>

      <section className="mt-6 w-full max-w-md" aria-labelledby="month-label">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Previous month"
          >
            <ChevronIcon dir="left" />
          </button>
          <h2 id="month-label" className="text-[18px] font-medium" aria-live="polite">
            {monthLabel}
          </h2>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-30"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={atCurrent}
            aria-label="Next month"
          >
            <ChevronIcon dir="right" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          <div className="contents">
            {WEEKDAYS.map((d, i) => (
              <div key={i} aria-hidden="true" className="text-muted-ink pb-1 text-[13px]">
                {d}
              </div>
            ))}
          </div>
          <div className="contents">
            {Array.from({ length: lead }, (_, i) => (
              <div key={`lead-${i}`} aria-hidden="true" />
            ))}
            {days.map((key) => {
              const kind = kindOf(key);
              const isToday = key === today;
              const future = compareKeys(key, today) > 0;
              const label = `${longDate(key)}: ${KIND_LABEL[kind]}${isToday ? ', today' : ''}`;
              return (
                <div key={key}>
                  <button
                    type="button"
                    disabled={future}
                    onClick={() => setSelected(key)}
                    aria-label={label}
                    className="flex aspect-square min-h-11 w-full flex-col items-center justify-center rounded-xl disabled:opacity-35"
                  >
                    <span
                      className={`text-[13px] leading-none tabular-nums ${
                        isToday ? 'bg-sun rounded-full px-1.5 py-0.5 font-medium' : ''
                      }`}
                    >
                      {Number(key.slice(8))}
                    </span>
                    <span className="mt-0.5 h-7 w-6">
                      {kind === 'won' && <PressedFlower dateKey={key} />}
                      {kind === 'partial' && <HollowDay />}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <ul
          className="text-muted-ink mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px]"
          aria-label="Legend"
        >
          <li className="flex items-center gap-1.5">
            <span className="h-5 w-4">
              <PressedFlower dateKey="legend-won" />
            </span>
            Won
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-4 w-4">
              <HollowDay />
            </span>
            Partly done
          </li>
        </ul>
      </section>

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? longDate(selected) : ''}
      >
        {selectedEntry ? (
          <ul className="flex flex-col gap-2.5" aria-label="Priorities">
            {selectedEntry.tasks.map((task, i) => (
              <li key={i} className="flex min-h-14 items-center gap-3">
                <span
                  className="relative h-[46px] w-[46px] shrink-0"
                  role="img"
                  aria-label={task.done ? 'Done' : 'Not done'}
                >
                  <HandCircle variant={i} />
                  {task.done && <Tick animate={false} />}
                </span>
                <span className="text-task">
                  <span
                    className={`strike ${task.done ? 'text-muted-ink' : ''}`}
                    data-on={task.done}
                    data-instant
                  >
                    {task.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-ink text-center text-[16px]">
            {selected && saved.has(selected)
              ? 'A savior kept your streak going this day.'
              : 'Nothing planned this day.'}
          </p>
        )}
        {selected === today && selectedEntry && (
          <p className="text-muted-ink mt-4 text-center text-[14px]">
            Today’s tasks can be ticked on the Tasks tab.
          </p>
        )}
      </Sheet>
    </div>
  );
}

export default CalScreen;
