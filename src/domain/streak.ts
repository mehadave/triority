import { addDays, compareKeys, monthOf, monthsBetween } from './dates';
import {
  MAX_SAVIORS,
  TASKS_PER_DAY,
  type DateKey,
  type DayEntry,
  type EntryIndex,
  type StreakState,
} from './types';

export function indexEntries(entries: readonly DayEntry[]): Map<DateKey, DayEntry> {
  return new Map(entries.map((e) => [e.date, e]));
}

/** Won = exactly 3 tasks entered and all 3 ticked. Ticks are only accepted on the day itself. */
export function isDayWon(entry: DayEntry | undefined): boolean {
  if (!entry || entry.tasks.length !== TASKS_PER_DAY) return false;
  return entry.tasks.every((t) => t.done && t.text.trim().length > 0);
}

/**
 * The day the app treats as today. If the device clock moved west after a day was
 * already entered further east, keep showing that day rather than skipping back.
 */
export function effectiveToday(deviceToday: DateKey, entries: EntryIndex): DateKey {
  let latest = deviceToday;
  for (const key of entries.keys()) if (compareKeys(key, latest) > 0) latest = key;
  return latest;
}

/** Length of the run ending on `end` (inclusive). Saved days bridge but do not count. */
function runEndingOn(end: DateKey, entries: EntryIndex, saved: ReadonlySet<DateKey>): number {
  let count = 0;
  let sawWin = false;
  for (let key = end; ; key = addDays(key, -1)) {
    if (isDayWon(entries.get(key))) {
      count += 1;
      sawWin = true;
    } else if (!saved.has(key)) {
      break;
    }
  }
  return sawWin ? count : 0;
}

export interface StreakInput {
  entries: EntryIndex;
  savedDates: readonly DateKey[];
  today: DateKey;
}

export function computeStreak({ entries, savedDates, today }: StreakInput): {
  current: number;
  best: number;
} {
  const saved = new Set(savedDates);
  const current = isDayWon(entries.get(today))
    ? runEndingOn(today, entries, saved)
    : runEndingOn(addDays(today, -1), entries, saved);

  const keys = [...entries.keys(), ...saved]
    .filter((k) => compareKeys(k, today) <= 0)
    .sort(compareKeys);
  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const key of keys) {
    if (key === prev) continue;
    const contiguous = prev !== null && addDays(prev, 1) === key;
    if (isDayWon(entries.get(key))) {
      run = contiguous ? run + 1 : 1;
    } else if (saved.has(key)) {
      if (!contiguous) run = 0;
    } else {
      run = 0;
    }
    best = Math.max(best, run);
    prev = key;
  }
  return { current, best: Math.max(best, current) };
}

export function grantMonthlySavior(state: StreakState, today: DateKey): StreakState {
  const month = monthOf(today);
  if (state.lastSaviorGrantMonth === month) return state;
  const grants =
    state.lastSaviorGrantMonth === null ? 1 : monthsBetween(state.lastSaviorGrantMonth, month);
  if (grants <= 0) return state;
  return {
    ...state,
    saviors: Math.min(MAX_SAVIORS, state.saviors + grants),
    lastSaviorGrantMonth: month,
  };
}

export type MissedDays =
  | { kind: 'none' }
  | { kind: 'offer'; missed: DateKey[]; streak: number; saviors: number }
  | { kind: 'reset'; missed: DateKey[]; streak: number };

/** Unwon, unsaved days between the last won/saved day and yesterday, up to `limit`. */
function gapBeforeToday(
  entries: EntryIndex,
  saved: ReadonlySet<DateKey>,
  today: DateKey,
  limit: number,
): { missed: DateKey[]; lastKept: DateKey | null } {
  const missed: DateKey[] = [];
  for (let key = addDays(today, -1); missed.length <= limit; key = addDays(key, -1)) {
    if (isDayWon(entries.get(key)) || saved.has(key))
      return { missed: missed.reverse(), lastKept: key };
    missed.push(key);
  }
  return { missed: missed.reverse(), lastKept: null };
}

function latestWinBefore(entries: EntryIndex, today: DateKey): DateKey | null {
  let latest: DateKey | null = null;
  for (const [key, entry] of entries) {
    if (compareKeys(key, today) < 0 && isDayWon(entry) && (!latest || compareKeys(key, latest) > 0))
      latest = key;
  }
  return latest;
}

/**
 * Decide what to ask on open. Only asks while a streak is still standing (`state.current > 0`):
 * after the user declines, or after a reset, `current` is 0 and the question never repeats.
 */
export function evaluateMissedDays({
  entries,
  state,
  today,
}: {
  entries: EntryIndex;
  state: StreakState;
  today: DateKey;
}): MissedDays {
  if (state.current <= 0 || isDayWon(entries.get(today))) return { kind: 'none' };
  const saved = new Set(state.savedDates);
  const { missed, lastKept } = gapBeforeToday(entries, saved, today, MAX_SAVIORS);
  if (missed.length === 0) return { kind: 'none' };
  if (!lastKept) {
    // Gap longer than any bank of saviors. Only a real run before it is worth mentioning.
    const lastWin = latestWinBefore(entries, today);
    const streak = lastWin ? runEndingOn(lastWin, entries, saved) : 0;
    return streak > 0 ? { kind: 'reset', missed, streak } : { kind: 'none' };
  }
  const streak = runEndingOn(lastKept, entries, saved);
  if (streak === 0) return { kind: 'none' };
  if (missed.length <= state.saviors) {
    return { kind: 'offer', missed, streak, saviors: state.saviors };
  }
  return { kind: 'reset', missed, streak };
}

export class SaviorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaviorError';
  }
}

export function applySaviors({
  entries,
  state,
  dates,
  today,
}: {
  entries: EntryIndex;
  state: StreakState;
  dates: readonly DateKey[];
  today: DateKey;
}): StreakState {
  const unique = [...new Set(dates)].sort(compareKeys);
  if (unique.length === 0) throw new SaviorError('No days to save.');
  if (unique.length > state.saviors) throw new SaviorError('Not enough saviors.');
  const offer = evaluateMissedDays({ entries, state, today });
  if (offer.kind !== 'offer') throw new SaviorError('There is nothing to save.');
  const missed = new Set(offer.missed);
  if (!unique.every((d) => missed.has(d))) throw new SaviorError('Only missed days can be saved.');

  const savedDates = [...state.savedDates, ...unique].sort(compareKeys);
  const { current, best } = computeStreak({ entries, savedDates, today });
  return {
    ...state,
    saviors: state.saviors - unique.length,
    savedDates,
    current,
    best: Math.max(state.best, best),
  };
}

export function declineSaviors(state: StreakState): StreakState {
  return { ...state, current: 0 };
}

/** Recompute stored numbers after an entry changes. */
export function refreshStreak(
  state: StreakState,
  entries: EntryIndex,
  today: DateKey,
): StreakState {
  const { current, best } = computeStreak({ entries, savedDates: state.savedDates, today });
  // A standing streak stays "standing" while a savior decision is pending.
  const pending = evaluateMissedDays({ entries, state, today }).kind !== 'none';
  const nextCurrent = pending ? state.current : current;
  const nextBest = Math.max(state.best, best);
  if (nextCurrent === state.current && nextBest === state.best) return state;
  return { ...state, current: nextCurrent, best: nextBest };
}

export const initialStreakState: StreakState = {
  current: 0,
  best: 0,
  saviors: 0,
  lastSaviorGrantMonth: null,
  savedDates: [],
};
