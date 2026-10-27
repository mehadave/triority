import { createContext, useContext, type ReactNode } from 'react';
import type { DataHooks, EntriesRepository } from './repository';
import { createLocalHooks, LocalRepo } from './local/LocalRepo';

export const localRepo = new LocalRepo();
const value: DataContextValue = { repo: localRepo, hooks: createLocalHooks(localRepo) };

interface DataContextValue {
  repo: EntriesRepository;
  hooks: DataHooks;
}

const DataContext = createContext<DataContextValue | null>(null);

/** Everything lives on this device for now; a synced repository can slot in here later. */
export function DataProvider({ children }: { children: ReactNode }) {
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
