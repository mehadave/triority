import { combineBackup, type ImportMode } from '../../domain/backup';
import { useLiveQuery } from 'dexie-react-hooks';
import { createDay, editTaskText, toggleTask } from '../../domain/entries';
import {
  applySaviors,
  declineSaviors,
  evaluateMissedDays,
  grantMonthlySavior,
  indexEntries,
  initialStreakState,
  refreshStreak,
} from '../../domain/streak';
import {
  defaultSettings,
  settingsSchema,
  type ExportData,
  type Settings,
} from '../../domain/schema';
import type { DateKey, DayEntry, StreakState } from '../../domain/types';
import type { DataHooks, EntriesRepository } from '../repository';
import { SINGLETON, TriorityDB } from './db';

function strip<T extends { id: string }>(row: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = row;
  return rest;
}

export class LocalRepo implements EntriesRepository {
  readonly kind = 'local' as const;

  constructor(readonly db: TriorityDB = new TriorityDB()) {}

  async listEntries(): Promise<DayEntry[]> {
    return this.db.day_entries.orderBy('date').toArray();
  }

  async getStreakState(): Promise<StreakState> {
    const row = await this.db.streak_state.get(SINGLETON);
    return row ? strip(row) : initialStreakState;
  }

  async getSettings(): Promise<Settings> {
    const row = await this.db.settings.get(SINGLETON);
    return row ? strip(row) : defaultSettings;
  }

  private async putStreak(state: StreakState): Promise<void> {
    await this.db.streak_state.put({ ...state, id: SINGLETON });
  }

  private async withStreak(
    fn: (state: StreakState, entries: Map<DateKey, DayEntry>) => StreakState,
  ): Promise<StreakState> {
    return this.db.transaction('rw', this.db.day_entries, this.db.streak_state, async () => {
      const [state, list] = await Promise.all([this.getStreakState(), this.listEntries()]);
      const next = fn(state, indexEntries(list));
      if (next !== state) await this.putStreak(next);
      return next;
    });
  }

  async openDay(today: DateKey) {
    let result = evaluateMissedDays({ entries: new Map(), state: initialStreakState, today });
    await this.withStreak((state, entries) => {
      const granted = grantMonthlySavior(state, today);
      result = evaluateMissedDays({ entries, state: granted, today });
      return granted;
    });
    return result;
  }

  async useSaviors(dates: DateKey[], today: DateKey): Promise<void> {
    await this.withStreak((state, entries) => applySaviors({ entries, state, dates, today }));
  }

  async declineSaviors(today: DateKey): Promise<void> {
    await this.withStreak((state, entries) => refreshStreak(declineSaviors(state), entries, today));
  }

  private async writeEntry(
    today: DateKey,
    update: (existing: DayEntry | undefined, now: string) => DayEntry,
  ): Promise<DayEntry> {
    return this.db.transaction('rw', this.db.day_entries, this.db.streak_state, async () => {
      const existing = await this.db.day_entries.get(today);
      const entry = update(existing, new Date().toISOString());
      await this.db.day_entries.put(entry);
      const [state, list] = await Promise.all([this.getStreakState(), this.listEntries()]);
      const next = refreshStreak(state, indexEntries(list), today);
      if (next !== state) await this.putStreak(next);
      return entry;
    });
  }

  createDay(today: DateKey, texts: string[]): Promise<DayEntry> {
    return this.writeEntry(today, (existing, now) => {
      if (existing) throw new Error('Today already has its three.');
      return createDay(today, texts, now);
    });
  }

  toggleTask(today: DateKey, index: number): Promise<DayEntry> {
    return this.writeEntry(today, (existing, now) => {
      if (!existing) throw new Error('No tasks for today yet.');
      return toggleTask(existing, index, today, now);
    });
  }

  editTask(today: DateKey, index: number, text: string): Promise<DayEntry> {
    return this.writeEntry(today, (existing, now) => {
      if (!existing) throw new Error('No tasks for today yet.');
      return editTaskText(existing, index, text, today, now);
    });
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const next = settingsSchema.parse({ ...(await this.getSettings()), ...patch });
    await this.db.settings.put({ ...next, id: SINGLETON });
    return next;
  }

  async exportAll(): Promise<ExportData> {
    const [entries, streak, settings] = await Promise.all([
      this.listEntries(),
      this.getStreakState(),
      this.getSettings(),
    ]);
    return {
      app: 'triority',
      version: 1,
      exportedAt: new Date().toISOString(),
      entries,
      streak,
      settings,
    };
  }

  async importBackup(data: ExportData, mode: ImportMode, today: DateKey): Promise<void> {
    const { day_entries, streak_state, settings } = this.db;
    await this.db.transaction('rw', day_entries, streak_state, settings, async () => {
      const [entries, streak, current] = await Promise.all([
        this.listEntries(),
        this.getStreakState(),
        this.getSettings(),
      ]);
      const next = combineBackup({
        current: { entries, streak, settings: current },
        incoming: data,
        mode,
        today,
      });
      await Promise.all([day_entries.clear(), streak_state.clear(), settings.clear()]);
      await day_entries.bulkPut(next.entries);
      await streak_state.put({ ...next.streak, id: SINGLETON });
      await settings.put({ ...settingsSchema.parse(next.settings), id: SINGLETON });
    });
  }

  async deleteAll(): Promise<void> {
    await this.db.transaction(
      'rw',
      this.db.day_entries,
      this.db.streak_state,
      this.db.settings,
      async () => {
        await Promise.all([
          this.db.day_entries.clear(),
          this.db.streak_state.clear(),
          this.db.settings.clear(),
        ]);
      },
    );
  }

  async hasData(): Promise<boolean> {
    return (await this.db.day_entries.count()) > 0;
  }
}

export function createLocalHooks(repo: LocalRepo): DataHooks {
  return {
    useEntries: () => useLiveQuery(() => repo.listEntries(), []),
    useStreakState: () => useLiveQuery(() => repo.getStreakState(), []),
    useSettings: () => useLiveQuery(() => repo.getSettings(), []),
  };
}
