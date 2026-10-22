import { useOnline } from '../lib/useOnline';
import { useAuth } from '../state/auth';

/** Signed-in data lives on the server, so edits pause while offline. */
export function OfflineNote() {
  const online = useOnline();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  if (online || !signedIn) return null;
  return (
    <p
      role="status"
      className="border-ink bg-paper fixed inset-x-3 top-[max(3.5rem,calc(env(safe-area-inset-top)+3rem))] z-30 mx-auto max-w-md rounded-2xl border-2 px-4 py-2 text-center text-[14px] md:top-24"
    >
      You’re offline. Changes will save when you reconnect.
    </p>
  );
}

export function useCanEdit(): boolean {
  const online = useOnline();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return online || !signedIn;
}
