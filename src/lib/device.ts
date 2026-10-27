import { useSyncExternalStore } from 'react';

// Everything lives in this browser, so help it stay there: ask for persistent storage,
// remember when the last backup was taken, and offer installation where it helps.

const LAST_BACKUP_KEY = 'triority:last-backup';
const BACKUP_EVERY_DAYS = 14;
const MIN_DAYS_BEFORE_NUDGE = 7;

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function isStoragePersistent(): Promise<boolean | null> {
  try {
    return (await navigator.storage?.persisted?.()) ?? null;
  } catch {
    return null;
  }
}

// --- Last backup ----------------------------------------------------------------

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function markBackedUp(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
  emit();
}

export function forgetLastBackup(): void {
  try {
    localStorage.removeItem(LAST_BACKUP_KEY);
  } catch {
    // ignore
  }
  emit();
}

export function useLastBackup(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readLastBackup,
    () => null,
  );
}

/** Nudge once there's something worth keeping and it hasn't been saved for a while. */
export function isBackupDue(
  daysTracked: number,
  lastBackup: string | null,
  now = Date.now(),
): boolean {
  if (daysTracked < MIN_DAYS_BEFORE_NUDGE) return false;
  if (!lastBackup) return true;
  const ageDays = (now - Date.parse(lastBackup)) / 86_400_000;
  return !(ageDays < BACKUP_EVERY_DAYS);
}

// --- Install --------------------------------------------------------------------

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

/** Must run early: browsers fire this once, shortly after load. */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    installListeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((l) => l());
  });
}

export function useCanPromptInstall(): boolean {
  return useSyncExternalStore(
    (cb) => {
      installListeners.add(cb);
      return () => installListeners.delete(cb);
    },
    () => deferredPrompt !== null,
    () => false,
  );
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  installListeners.forEach((l) => l());
  await event.prompt();
  return (await event.userChoice).outcome === 'accepted';
}

export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}
