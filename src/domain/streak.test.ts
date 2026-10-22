import { describe, expect, it } from 'vitest';
import type { DayEntry, StreakState } from './types';
import {
  applySaviors,
  computeStreak,
  declineSaviors,
  effectiveToday,
  evaluateMissedDays,
  grantMonthlySavior,
  indexEntries,
  isDayWon,
  refreshStreak,
} from './streak';
import { addDays, toDateKey } from './dates';
import { PastDayError, createDay, editTaskText, toggleTask } from './entries';

const NOW = '2026-01-01T12:00:00.000Z';

function day(date: string, done: [boolean, boolean, boolean] = [true, true, true]): DayEntry {
  return {
    date,
    updatedAt: NOW,
    tasks: done.map((d, i) => ({ text: `task ${i + 1}`, done: d, doneAt: d ? NOW : null })),
  };
}

function wonRange(start: string, count: number): DayEntry[] {
  return Array.from({ length: count }, (_, i) => day(addDays(start, i)));
}

function state(partial: Partial<StreakState> = {}): StreakState {
  return {
    current: 0,
    best: 0,
    saviors: 0,
    lastSaviorGrantMonth: null,
    savedDates: [],
    ...partial,
  };
}

describe('isDayWon', () => {
  it('is won with exactly 3 entered tasks, all done', () => {
    expect(isDayWon(day('2026-05-01'))).toBe(true);
  });

  it('is not won if any task is not done', () => {
    expect(isDayWon(day('2026-05-01', [true, true, false]))).toBe(false);
  });

  it('is not won with fewer than 3 tasks', () => {
    const entry = day('2026-05-01');
    entry.tasks = entry.tasks.slice(0, 2);
    expect(isDayWon(entry)).toBe(false);
  });

  it('is not won with more than 3 tasks', () => {
    const entry = day('2026-05-01');
    entry.tasks = [...entry.tasks, { text: 'extra', done: true, doneAt: NOW }];
    expect(isDayWon(entry)).toBe(false);
  });

  it('is not won if a task has blank text', () => {
    const entry = day('2026-05-01');
    entry.tasks[1] = { text: '   ', done: true, doneAt: NOW };
    expect(isDayWon(entry)).toBe(false);
  });

  it('is not won for a missing day', () => {
    expect(isDayWon(undefined)).toBe(false);
  });
});

describe('ticking only happens on the same local date', () => {
  it('rejects ticking a task on a past day', () => {
    const entry = day('2026-05-01', [false, false, false]);
    expect(() => toggleTask(entry, 0, '2026-05-02', NOW)).toThrow(PastDayError);
  });

  it('rejects editing the text of a past day', () => {
    const entry = day('2026-05-01', [false, false, false]);
    expect(() => editTaskText(entry, 0, 'changed', '2026-05-02', NOW)).toThrow(PastDayError);
  });

  it('allows ticking and editing today', () => {
    const entry = day('2026-05-01', [false, false, false]);
    const ticked = toggleTask(entry, 2, '2026-05-01', NOW);
    expect(ticked.tasks[2]).toEqual({ text: 'task 3', done: true, doneAt: NOW });
    const unticked = toggleTask(ticked, 2, '2026-05-01', NOW);
    expect(unticked.tasks[2]?.done).toBe(false);
    expect(unticked.tasks[2]?.doneAt).toBeNull();
    expect(editTaskText(entry, 0, 'new', '2026-05-01', NOW).tasks[0]?.text).toBe('new');
  });

  it('createDay needs exactly 3 non-empty tasks within 80 chars', () => {
    expect(() => createDay('2026-05-01', ['a', 'b'], NOW)).toThrow();
    expect(() => createDay('2026-05-01', ['a', 'b', ' '], NOW)).toThrow();
    expect(() => createDay('2026-05-01', ['a', 'b', 'x'.repeat(81)], NOW)).toThrow();
    expect(createDay('2026-05-01', [' a ', 'b', 'c'], NOW).tasks[0]?.text).toBe('a');
  });
});

describe('computeStreak', () => {
  it('counts consecutive won days through yesterday when today is not won yet', () => {
    const entries = indexEntries(wonRange('2026-05-01', 5));
    expect(computeStreak({ entries, savedDates: [], today: '2026-05-06' }).current).toBe(5);
  });

  it('counts today once it is won', () => {
    const entries = indexEntries(wonRange('2026-05-01', 6));
    expect(computeStreak({ entries, savedDates: [], today: '2026-05-06' }).current).toBe(6);
  });

  it('a partial today does not break the streak through yesterday', () => {
    const entries = indexEntries([
      ...wonRange('2026-05-01', 5),
      day('2026-05-06', [true, false, false]),
    ]);
    expect(computeStreak({ entries, savedDates: [], today: '2026-05-06' }).current).toBe(5);
  });

  it('a gap resets the current streak but best remembers it', () => {
    const entries = indexEntries([...wonRange('2026-05-01', 4), ...wonRange('2026-05-06', 2)]);
    const result = computeStreak({ entries, savedDates: [], today: '2026-05-08' });
    expect(result.current).toBe(2);
    expect(result.best).toBe(4);
  });

  it('a partial day in the past is a gap', () => {
    const entries = indexEntries([
      ...wonRange('2026-05-01', 2),
      day('2026-05-03', [true, true, false]),
      day('2026-05-04'),
    ]);
    expect(computeStreak({ entries, savedDates: [], today: '2026-05-05' }).current).toBe(1);
  });

  it('is zero with no history', () => {
    expect(computeStreak({ entries: new Map(), savedDates: [], today: '2026-05-05' })).toEqual({
      current: 0,
      best: 0,
    });
  });

  it('a saved day keeps the streak alive but does not add to it', () => {
    const entries = indexEntries([...wonRange('2026-05-01', 3), ...wonRange('2026-05-05', 2)]);
    const result = computeStreak({ entries, savedDates: ['2026-05-04'], today: '2026-05-07' });
    expect(result.current).toBe(5);
    expect(result.best).toBe(5);
  });

  it('a saved day alone is not a streak', () => {
    expect(
      computeStreak({ entries: new Map(), savedDates: ['2026-05-04'], today: '2026-05-05' })
        .current,
    ).toBe(0);
  });

  it('crosses month boundaries', () => {
    const entries = indexEntries(wonRange('2026-04-28', 6));
    expect(computeStreak({ entries, savedDates: [], today: '2026-05-04' }).current).toBe(6);
  });

  it('crosses year boundaries', () => {
    const entries = indexEntries(wonRange('2026-12-30', 4));
    expect(computeStreak({ entries, savedDates: [], today: '2027-01-03' }).current).toBe(4);
  });

  it('handles a leap day', () => {
    const entries = indexEntries(wonRange('2028-02-27', 4));
    expect(entries.has('2028-02-29')).toBe(true);
    expect(computeStreak({ entries, savedDates: [], today: '2028-03-02' }).current).toBe(4);
  });

  it('does not invent a leap day in a common year', () => {
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('is unaffected by DST changes because it uses date keys', () => {
    // US spring forward 2026-03-08, fall back 2026-11-01; EU 2026-03-29 and 2026-10-25.
    for (const start of ['2026-03-06', '2026-10-30', '2026-03-27', '2026-10-23']) {
      const entries = indexEntries(wonRange(start, 5));
      expect(computeStreak({ entries, savedDates: [], today: addDays(start, 5) }).current).toBe(5);
    }
  });
});

describe('local date keys', () => {
  it('formats the device-local date across a DST change', () => {
    const tz = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      // 01:30 local on the night clocks spring forward.
      expect(toDateKey(new Date('2026-03-08T06:30:00Z'))).toBe('2026-03-08');
      // 23:30 local the night before, still the 7th.
      expect(toDateKey(new Date('2026-03-08T04:30:00Z'))).toBe('2026-03-07');
      // Fall back: 01:30 happens twice; both are the 1st.
      expect(toDateKey(new Date('2026-11-01T05:30:00Z'))).toBe('2026-11-01');
      expect(toDateKey(new Date('2026-11-01T06:30:00Z'))).toBe('2026-11-01');
    } finally {
      process.env.TZ = tz;
    }
  });
});

describe('timezone change mid-streak', () => {
  it('flying east: the date jumps forward without double counting', () => {
    // Won 1st-5th in New York, now it is the 6th in Tokyo.
    const entries = indexEntries(wonRange('2026-05-01', 5));
    const today = effectiveToday('2026-05-06', entries);
    expect(today).toBe('2026-05-06');
    expect(computeStreak({ entries, savedDates: [], today }).current).toBe(5);
  });

  it('flying west: a day entered "ahead" is not skipped or counted twice', () => {
    // Won 1st-6th; the 6th was entered in Tokyo. In LA it is still the 5th.
    const entries = indexEntries(wonRange('2026-05-01', 6));
    const today = effectiveToday('2026-05-05', entries);
    expect(today).toBe('2026-05-06');
    expect(computeStreak({ entries, savedDates: [], today }).current).toBe(6);
  });
});

describe('grantMonthlySavior', () => {
  it('grants one savior for the current month on first open', () => {
    const next = grantMonthlySavior(state(), '2026-05-01');
    expect(next.saviors).toBe(1);
    expect(next.lastSaviorGrantMonth).toBe('2026-05');
  });

  it('grants on the 1st of a new month', () => {
    const next = grantMonthlySavior(
      state({ saviors: 0, lastSaviorGrantMonth: '2026-04' }),
      '2026-05-01',
    );
    expect(next.saviors).toBe(1);
  });

  it('a late open in the month still gets that month’s savior', () => {
    const next = grantMonthlySavior(
      state({ saviors: 1, lastSaviorGrantMonth: '2026-04' }),
      '2026-05-17',
    );
    expect(next.saviors).toBe(2);
  });

  it('never double grants in one month', () => {
    const once = grantMonthlySavior(
      state({ saviors: 0, lastSaviorGrantMonth: '2026-04' }),
      '2026-05-01',
    );
    const twice = grantMonthlySavior(once, '2026-05-20');
    expect(twice.saviors).toBe(1);
    expect(twice).toBe(once);
  });

  it('caps at 2', () => {
    const next = grantMonthlySavior(
      state({ saviors: 2, lastSaviorGrantMonth: '2026-04' }),
      '2026-05-01',
    );
    expect(next.saviors).toBe(2);
    expect(next.lastSaviorGrantMonth).toBe('2026-05');
  });

  it('several skipped months still cap at 2', () => {
    const next = grantMonthlySavior(
      state({ saviors: 0, lastSaviorGrantMonth: '2025-11' }),
      '2026-05-01',
    );
    expect(next.saviors).toBe(2);
  });

  it('crosses the year boundary', () => {
    const next = grantMonthlySavior(
      state({ saviors: 0, lastSaviorGrantMonth: '2026-12' }),
      '2027-01-01',
    );
    expect(next.saviors).toBe(1);
  });
});

describe('missed days and saviors', () => {
  const twelve = wonRange('2026-05-01', 12); // 1st..12th

  it('nothing to do when yesterday was won', () => {
    const entries = indexEntries(twelve);
    expect(
      evaluateMissedDays({
        entries,
        state: state({ current: 12, saviors: 1 }),
        today: '2026-05-13',
      }),
    ).toEqual({ kind: 'none' });
  });

  it('one missed day with 1 savior: offers to use it', () => {
    const entries = indexEntries(twelve);
    const s = state({ current: 12, best: 12, saviors: 1 });
    const result = evaluateMissedDays({ entries, state: s, today: '2026-05-14' });
    expect(result).toEqual({ kind: 'offer', missed: ['2026-05-13'], streak: 12, saviors: 1 });

    const used = applySaviors({ entries, state: s, dates: ['2026-05-13'], today: '2026-05-14' });
    expect(used.saviors).toBe(0);
    expect(used.savedDates).toEqual(['2026-05-13']);
    expect(used.current).toBe(12);
    // Winning today continues from 12.
    const withToday = indexEntries([...twelve, day('2026-05-14')]);
    expect(
      computeStreak({ entries: withToday, savedDates: used.savedDates, today: '2026-05-14' })
        .current,
    ).toBe(13);
    // And the prompt does not come back.
    expect(evaluateMissedDays({ entries, state: used, today: '2026-05-14' })).toEqual({
      kind: 'none',
    });
  });

  it('two missed days with 2 saviors: offers both', () => {
    const entries = indexEntries(twelve);
    const s = state({ current: 12, saviors: 2 });
    const result = evaluateMissedDays({ entries, state: s, today: '2026-05-15' });
    expect(result).toEqual({
      kind: 'offer',
      missed: ['2026-05-13', '2026-05-14'],
      streak: 12,
      saviors: 2,
    });
    const used = applySaviors({
      entries,
      state: s,
      dates: ['2026-05-13', '2026-05-14'],
      today: '2026-05-15',
    });
    expect(used.saviors).toBe(0);
    expect(used.current).toBe(12);
  });

  it('two missed days with 1 savior: the streak resets', () => {
    const entries = indexEntries(twelve);
    const s = state({ current: 12, saviors: 1 });
    expect(evaluateMissedDays({ entries, state: s, today: '2026-05-15' })).toEqual({
      kind: 'reset',
      missed: ['2026-05-13', '2026-05-14'],
      streak: 12,
    });
  });

  it('a long absence resets', () => {
    const entries = indexEntries(twelve);
    const result = evaluateMissedDays({
      entries,
      state: state({ current: 12, saviors: 2 }),
      today: '2026-06-30',
    });
    expect(result.kind).toBe('reset');
  });

  it('one missed day with 0 saviors resets', () => {
    const entries = indexEntries(twelve);
    expect(
      evaluateMissedDays({ entries, state: state({ current: 12 }), today: '2026-05-14' }).kind,
    ).toBe('reset');
  });

  it('declining a savior resets the streak and stops asking', () => {
    const entries = indexEntries(twelve);
    const s = state({ current: 12, best: 12, saviors: 1 });
    const declined = declineSaviors(s);
    expect(declined.current).toBe(0);
    expect(declined.saviors).toBe(1);
    expect(declined.best).toBe(12);
    expect(evaluateMissedDays({ entries, state: declined, today: '2026-05-14' })).toEqual({
      kind: 'none',
    });
    expect(
      computeStreak({ entries, savedDates: declined.savedDates, today: '2026-05-14' }).current,
    ).toBe(0);
  });

  it('never asks when the streak was already zero', () => {
    const entries = indexEntries([day('2026-05-01', [true, false, false])]);
    expect(
      evaluateMissedDays({ entries, state: state({ saviors: 2 }), today: '2026-05-03' }),
    ).toEqual({ kind: 'none' });
  });

  it('does not ask once today is already won', () => {
    const entries = indexEntries([...twelve, day('2026-05-14')]);
    expect(
      evaluateMissedDays({
        entries,
        state: state({ current: 12, saviors: 1 }),
        today: '2026-05-14',
      }),
    ).toEqual({ kind: 'none' });
  });

  it('unticking today’s only win never triggers a missed-day prompt', () => {
    const won = indexEntries([day('2026-05-14')]);
    const s = refreshStreak(state(), won, '2026-05-14');
    expect(s.current).toBe(1);
    const unticked = indexEntries([day('2026-05-14', [true, true, false])]);
    const after = refreshStreak(s, unticked, '2026-05-14');
    expect(after.current).toBe(0);
    expect(evaluateMissedDays({ entries: unticked, state: s, today: '2026-05-14' })).toEqual({
      kind: 'none',
    });
  });

  it('unticking today keeps the streak through yesterday', () => {
    const entries = indexEntries([...twelve, day('2026-05-13')]);
    const s = refreshStreak(state(), entries, '2026-05-13');
    expect(s.current).toBe(13);
    const unticked = indexEntries([...twelve, day('2026-05-13', [true, false, false])]);
    expect(refreshStreak(s, unticked, '2026-05-13').current).toBe(12);
  });

  it('a partial missed day still counts as missed', () => {
    const entries = indexEntries([...twelve, day('2026-05-13', [true, true, false])]);
    const result = evaluateMissedDays({
      entries,
      state: state({ current: 12, saviors: 1 }),
      today: '2026-05-14',
    });
    expect(result).toEqual({ kind: 'offer', missed: ['2026-05-13'], streak: 12, saviors: 1 });
  });

  it('rejects saving a day that was won', () => {
    const entries = indexEntries(twelve);
    expect(() =>
      applySaviors({
        entries,
        state: state({ current: 12, saviors: 1 }),
        dates: ['2026-05-12'],
        today: '2026-05-14',
      }),
    ).toThrow();
  });

  it('rejects saving today or a future day', () => {
    const entries = indexEntries(twelve);
    const s = state({ current: 12, saviors: 2 });
    expect(() =>
      applySaviors({ entries, state: s, dates: ['2026-05-14'], today: '2026-05-14' }),
    ).toThrow();
    expect(() =>
      applySaviors({ entries, state: s, dates: ['2026-05-20'], today: '2026-05-14' }),
    ).toThrow();
  });

  it('rejects using more saviors than banked', () => {
    const entries = indexEntries(twelve);
    expect(() =>
      applySaviors({
        entries,
        state: state({ current: 12, saviors: 1 }),
        dates: ['2026-05-13', '2026-05-14'],
        today: '2026-05-15',
      }),
    ).toThrow();
  });

  it('rejects saving a day that is not part of the current gap', () => {
    const entries = indexEntries(twelve);
    expect(() =>
      applySaviors({
        entries,
        state: state({ current: 12, saviors: 2 }),
        dates: ['2026-04-01'],
        today: '2026-05-14',
      }),
    ).toThrow();
  });

  it('a missed day across a month boundary can be saved', () => {
    const entries = indexEntries(wonRange('2026-04-20', 11)); // ends Apr 30
    const s = grantMonthlySavior(
      state({ current: 11, saviors: 0, lastSaviorGrantMonth: '2026-04' }),
      '2026-05-02',
    );
    expect(s.saviors).toBe(1);
    expect(evaluateMissedDays({ entries, state: s, today: '2026-05-02' })).toEqual({
      kind: 'offer',
      missed: ['2026-05-01'],
      streak: 11,
      saviors: 1,
    });
  });
});
