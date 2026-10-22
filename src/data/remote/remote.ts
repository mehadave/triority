import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';
import { useAuth } from '../../state/auth';
import { useUi } from '../../state/ui';
import { localRepo } from '../DataProvider';
import { SupabaseRepo } from './SupabaseRepo';

let client: SupabaseClient | null = null;
let activeUser: string | null = null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, networkMode: 'online', refetchOnWindowFocus: true },
    mutations: { networkMode: 'online' },
  },
});

function db(): SupabaseClient {
  if (!client) throw new Error('Accounts are not set up.');
  return client;
}

/** Move guest history into the account once, then clear the on-device copy. */
async function importGuestData(repo: SupabaseRepo): Promise<void> {
  if (!(await localRepo.hasData())) return;
  const data = await localRepo.exportAll();
  const { error } = await db().rpc('import_local_entries', {
    entries: data.entries.map((e) => ({ date: e.date, tasks: e.tasks })),
    saved_dates: data.streak.savedDates,
  });
  if (error) throw new Error(error.message);
  const remoteSettings = await repo.getSettings();
  if (
    remoteSettings.customAffirmations.length === 0 &&
    data.settings.customAffirmations.length > 0
  ) {
    await repo.updateSettings({
      customAffirmations: data.settings.customAffirmations,
      reminderTime: remoteSettings.reminderTime ?? data.settings.reminderTime,
    });
  }
  await localRepo.deleteAll();
  useUi.getState().showToast('Moved your history to your account');
}

async function applySession(session: Session | null): Promise<void> {
  const auth = useAuth.getState();
  if (!session) {
    activeUser = null;
    queryClient.clear();
    auth.setGuest();
    return;
  }
  if (activeUser === session.user.id && auth.status === 'signedIn') return;
  activeUser = session.user.id;

  const repo = new SupabaseRepo(db(), session.user.id, queryClient);
  try {
    await repo.syncTimeZone();
  } catch {
    // Non-fatal; the server falls back to UTC.
  }
  try {
    await importGuestData(repo);
  } catch {
    useUi.getState().showToast('Couldn’t move your history yet. We’ll try again next time.');
  }
  auth.setSignedIn({
    user: { id: session.user.id, email: session.user.email ?? null },
    repo,
    hooks: repo.hooks(),
  });
}

export async function init(): Promise<void> {
  if (client) return;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Accounts are not set up.');
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  const { data } = await client.auth.getSession();
  await applySession(data.session);
  client.auth.onAuthStateChange((event, session) => {
    // Defer: calling Supabase from inside this callback can deadlock the auth lock.
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      window.setTimeout(() => void applySession(session), 0);
    }
  });
}

function redirectTo(): string {
  return `${window.location.origin}/auth`;
}

export async function signInWithPassword(email: string, password: string, captchaToken?: string) {
  const { error } = await db().auth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error) throw new Error(error.message);
}

export async function signUp(email: string, password: string, captchaToken?: string) {
  const { data, error } = await db().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo(), ...(captchaToken ? { captchaToken } : {}) },
  });
  if (error) throw new Error(error.message);
  return { needsConfirmation: !data.session };
}

export async function signInWithGoogle() {
  const { error } = await db().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo() },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await db().auth.signOut({ scope: 'local' });
}

export async function deleteAccount() {
  const { error } = await db().rpc('delete_my_account');
  if (error) throw new Error(error.message);
  await signOut();
}
