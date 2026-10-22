import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Dialog } from '../components/Dialog';
import { useCanEdit } from '../components/OfflineNote';
import { useData } from '../data/DataProvider';
import { useDay } from '../data/DayProvider';
import { loadRemote } from '../data/session';
import { useAuth } from '../state/auth';
import { useUi } from '../state/ui';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `extras-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="border-hairline border-b py-6 last:border-b-0">
      <h2 id={id} className="text-muted-ink mb-3 text-[14px] font-medium tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

type Confirm = 'data' | 'account' | null;

export function ExtrasScreen() {
  const { repo } = useData();
  const { settings, today } = useDay();
  const auth = useAuth();
  const canEdit = useCanEdit();
  const toast = useUi((s) => s.showToast);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const exportData = async () => {
    const data = await repo.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triority-export-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runConfirmed = async () => {
    setBusy(true);
    try {
      if (confirm === 'data') {
        await repo.deleteAll();
        try {
          localStorage.removeItem('triority:asked-on');
        } catch {
          // ignore
        }
        toast('All your data is gone. Fresh page.');
      } else if (confirm === 'account') {
        const remote = await loadRemote();
        await remote.deleteAccount();
        toast('Your account has been deleted.');
      }
      setConfirm(null);
    } catch {
      toast('That didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    const remote = await loadRemote();
    await remote.signOut();
    toast('Signed out. You’re in guest mode on this device.');
  };

  return (
    <div className="flex flex-1 flex-col py-4">
      <h1 className="title">Extras</h1>
      <div className="mx-auto mt-4 w-full max-w-md">
        <Section title="Account">
          {auth.status === 'signedIn' && auth.session ? (
            <div className="flex flex-col gap-3">
              <p className="text-[16px]">
                Signed in as{' '}
                <span className="font-medium break-all">{auth.session.user.email}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-ghost" onClick={signOut}>
                  Sign out
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setConfirm('account')}
                  disabled={!canEdit}
                >
                  Delete account
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-[16px]">
                {auth.status === 'checking'
                  ? 'Checking your account…'
                  : 'You’re using Triority on this device only. Sign in to keep your history across devices.'}
              </p>
              <Link to="/auth" className="btn-sun">
                Sign in
              </Link>
            </div>
          )}
        </Section>

        <Section title="Reminder">
          <label className="flex items-center justify-between gap-4">
            <span className="text-[16px]">Daily reminder time</span>
            <input
              type="time"
              className="ink-input w-36 text-center"
              value={settings?.reminderTime ?? ''}
              disabled={!canEdit}
              onChange={(e) => void repo.updateSettings({ reminderTime: e.target.value || null })}
            />
          </label>
          <p className="text-muted-ink mt-2 text-[13px]">
            Saved for later. Reminders are coming soon.
          </p>
        </Section>

        <Section title="Your data">
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-ghost" onClick={exportData}>
              Export my data (JSON)
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setConfirm('data')}
              disabled={!canEdit}
            >
              Delete all my data
            </button>
          </div>
        </Section>

        <Section title="About">
          <p className="text-[16px]">
            Triority: three priorities, every day. Finish all three and the day is won. Small,
            steady promises kept to yourself.
          </p>
          <p className="text-muted-ink mt-2 text-[13px]">Version {__APP_VERSION__}</p>
        </Section>

        <Section title="Privacy">
          <p className="text-[16px]">
            As a guest, everything stays in this browser. If you sign in, your tasks are stored in
            your account and only you can read them. No ads, no analytics, no trackers.
          </p>
        </Section>
      </div>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'account' ? 'Delete account?' : 'Delete everything?'}
        initialFocus={cancelRef}
      >
        <p className="text-[16px]">
          {confirm === 'account'
            ? 'This removes your account and all of its history for good.'
            : 'This erases all your tasks, streaks and affirmations. It can’t be undone.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            ref={cancelRef}
            type="button"
            className="btn-ghost"
            onClick={() => setConfirm(null)}
          >
            Keep it
          </button>
          <button type="button" className="btn-sun" onClick={runConfirmed} disabled={busy}>
            Delete
          </button>
        </div>
      </Dialog>
    </div>
  );
}

export default ExtrasScreen;
