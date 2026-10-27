import { useState, type FormEvent } from 'react';
import { PencilIcon, TrashIcon } from '../components/art';
import { PROMISE_LINE, affirmationFor } from '../content/affirmations';
import { useData } from '../data/DataProvider';
import { useDay } from '../data/DayProvider';
import { AFFIRMATION_MAX, MAX_CUSTOM_AFFIRMATIONS } from '../domain/types';
import type { Affirmation } from '../domain/schema';

function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AffirmScreen() {
  const { repo } = useData();
  const { today, settings } = useDay();
  const list = settings?.customAffirmations ?? [];
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: Affirmation[]) => {
    setError(null);
    try {
      await repo.updateSettings({ customAffirmations: next });
      return true;
    } catch {
      setError('That one didn’t save. Keep it under 140 characters.');
      return false;
    }
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || list.length >= MAX_CUSTOM_AFFIRMATIONS) return;
    if (await save([...list, { id: newId(), text }])) setDraft('');
  };

  const commitEdit = async () => {
    if (!editing) return;
    const text = editing.text.trim();
    if (!text) return setEditing(null);
    if (await save(list.map((a) => (a.id === editing.id ? { ...a, text } : a)))) setEditing(null);
  };

  return (
    <div className="flex flex-1 flex-col items-center py-4">
      <h1 className="title">Affirm</h1>
      <p className="font-display mt-8 max-w-sm text-center text-[34px] leading-tight">
        {PROMISE_LINE}
      </p>
      <p className="mt-6 max-w-sm text-center text-[18px]">{affirmationFor(today)}</p>

      <section aria-labelledby="mine" className="mt-12 w-full max-w-md">
        <h2 id="mine" className="text-muted-ink text-[14px] font-medium tracking-wide uppercase">
          Your affirmations
        </h2>
        {list.length === 0 && (
          <p className="text-muted-ink mt-3 text-[15px]">
            Write a line you’d like to hear more often.
          </p>
        )}
        <ul className="mt-3 flex flex-col gap-1">
          {list.map((a) =>
            editing?.id === a.id ? (
              <li key={a.id}>
                <label className="sr-only" htmlFor={`aff-${a.id}`}>
                  Edit affirmation
                </label>
                <input
                  id={`aff-${a.id}`}
                  className="ink-input"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  value={editing.text}
                  maxLength={AFFIRMATION_MAX}
                  onChange={(e) => setEditing({ id: a.id, text: e.target.value })}
                  onBlur={() => void commitEdit()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitEdit();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={a.id} className="border-hairline flex items-center gap-1 border-b py-1">
                <p className="flex-1 py-2 text-[16px] break-words">{a.text}</p>
                <>
                  <button
                    type="button"
                    className="text-muted-ink flex h-11 w-11 items-center justify-center rounded-full"
                    aria-label={`Edit “${a.text}”`}
                    onClick={() => setEditing({ id: a.id, text: a.text })}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    className="text-muted-ink flex h-11 w-11 items-center justify-center rounded-full"
                    aria-label={`Delete “${a.text}”`}
                    onClick={() => void save(list.filter((x) => x.id !== a.id))}
                  >
                    <TrashIcon />
                  </button>
                </>
              </li>
            ),
          )}
        </ul>
        {list.length < MAX_CUSTOM_AFFIRMATIONS && (
          <form onSubmit={add} className="mt-4 flex items-end gap-3">
            <label className="flex-1">
              <span className="sr-only">New affirmation</span>
              <input
                className="ink-input"
                value={draft}
                maxLength={AFFIRMATION_MAX}
                placeholder="I am…"
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            <button type="submit" className="btn-sun min-h-11 px-5" disabled={!draft.trim()}>
              Add
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-2 text-[14px]">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
