import { describe, expect, it } from 'vitest';
import { BackupError, combineBackup, parseBackup, type Snapshot } from './backup';
import { defaultSettings, type ExportData } from './schema';
import { initialStreakState } from './streak';
import type { DayEntry } from './types';

const NOW = '2026-05-10T12:00:00.000Z';

function day(date: string, done: [boolean, boolean, boolean], updatedAt = NOW): DayEntry {
  return {
    date,
    updatedAt,
    tasks: done.map((d, i) => ({ text: `task ${i + 1}`, done: d, doneAt: d ? NOW : null })),
  };
}
const won = (date: string) => day(date, [true, true, true]);

function backup(partial: Partial<ExportData> = {}): ExportData {
  return {
    app: 'triority',
    version: 1,
    exportedAt: NOW,
    entries: [],
    streak: initialStreakState,
    settings: defaultSettings,
    ...partial,
  };
}

const empty: Snapshot = { entries: [], streak: initialStreakState, settings: defaultSettings };

describe('parseBackup', () => {
  it('round-trips an export', () => {
    const data = backup({ entries: [won('2026-05-01')] });
    expect(parseBackup(JSON.stringify(data))).toEqual(data);
  });

  it('rejects text that is not JSON', () => {
    expect(() => parseBackup('hello')).toThrow(BackupError);
  });

  it('rejects other apps’ files', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'other', version: 1 }))).toThrow(
      'isn’t a Triority backup',
    );
  });

  it('rejects newer versions', () => {
    expect(() => parseBackup(JSON.stringify({ ...backup(), version: 2 }))).toThrow('newer version');
  });

  it('rejects damaged entries without changing anything', () => {
    const bad = backup({
      entries: [{ ...won('2026-05-01'), tasks: won('2026-05-01').tasks.slice(0, 2) }],
    });
    expect(() => parseBackup(JSON.stringify(bad))).toThrow('damaged');
    const long = won('2026-05-01');
    long.tasks[0]!.text = 'x'.repeat(81);
    expect(() => parseBackup(JSON.stringify(backup({ entries: [long] })))).toThrow('damaged');
  });

  it('rejects duplicate days', () => {
    expect(() =>
      parseBackup(JSON.stringify(backup({ entries: [won('2026-05-01'), won('2026-05-01')] }))),
    ).toThrow('damaged');
  });

  it('rejects huge files', () => {
    expect(() => parseBackup('x'.repeat(5_000_001))).toThrow('too big');
  });
});

describe('combineBackup: replace', () => {
  it('swaps in the backup and recomputes the streak', () => {
    const incoming = backup({
      entries: [won('2026-05-07'), won('2026-05-08'), won('2026-05-09')],
      streak: {
        ...initialStreakState,
        current: 99,
        best: 99,
        saviors: 1,
        lastSaviorGrantMonth: '2026-05',
      },
    });
    const current: Snapshot = { ...empty, entries: [won('2026-04-01')] };
    const out = combineBackup({ current, incoming, mode: 'replace', today: '2026-05-10' });
    expect(out.entries.map((e) => e.date)).toEqual(['2026-05-07', '2026-05-08', '2026-05-09']);
    expect(out.streak.current).toBe(3);
    expect(out.streak.saviors).toBe(1);
  });

  it('drops days from the future', () => {
    const incoming = backup({ entries: [won('2026-05-09'), won('2026-05-11'), won('2026-06-01')] });
    const out = combineBackup({ current: empty, incoming, mode: 'replace', today: '2026-05-10' });
    expect(out.entries.map((e) => e.date)).toEqual(['2026-05-09', '2026-05-11']);
  });

  it('drops saved dates that were actually won or are not in the past', () => {
    const incoming = backup({
      entries: [won('2026-05-08')],
      streak: { ...initialStreakState, savedDates: ['2026-05-08', '2026-05-09', '2026-05-10'] },
    });
    const out = combineBackup({ current: empty, incoming, mode: 'replace', today: '2026-05-10' });
    expect(out.streak.savedDates).toEqual(['2026-05-09']);
  });
});

describe('combineBackup: merge', () => {
  it('keeps both sets of days', () => {
    const current: Snapshot = { ...empty, entries: [won('2026-05-09')] };
    const incoming = backup({ entries: [won('2026-05-08')] });
    const out = combineBackup({ current, incoming, mode: 'merge', today: '2026-05-10' });
    expect(out.entries.map((e) => e.date)).toEqual(['2026-05-08', '2026-05-09']);
    expect(out.streak.current).toBe(2);
  });

  it('on a clash keeps the version with more done, then the newer edit', () => {
    const current: Snapshot = {
      ...empty,
      entries: [
        day('2026-05-08', [true, false, false]),
        day('2026-05-09', [true, false, false], '2026-05-09T09:00:00.000Z'),
      ],
    };
    const incoming = backup({
      entries: [
        won('2026-05-08'),
        day('2026-05-09', [false, true, false], '2026-05-09T10:00:00.000Z'),
      ],
    });
    const out = combineBackup({ current, incoming, mode: 'merge', today: '2026-05-10' });
    expect(out.entries[0]!.tasks.every((t) => t.done)).toBe(true);
    expect(out.entries[1]!.updatedAt).toBe('2026-05-09T10:00:00.000Z');
  });

  it('never adds saviors from a backup', () => {
    const current: Snapshot = {
      ...empty,
      streak: { ...initialStreakState, saviors: 0, lastSaviorGrantMonth: '2026-05' },
    };
    const incoming = backup({ streak: { ...initialStreakState, saviors: 2 } });
    expect(
      combineBackup({ current, incoming, mode: 'merge', today: '2026-05-10' }).streak.saviors,
    ).toBe(0);
  });

  it('merges affirmations without duplicates and within the cap', () => {
    const mine = Array.from({ length: 49 }, (_, i) => ({ id: `m${i}`, text: `mine ${i}` }));
    const current: Snapshot = {
      ...empty,
      settings: { reminderTime: '08:00', customAffirmations: mine },
    };
    const incoming = backup({
      settings: {
        reminderTime: '21:00',
        customAffirmations: [
          { id: 'x', text: 'MINE 3' },
          { id: 'y', text: 'new one' },
          { id: 'z', text: 'one too many' },
        ],
      },
    });
    const out = combineBackup({ current, incoming, mode: 'merge', today: '2026-05-10' });
    expect(out.settings.customAffirmations).toHaveLength(50);
    expect(out.settings.customAffirmations.at(-1)?.text).toBe('new one');
    expect(out.settings.reminderTime).toBe('08:00');
  });
});
