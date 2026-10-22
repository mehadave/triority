import { useAuth } from '../state/auth';

type RemoteModule = typeof import('./remote/remote');

let remote: Promise<RemoteModule> | null = null;

export function isRemoteConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/** Loads the account code (and the Supabase client) on demand. Guests never fetch it. */
export function loadRemote(): Promise<RemoteModule> {
  remote ??= import('./remote/remote').then(async (mod) => {
    await mod.init();
    return mod;
  });
  return remote;
}

function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) return true;
    }
  } catch {
    // Storage blocked: behave as a guest.
  }
  return false;
}

function isAuthRedirect(): boolean {
  const { search, hash } = window.location;
  return /[?&]code=/.test(search) || /access_token=|error_description=/.test(hash);
}

/** Restore a signed-in session at startup if one exists. */
export function bootSession(): void {
  if (!isRemoteConfigured() || !(hasStoredSession() || isAuthRedirect())) return;
  useAuth.getState().setChecking();
  loadRemote().catch(() => useAuth.getState().setGuest());
}
