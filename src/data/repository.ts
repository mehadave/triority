import type { MissedDays } from '../domain/streak';
import type { DateKey, DayEntry, StreakState } from '../domain/types';
import type { ExportData, Settings } from '../domain/schema';
import type { ImportMode } from '../domain/backup';

/**
 * Everything the UI needs from storage. Today that's IndexedDB on the device; a synced
 * implementation can be added later without touching the UI, which only talks to this.
 */
export interface EntriesRepository {
  readonly kind: 'local' | 'remote';

  listEntries(): Promise<DayEntry[]>;
  getStreakState(): Promise<StreakState>;
  getSettings(): Promise<Settings>;

  /** Grant this month's savior if due, then report any missed days to ask about. */
  openDay(today: DateKey): Promise<MissedDays>;
  useSaviors(dates: DateKey[], today: DateKey): Promise<void>;
  declineSaviors(today: DateKey): Promise<void>;

  createDay(today: DateKey, texts: string[]): Promise<DayEntry>;
  toggleTask(today: DateKey, index: number): Promise<DayEntry>;
  editTask(today: DateKey, index: number, text: string): Promise<DayEntry>;

  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  exportAll(): Promise<ExportData>;
  /** Apply an already-parsed backup, replacing or merging with what's here. */
  importBackup(data: ExportData, mode: ImportMode, today: DateKey): Promise<void>;
  deleteAll(): Promise<void>;
}

/** Reactive reads. The local flavour uses live IndexedDB queries, the remote one a query cache. */
export interface DataHooks {
  useEntries(): DayEntry[] | undefined;
  useStreakState(): StreakState | undefined;
  useSettings(): Settings | undefined;
}
