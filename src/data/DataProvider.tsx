import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '../state/auth';
import type { DataHooks, EntriesRepository } from './repository';
import { createLocalHooks, LocalRepo } from './local/LocalRepo';

export const localRepo = new LocalRepo();
const localHooks = createLocalHooks(localRepo);

interface DataContextValue {
  repo: EntriesRepository;
  hooks: DataHooks;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const session = useAuth((s) => s.session);
  const value = useMemo<DataContextValue>(
    () =>
      session
        ? { repo: session.repo, hooks: session.hooks }
        : { repo: localRepo, hooks: localHooks },
    [session],
  );
  // Keyed so switching between guest and account storage remounts the data hooks cleanly.
  return (
    <DataContext.Provider value={value} key={session ? `remote:${session.user.id}` : 'local'}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
