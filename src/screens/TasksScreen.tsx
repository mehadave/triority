import { startTransition, useOptimistic } from 'react';
import { useCanEdit } from '../components/OfflineNote';
import { useData } from '../data/DataProvider';
import { useDay } from '../data/DayProvider';
import { doneCount, toggleTask } from '../domain/entries';
import { isDayWon } from '../domain/streak';
import type { DayEntry } from '../domain/types';
import { GrowingSunflower } from '../features/GrowingSunflower';
import { TaskRow } from '../features/TaskRow';
import { haptic } from '../lib/motion';
import { useUi } from '../state/ui';

export function TasksScreen() {
  const { repo } = useData();
  const { loaded, today, todayEntry } = useDay();
  const canEdit = useCanEdit();
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
    <div className="flex flex-1 flex-col items-center justify-center py-4">
      <div className="w-full max-w-md">
        <GrowingSunflower done={done} ready={loaded} />
        <h1 className="title mt-3">You got this</h1>
        <p className="text-muted-ink mt-1 text-center text-[14px]" aria-hidden={!entry}>
          {entry ? `${done} of 3 done` : ' '}
        </p>

        {entry ? (
          <ul className="mt-6 flex flex-col gap-2.5" aria-label="Today’s priorities">
            {entry.tasks.map((task, i) => (
              <TaskRow
                key={i}
                task={task}
                index={i}
                editable={canEdit}
                onToggle={canEdit ? () => onToggle(i) : undefined}
                onEdit={(text) => repo.editTask(today, i, text).then(() => undefined)}
              />
            ))}
          </ul>
        ) : (
          loaded && (
            <div className="mt-8 flex flex-col items-center gap-4 text-center">
              <p className="text-muted-ink text-[16px]">
                Pick the three things that would make today feel good.
              </p>
              <button
                type="button"
                className="btn-sun"
                onClick={() => openQuestion(true)}
                disabled={!canEdit}
              >
                Choose today’s three
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
