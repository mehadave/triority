import { create } from 'zustand';
import type { DataHooks, EntriesRepository } from '../data/repository';

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface RemoteSession {
  user: AuthUser;
  repo: EntriesRepository;
  hooks: DataHooks;
}

interface AuthState {
  status: 'guest' | 'checking' | 'signedIn';
  session: RemoteSession | null;
  setChecking(): void;
  setGuest(): void;
  setSignedIn(session: RemoteSession): void;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'guest',
  session: null,
  setChecking: () => set({ status: 'checking' }),
  setGuest: () => set({ status: 'guest', session: null }),
  setSignedIn: (session) => set({ status: 'signedIn', session }),
}));
