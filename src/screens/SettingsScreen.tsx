import { PageHeader } from '../components/PageHeader';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Dialog } from '../components/Dialog';
import { useData } from '../data/DataProvider';
import { useDay } from '../data/DayProvider';
import { BackupError, parseBackup, type ImportMode } from '../domain/backup';
import type { ExportData } from '../domain/schema';
import {
  forgetLastBackup,
  isBackupDue,
  isInstalled,
  isIOS,
  isStoragePersistent,
  markBackedUp,
  promptInstall,
  useCanPromptInstall,
  useLastBackup,
} from '../lib/device';
import { useUi } from '../state/ui';
import { Link } from 'react-router';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="border-hairline border-b py-6 last:border-b-0">
      <h2 id={id} className="text-muted-ink mb-3 text-[14px] font-medium tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function backupSummary(data: ExportData): string {
  const n = data.entries.length;
  if (n === 0) return 'This backup has no days in it yet.';
  const first = data.entries[0]!.date;
  const last = data.entries[n - 1]!.date;
  return `${n} day${n === 1 ? '' : 's'}, from ${first} to ${last}.`;
}

export function SettingsScreen() {
  const { repo } = useData();
  const { settings, today, entries } = useDay();
  const toast = useUi((s) => s.showToast);
  const lastBackup = useLastBackup();
  const canPromptInstall = useCanPromptInstall();
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [pending, setPending] = useState<ExportData | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const mergeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void isStoragePersistent().then(setPersistent);
  }, []);

  const due = isBackupDue(entries.size, lastBackup);
  const installed = isInstalled();

  const exportData = async () => {
    const data = await repo.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triority-backup-${today}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    markBackedUp();
    toast('Backup saved. Keep the file somewhere safe.');
  };

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setRestoreError(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setRestoreError(err instanceof BackupError ? err.message : 'That file couldn’t be read.');
    }
  };

  const restore = async (mode: ImportMode) => {
    if (!pending) return;
    setBusy(true);
    try {
      await repo.importBackup(pending, mode, today);
      setPending(null);
      toast(mode === 'merge' ? 'Backup merged with this device.' : 'Backup restored.');
    } catch {
      setRestoreError('Restoring didn’t work, so nothing was changed.');
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  const deleteEverything = async () => {
    setBusy(true);
    try {
      await repo.deleteAll();
      forgetLastBackup();
      try {
        localStorage.removeItem('triority:asked-on');
      } catch {
        // ignore
      }
      setConfirmDelete(false);
      toast('All your data is gone. Fresh page.');
    } catch {
      toast('That didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    if (await promptInstall()) toast('Installed. Find Triority on your home screen.');
  };

  return (
    <div className="flex flex-1 flex-col pb-4">
      <PageHeader title="Settings" />
      <div className="mx-auto mt-1 w-full max-w-md">
        <Section title="Your data">
          <p className="text-[16px]">
            Everything is stored on this device only. Back it up now and then so it’s never lost.
          </p>
          <p className={`mt-2 text-[14px] ${due ? 'font-medium' : 'text-muted-ink'}`}>
            {lastBackup
              ? `Backed up until ${format(new Date(lastBackup), 'MMMM d, yyyy')} (${formatDistanceToNowStrict(new Date(lastBackup), { addSuffix: true })}).`
              : 'No backup yet.'}
            {due && ' Time for a fresh one.'}
          </p>
          {persistent === false && (
            <p className="text-muted-ink mt-1 text-[14px]">
              This browser may clear stored data if space runs low, so backups matter here.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="btn-sun" onClick={exportData}>
              Back up now
            </button>
            <button type="button" className="btn-ghost" onClick={() => fileInput.current?.click()}>
              Restore from backup
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={pickFile}
            />
          </div>
          {restoreError && (
            <p role="alert" className="mt-3 text-[14px]">
              {restoreError}
            </p>
          )}
        </Section>

        {!installed && (
          <Section title="Install">
            {canPromptInstall ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-[16px]">
                  Add Triority to your home screen. It opens instantly and works offline.
                </p>
                <button type="button" className="btn-ghost" onClick={install}>
                  Install Triority
                </button>
              </div>
            ) : isIOS() ? (
              <p className="text-[16px]">
                In Safari, tap <span className="font-medium">Share</span>, then{' '}
                <span className="font-medium">Add to Home Screen</span>. On iPhone, installed apps
                also keep their data safer.
              </p>
            ) : (
              <p className="text-[16px]">
                Use your browser’s <span className="font-medium">Install app</span> option to add
                Triority to your device. It opens instantly and works offline.
              </p>
            )}
          </Section>
        )}

        <Section title="Reminder">
          <label className="flex items-center justify-between gap-4">
            <span className="text-[16px]">Daily reminder time</span>
            <input
              type="time"
              className="ink-input w-36 text-center"
              value={settings?.reminderTime ?? ''}
              onChange={(e) => void repo.updateSettings({ reminderTime: e.target.value || null })}
            />
          </label>
          <p className="text-muted-ink mt-2 text-[13px]">
            Saved for later. Reminders are coming soon.
          </p>
        </Section>

        <Section title="Start over">
          <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(true)}>
            Delete all my data
          </button>
        </Section>

        <Section title="About">
          <p className="text-[16px]">
            Triority: three priorities, every day. Finish all three and the day is won. Small,
            steady promises kept to yourself.
          </p>
          <Link to="/about" className="mt-2 inline-block text-[15px] underline underline-offset-4">
            More about Triority
          </Link>
          <p className="text-muted-ink mt-2 text-[13px]">Version {__APP_VERSION__}</p>
        </Section>

        <Section title="Privacy">
          <p className="text-[16px]">
            There are no accounts and nothing is sent anywhere. Your tasks never leave this device
            unless you export a backup yourself. No ads, no analytics, no trackers.
          </p>
        </Section>
      </div>

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Restore backup?"
        initialFocus={mergeRef}
      >
        {pending && <p className="text-[16px]">{backupSummary(pending)}</p>}
        <p className="text-muted-ink mt-2 text-[14px]">
          Merging keeps what’s on this device and adds the backup’s days. Replacing swaps everything
          for the backup.
        </p>
        <div className="mt-6 flex flex-col items-stretch gap-3">
          <button
            ref={mergeRef}
            type="button"
            className="btn-sun"
            disabled={busy}
            onClick={() => void restore('merge')}
          >
            Merge with this device
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => void restore('replace')}
          >
            Replace everything
          </button>
          <button
            type="button"
            className="min-h-11 text-[15px] underline underline-offset-4"
            onClick={() => setPending(null)}
          >
            Cancel
          </button>
        </div>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete everything?"
        initialFocus={cancelRef}
      >
        <p className="text-[16px]">
          This erases all your tasks, streaks and affirmations from this device. It can’t be undone,
          so back up first if you might want them.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            ref={cancelRef}
            type="button"
            className="btn-ghost"
            onClick={() => setConfirmDelete(false)}
          >
            Keep it
          </button>
          <button type="button" className="btn-sun" onClick={deleteEverything} disabled={busy}>
            Delete
          </button>
        </div>
      </Dialog>
    </div>
  );
}

export default SettingsScreen;
