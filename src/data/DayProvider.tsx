import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { computeStreak, effectiveToday, indexEntries } from '../domain/streak';
import type { DateKey, DayEntry, StreakState } from '../domain/types';
import type { Settings } from '../domain/schema';
import { useDeviceToday } from '../lib/useToday';
import { useData } from './DataProvider';

export interface DayState {
  loaded: boolean;
  today: DateKey;
  entries: ReadonlyMap<DateKey, DayEntry>;
  todayEntry: DayEntry | undefined;
  state: StreakState | undefined;
  settings: Settings | undefined;
  streak: { current: number; best: number };
}

const DayContext = createContext<DayState | null>(null);

export function DayProvider({ children }: { children: ReactNode }) {
  const { hooks } = useData();
  const list = hooks.useEntries();
  const state = hooks.useStreakState();
  const settings = hooks.useSettings();
  const deviceToday = useDeviceToday();

  const value = useMemo<DayState>(() => {
    const entries = indexEntries(list ?? []);
    const today = effectiveToday(deviceToday, entries);
    const computed = state
      ? computeStreak({ entries, savedDates: state.savedDates, today })
      : { current: 0, best: 0 };
    return {
      loaded: list !== undefined && state !== undefined,
      today,
      entries,
      todayEntry: entries.get(today),
      state,
      settings,
      streak: { current: computed.current, best: Math.max(computed.best, state?.best ?? 0) },
    };
  }, [list, state, settings, deviceToday]);

  return <DayContext.Provider value={value}>{children}</DayContext.Provider>;
}

export function useDay(): DayState {
  const ctx = useContext(DayContext);
  if (!ctx) throw new Error('useDay must be used inside DayProvider');
  return ctx;
}
