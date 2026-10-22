import type { SupabaseClient } from '@supabase/supabase-js';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { createDay, editTaskText, toggleTask } from '../../domain/entries';
import {
  dayEntrySchema,
  defaultSettings,
  settingsSchema,
  streakStateSchema,
  type ExportData,
  type Settings,
} from '../../domain/schema';
import {
  evaluateMissedDays,
  indexEntries,
  initialStreakState,
  isDayWon,
} from '../../domain/streak';
import type { DateKey, DayEntry, StreakState } from '../../domain/types';
import type { DataHooks, EntriesRepository } from '../repository';

interface EntryRow {
  date: string;
  tasks: unknown;
  updated_at: string;
}

interface StreakRow {
  current: number;
  best: number;
  saviors: number;
  last_savior_grant_month: string | null;
  saved_dates: string[] | null;
}

interface SettingsRow {
  reminder_time: string | null;
  custom_affirmations: unknown;
}

function toEntry(row: EntryRow): DayEntry | null {
  const parsed = dayEntrySchema.safeParse({
    date: row.date,
    tasks: row.tasks,
    updatedAt: row.updated_at,
  });
  return parsed.success ? parsed.data : null;
}

function toStreak(row: StreakRow | null): StreakState {
  if (!row) return initialStreakState;
  return streakStateSchema.parse({
    current: row.current,
    best: row.best,
    saviors: row.saviors,
    lastSaviorGrantMonth: row.last_savior_grant_month,
    savedDates: row.saved_dates ?? [],
  });
}

function toSettings(row: SettingsRow | null): Settings {
  if (!row) return defaultSettings;
  const parsed = settingsSchema.safeParse({
    reminderTime: row.reminder_time ? row.reminder_time.slice(0, 5) : null,
    customAffirmations: row.custom_affirmations ?? [],
  });
  return parsed.success ? parsed.data : defaultSettings;
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Signed-in storage. The server is the source of truth and owns every streak number. */
export class SupabaseRepo implements EntriesRepository {
  readonly kind = 'remote' as const;
  private readonly keys;

  constructor(
    private readonly db: SupabaseClient,
    private readonly userId: string,
    readonly queryClient: QueryClient,
  ) {
    this.keys = {
      entries: ['entries', userId] as const,
      streak: ['streak', userId] as const,
      settings: ['settings', userId] as const,
    };
  }

  async listEntries(): Promise<DayEntry[]> {
    const rows = check(
      await this.db
        .from('day_entries')
        .select('date, tasks, updated_at')
        .order('date', { ascending: true }),
    ) as EntryRow[];
    return rows.map(toEntry).filter((e): e is DayEntry => e !== null);
  }

  async getStreakState(): Promise<StreakState> {
    const row = check(
      await this.db
        .from('streak_state')
        .select('current, best, saviors, last_savior_grant_month, saved_dates')
        .maybeSingle(),
    ) as StreakRow | null;
    return toStreak(row);
  }

  async getSettings(): Promise<Settings> {
    const row = check(
      await this.db
        .from('user_settings')
        .select('reminder_time, custom_affirmations')
        .maybeSingle(),
    ) as SettingsRow | null;
    return toSettings(row);
  }

  private async rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    return check(await this.db.rpc(fn, args)) as T;
  }

  private refreshStreak() {
    return this.queryClient.invalidateQueries({ queryKey: this.keys.streak });
  }

  private async cachedEntries(): Promise<DayEntry[]> {
    return this.queryClient.getQueryData<DayEntry[]>(this.keys.entries) ?? this.listEntries();
  }

  async openDay(today: DateKey) {
    const row = await this.rpc<StreakRow | StreakRow[]>('grant_monthly_savior');
    const state = toStreak(Array.isArray(row) ? (row[0] ?? null) : row);
    this.queryClient.setQueryData(this.keys.streak, state);
    const entries = indexEntries(await this.cachedEntries());
    return evaluateMissedDays({ entries, state, today });
  }

  async useSaviors(dates: DateKey[]): Promise<void> {
    await this.rpc('use_saviors', { dates });
    await this.refreshStreak();
  }

  async declineSaviors(): Promise<void> {
    await this.rpc('decline_saviors');
    await this.refreshStreak();
  }

  private async writeTasks(next: DayEntry, insert: boolean): Promise<DayEntry> {
    const entry = dayEntrySchema.parse(next);
    const before = this.queryClient.getQueryData<DayEntry[]>(this.keys.entries);
    // Optimistic: the cache updates before the network round trip.
    this.queryClient.setQueryData<DayEntry[]>(this.keys.entries, (list = []) =>
      [...list.filter((e) => e.date !== entry.date), entry].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    try {
      if (insert) {
        check(
          await this.db
            .from('day_entries')
            .insert({ user_id: this.userId, date: entry.date, tasks: entry.tasks }),
        );
      } else {
        check(
          await this.db
            .from('day_entries')
            .update({ tasks: entry.tasks })
            .eq('user_id', this.userId)
            .eq('date', entry.date),
        );
      }
      if (isDayWon(entry)) await this.rpc('complete_day', { p_date: entry.date });
      return entry;
    } catch (err) {
      this.queryClient.setQueryData(this.keys.entries, before);
      throw err;
    } finally {
      void this.queryClient.invalidateQueries({ queryKey: this.keys.entries });
      void this.refreshStreak();
    }
  }

  private async existing(today: DateKey): Promise<DayEntry> {
    const entry = (await this.cachedEntries()).find((e) => e.date === today);
    if (!entry) throw new Error('No tasks for today yet.');
    return entry;
  }

  async createDay(today: DateKey, texts: string[]): Promise<DayEntry> {
    return this.writeTasks(createDay(today, texts, new Date().toISOString()), true);
  }

  async toggleTask(today: DateKey, index: number): Promise<DayEntry> {
    const entry = await this.existing(today);
    return this.writeTasks(toggleTask(entry, index, today, new Date().toISOString()), false);
  }

  async editTask(today: DateKey, index: number, text: string): Promise<DayEntry> {
    const entry = await this.existing(today);
    return this.writeTasks(
      editTaskText(entry, index, text, today, new Date().toISOString()),
      false,
    );
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const next = settingsSchema.parse({ ...(await this.getSettings()), ...patch });
    check(
      await this.db.from('user_settings').upsert(
        {
          user_id: this.userId,
          reminder_time: next.reminderTime,
          custom_affirmations: next.customAffirmations,
        },
        { onConflict: 'user_id' },
      ),
    );
    this.queryClient.setQueryData(this.keys.settings, next);
    return next;
  }

  async syncTimeZone(): Promise<void> {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) return;
    check(
      await this.db
        .from('user_settings')
        .upsert({ user_id: this.userId, time_zone: timeZone }, { onConflict: 'user_id' }),
    );
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

  async deleteAll(): Promise<void> {
    await this.rpc('delete_my_data');
    await this.queryClient.invalidateQueries();
  }

  hooks(): DataHooks {
    const qc = this.queryClient;
    return {
      useEntries: () =>
        useQuery({ queryKey: this.keys.entries, queryFn: () => this.listEntries() }, qc).data,
      useStreakState: () =>
        useQuery({ queryKey: this.keys.streak, queryFn: () => this.getStreakState() }, qc).data,
      useSettings: () =>
        useQuery({ queryKey: this.keys.settings, queryFn: () => this.getSettings() }, qc).data,
    };
  }
}
