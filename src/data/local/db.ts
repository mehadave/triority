import { Dexie, type EntityTable } from 'dexie';
import type { DayEntry, StreakState } from '../../domain/types';
import type { Settings } from '../../domain/schema';

export const SINGLETON = 'me';

export type StreakRow = StreakState & { id: typeof SINGLETON };
export type SettingsRow = Settings & { id: typeof SINGLETON };

export class TriorityDB extends Dexie {
  day_entries!: EntityTable<DayEntry, 'date'>;
  streak_state!: EntityTable<StreakRow, 'id'>;
  settings!: EntityTable<SettingsRow, 'id'>;

  constructor(name = 'triority') {
    super(name);
    this.version(1).stores({
      day_entries: 'date',
      streak_state: 'id',
      settings: 'id',
    });
  }
}
