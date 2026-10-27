import { addDays, compareKeys } from './dates';
import { doneCount } from './entries';
import { exportSchema, type ExportData, type Settings } from './schema';
import { indexEntries, isDayWon, refreshStreak } from './streak';
import {
  MAX_CUSTOM_AFFIRMATIONS,
  MAX_SAVIORS,
  type DateKey,
  type DayEntry,
  type StreakState,
} from './types';

export type ImportMode = 'replace' | 'merge';

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const MAX_BYTES = 5_000_000;
const MAX_ENTRIES = 20_000;

/** Read a backup file's text. Throws a friendly BackupError for anything that isn't a valid backup. */
export function parseBackup(text: string): ExportData {
  if (text.length > MAX_BYTES)
    throw new BackupError('That file is too big to be a Triority backup.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file isn’t a Triority backup.');
  }
  if (typeof raw !== 'object' || raw === null || (raw as { app?: unknown }).app !== 'triority') {
    throw new BackupError('That file isn’t a Triority backup.');
  }
  if ((raw as { version?: unknown }).version !== 1) {
    throw new BackupError('This backup is from a newer version of Triority.');
  }
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success) throw new BackupError('This backup looks damaged, so nothing was changed.');
  const data = parsed.data;
  if (data.entries.length > MAX_ENTRIES)
    throw new BackupError('That backup has too many days in it.');
  if (new Set(data.entries.map((e) => e.date)).size !== data.entries.length) {
    throw new BackupError('This backup looks damaged, so nothing was changed.');
  }
  return data;
}

export interface Snapshot {
  entries: DayEntry[];
  streak: StreakState;
  settings: Settings;
}

/** Of two versions of the same day, keep the one with more done; on a tie, the newer edit. */
function betterEntry(a: DayEntry, b: DayEntry): DayEntry {
  const diff = doneCount(a) - doneCount(b);
  if (diff !== 0) return diff > 0 ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

function mergeAffirmations(
  current: Settings['customAffirmations'],
  incoming: Settings['customAffirmations'],
) {
  const seenIds = new Set(current.map((a) => a.id));
  const seenText = new Set(current.map((a) => a.text.trim().toLowerCase()));
  const merged = [...current];
  for (const a of incoming) {
    const key = a.text.trim().toLowerCase();
    if (seenIds.has(a.id) || seenText.has(key)) continue;
    if (merged.length >= MAX_CUSTOM_AFFIRMATIONS) break;
    merged.push(a);
    seenIds.add(a.id);
    seenText.add(key);
  }
  return merged;
}

/**
 * Combine what's on the device with a backup. Days from the future are ignored, saved days
 * must be real gaps, and the streak is recomputed rather than trusted from the file.
 */
export function combineBackup({
  current,
  incoming,
  mode,
  today,
}: {
  current: Snapshot;
  incoming: ExportData;
  mode: ImportMode;
  today: DateKey;
}): Snapshot {
  const latestAllowed = addDays(today, 1);
  const incomingEntries = incoming.entries.filter((e) => compareKeys(e.date, latestAllowed) <= 0);

  let entries: DayEntry[];
  let settings: Settings;
  let base: StreakState;

  if (mode === 'replace') {
    entries = incomingEntries;
    settings = incoming.settings;
    base = {
      ...incoming.streak,
      saviors: Math.min(MAX_SAVIORS, Math.max(0, incoming.streak.saviors)),
    };
  } else {
    const byDate = new Map(current.entries.map((e) => [e.date, e]));
    for (const e of incomingEntries) {
      const existing = byDate.get(e.date);
      byDate.set(e.date, existing ? betterEntry(existing, e) : e);
    }
    entries = [...byDate.values()];
    settings = {
      reminderTime: current.settings.reminderTime ?? incoming.settings.reminderTime,
      customAffirmations: mergeAffirmations(
        current.settings.customAffirmations,
        incoming.settings.customAffirmations,
      ),
    };
    // Saviors are earned on this device; a backup can't add more.
    base = {
      ...current.streak,
      best: Math.max(current.streak.best, incoming.streak.best),
      savedDates: [...current.streak.savedDates, ...incoming.streak.savedDates],
    };
  }

  entries.sort((a, b) => compareKeys(a.date, b.date));
  const index = indexEntries(entries);
  const savedDates = [...new Set(base.savedDates)]
    .filter((d) => compareKeys(d, today) < 0 && !isDayWon(index.get(d)))
    .sort(compareKeys);

  const streak = refreshStreak({ ...base, savedDates }, index, today);
  return { entries, settings, streak };
}
