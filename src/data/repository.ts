import type { MissedDays } from '../domain/streak';
import type { DateKey, DayEntry, StreakState } from '../domain/types';
import type { ExportData, Settings } from '../domain/schema';

/**
 * Everything the UI needs from storage. Guests get the IndexedDB implementation,
 * signed-in users get the server-backed one. UI code only ever talks to this.
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
  deleteAll(): Promise<void>;
}

/** Reactive reads. The local flavour uses live IndexedDB queries, the remote one a query cache. */
export interface DataHooks {
  useEntries(): DayEntry[] | undefined;
  useStreakState(): StreakState | undefined;
  useSettings(): Settings | undefined;
}
