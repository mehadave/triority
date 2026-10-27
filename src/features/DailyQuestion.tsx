import { useRef, useState, type FormEvent } from 'react';
import { Sheet } from '../components/Sheet';
import { useData } from '../data/DataProvider';
import { useDay } from '../data/DayProvider';
import { TASK_MAX } from '../domain/types';
import { useUi } from '../state/ui';
import { requestPersistentStorage } from '../lib/device';

const PLACEHOLDERS = ['The big one', 'One step forward', 'Something for you'];

export function DailyQuestionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { repo } = useData();
  const { today } = useDay();
  const announce = useUi((s) => s.announce);
  const [texts, setTexts] = useState(['', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  const ready = texts.every((t) => t.trim().length > 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await repo.createDay(today, texts);
      // A good moment to ask the browser to keep this data: the user just committed to something.
      void requestPersistentStorage();
      setTexts(['', '', '']);
      announce('Three things set for today. 0 of 3 done.');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="What 3 things will make you feel productive today?"
      initialFocus={firstInput}
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        {texts.map((value, i) => (
          <label key={i} className="flex items-end gap-3">
            <span className="font-display w-6 pb-1.5 text-[26px] leading-none" aria-hidden="true">
              {i + 1}
            </span>
            <span className="sr-only">Priority {i + 1}</span>
            <input
              ref={i === 0 ? firstInput : undefined}
              className="ink-input"
              value={value}
              maxLength={TASK_MAX}
              required
              autoComplete="off"
              enterKeyHint={i < 2 ? 'next' : 'done'}
              placeholder={PLACEHOLDERS[i]}
              onChange={(e) =>
                setTexts((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))
              }
            />
          </label>
        ))}
        {error && (
          <p role="alert" className="text-[14px]">
            {error}
          </p>
        )}
        <button type="submit" className="btn-sun mt-2 self-center px-10" disabled={!ready || busy}>
          Let’s go
        </button>
      </form>
    </Sheet>
  );
}
