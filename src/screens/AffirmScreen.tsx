import { PageHeader } from '../components/PageHeader';
import { useState, type FormEvent } from 'react';
import { PencilIcon, TrashIcon } from '../components/art';
import { PROMISE_LINE } from '../content/affirmations';
import { useData } from '../data/DataProvider';
import { useDay } from '../data/DayProvider';
import { AFFIRMATION_MAX, MAX_CUSTOM_AFFIRMATIONS } from '../domain/types';
import type { Affirmation } from '../domain/schema';

// Sticky-note colours and tilts, picked by position so each note keeps its look.
const NOTE_COLORS = [
  'var(--note-yellow)',
  'var(--note-pink)',
  'var(--note-mint)',
  'var(--note-sky)',
  'var(--note-lilac)',
];
const NOTE_TILTS = [-2, 1.8, -0.8, 1.5, -1.6, 1.1];
/** Longer lines get a full-width note so they stay easy to read. */
const LONG_NOTE = 40;

function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AffirmScreen() {
  const { repo } = useData();
  const { settings } = useDay();
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
    <div className="flex flex-1 flex-col items-center pb-4">
      <PageHeader title="Affirm" />
      <div className="mt-6 w-full max-w-md">
        <p className="promise">{PROMISE_LINE}</p>
      </div>

      <section aria-labelledby="mine" className="mt-6 w-full max-w-md">
        <h2 id="mine" className="text-muted-ink text-[14px] font-medium tracking-wide uppercase">
          Your affirmations
        </h2>
        {list.length === 0 && (
          <p className="text-muted-ink mt-3 text-[15px]">
            Write a line you’d like to hear more often.
          </p>
        )}
        <ul className="mt-5 grid grid-cols-2 items-start gap-x-3.5 gap-y-5">
          {list.map((a, i) => (
            <li
              key={a.id}
              className={`note ${a.text.length > LONG_NOTE ? 'col-span-2' : ''}`}
              style={{
                background: NOTE_COLORS[i % NOTE_COLORS.length],
                transform: `rotate(${NOTE_TILTS[i % NOTE_TILTS.length]}deg)`,
              }}
            >
              <span className="note-tape" aria-hidden="true" />
              {editing?.id === a.id ? (
                <>
                  <label className="sr-only" htmlFor={`aff-${a.id}`}>
                    Edit affirmation
                  </label>
                  <textarea
                    id={`aff-${a.id}`}
                    className="w-full resize-none bg-transparent text-[14px] leading-snug outline-none"
                    rows={3}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    value={editing.text}
                    maxLength={AFFIRMATION_MAX}
                    onChange={(e) => setEditing({ id: a.id, text: e.target.value })}
                    onBlur={() => void commitEdit()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void commitEdit();
                      }
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                </>
              ) : (
                <p className="text-[14px] leading-snug break-words">{a.text}</p>
              )}
              <div className="-mr-2 -mb-2 flex justify-end">
                <button
                  type="button"
                  className="text-muted-ink flex h-9 w-9 items-center justify-center rounded-full"
                  aria-label={`Edit “${a.text}”`}
                  onClick={() => setEditing({ id: a.id, text: a.text })}
                >
                  <PencilIcon width={16} height={16} />
                </button>
                <button
                  type="button"
                  className="text-muted-ink flex h-9 w-9 items-center justify-center rounded-full"
                  aria-label={`Delete “${a.text}”`}
                  onClick={() => void save(list.filter((x) => x.id !== a.id))}
                >
                  <TrashIcon width={16} height={16} />
                </button>
              </div>
            </li>
          ))}
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
