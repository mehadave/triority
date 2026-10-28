import { PageHeader } from '../components/PageHeader';
import { startTransition, useOptimistic } from 'react';
import { useData } from '../data/DataProvider';
import { useDay } from '../data/DayProvider';
import { doneCount, toggleTask } from '../domain/entries';
import { isDayWon } from '../domain/streak';
import type { DayEntry } from '../domain/types';
import { GrowingSunflower } from '../features/GrowingSunflower';
import { TaskRow } from '../features/TaskRow';
import { haptic } from '../lib/motion';
import { useUi } from '../state/ui';

const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function longToday(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return dayFormat.format(new Date(y, m - 1, d));
}

export function TasksScreen() {
  const { repo } = useData();
  const { loaded, today, todayEntry } = useDay();
  const announce = useUi((s) => s.announce);
  const setCelebrating = useUi((s) => s.setCelebrating);
  const openQuestion = useUi((s) => s.setDailyQuestionOpen);

  const [entry, applyOptimistic] = useOptimistic<DayEntry | undefined, number>(
    todayEntry,
    (current, index) =>
      current ? toggleTask(current, index, today, new Date().toISOString()) : current,
  );

  const done = doneCount(entry);

  const onToggle = (index: number) => {
    if (!entry) return;
    const next = toggleTask(entry, index, today, new Date().toISOString());
    const nextDone = doneCount(next);
    if (next.tasks[index]?.done) haptic();
    startTransition(async () => {
      applyOptimistic(index);
      try {
        await repo.toggleTask(today, index);
      } catch {
        useUi.getState().showToast('That didn’t save. Try again.');
        return;
      }
      if (isDayWon(next) && !isDayWon(entry)) {
        announce('Day won! All 3 done.');
        window.setTimeout(() => setCelebrating(true), 700);
      } else {
        announce(`${nextDone} of 3 done`);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col pb-4">
      <PageHeader />
      <div className="flex flex-1 items-start justify-center pt-2 md:pt-4">
        <div className="w-full max-w-md">
          <p className="text-muted-ink mb-2 text-center text-[14px] font-medium">
            {longToday(today)}
          </p>
          <GrowingSunflower done={done} ready={loaded} />
          <h1 className="title mt-2">You got this</h1>
          <p className="text-muted-ink mt-1 text-center text-[14px]" aria-hidden={!entry}>
            {entry ? `${done} of 3 done` : ' '}
          </p>

          {/* Reserve the list's height so nothing shifts while today's data loads. */}
          <div className="mt-6 min-h-[11.75rem]">
            {entry ? (
              <ul className="flex flex-col gap-2.5" aria-label="Today’s priorities">
                {entry.tasks.map((task, i) => (
                  <TaskRow
                    key={i}
                    task={task}
                    index={i}
                    editable
                    onToggle={() => onToggle(i)}
                    onEdit={(text) => repo.editTask(today, i, text).then(() => undefined)}
                  />
                ))}
              </ul>
            ) : (
              loaded && (
                <div className="flex flex-col items-center gap-4 pt-2 text-center">
                  <p className="text-muted-ink text-[16px]">
                    Pick the three things that would make today feel good.
                  </p>
                  <button type="button" className="btn-sun" onClick={() => openQuestion(true)}>
                    Choose today’s three
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
