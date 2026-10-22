import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Sheet } from '../components/Sheet';
import { useData } from '../data/DataProvider';
import { useDay } from '../data/DayProvider';
import type { MissedDays } from '../domain/streak';
import { useUi } from '../state/ui';
import { DailyQuestionSheet } from './DailyQuestion';

const ASKED_KEY = 'triority:asked-on';

function askedToday(today: string): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === today;
  } catch {
    return false;
  }
}

function markAsked(today: string) {
  try {
    localStorage.setItem(ASKED_KEY, today);
  } catch {
    // ignore
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function missedPhrase(days: number): string {
  return days === 1 ? 'You missed yesterday.' : `You missed the last ${days} days.`;
}

/** Runs once per day: grants the monthly savior, asks about missed days, then asks for today's three. */
export function DayStart() {
  const { repo } = useData();
  const { loaded, today, todayEntry } = useDay();
  const { pathname } = useLocation();
  const dailyOpen = useUi((s) => s.dailyQuestionOpen);
  const setDailyOpen = useUi((s) => s.setDailyQuestionOpen);
  const [missed, setMissed] = useState<MissedDays | null>(null);
  const [busy, setBusy] = useState(false);
  const checked = useRef<string | null>(null);
  const useButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!loaded) return;
    const key = `${repo.kind}:${today}`;
    if (checked.current === key) return;
    checked.current = key;
    let cancelled = false;
    repo
      .openDay(today)
      .then((result) => !cancelled && setMissed(result))
      .catch(() => !cancelled && setMissed({ kind: 'none' }));
    return () => {
      cancelled = true;
    };
  }, [loaded, repo, today]);

  // Once streak questions are settled, ask for today's three (once per day).
  useEffect(() => {
    if (!loaded || missed?.kind !== 'none' || todayEntry || pathname === '/auth') return;
    if (askedToday(today)) return;
    markAsked(today);
    setDailyOpen(true);
  }, [loaded, missed, todayEntry, today, pathname, setDailyOpen]);

  const settle = () => setMissed({ kind: 'none' });

  const useSaviors = async () => {
    if (missed?.kind !== 'offer') return;
    setBusy(true);
    try {
      await repo.useSaviors(missed.missed, today);
    } finally {
      setBusy(false);
      settle();
    }
  };

  const letGo = async () => {
    setBusy(true);
    try {
      await repo.declineSaviors(today);
    } finally {
      setBusy(false);
      settle();
    }
  };

  return (
    <>
      <Sheet
        open={missed?.kind === 'offer'}
        onClose={settle}
        title="Keep your streak?"
        initialFocus={useButton}
      >
        {missed?.kind === 'offer' && (
          <div className="flex flex-col items-center gap-5 text-center">
            <p className="text-[17px]">
              {missedPhrase(missed.missed.length)} Use{' '}
              {missed.missed.length === 1 ? 'a savior' : `${missed.missed.length} saviors`} to keep
              your {missed.streak}-day streak? ({missed.saviors} left)
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                ref={useButton}
                type="button"
                className="btn-sun"
                disabled={busy}
                onClick={useSaviors}
              >
                Use {plural(missed.missed.length, 'savior')}
              </button>
              <button type="button" className="btn-ghost" disabled={busy} onClick={letGo}>
                Start fresh instead
              </button>
            </div>
            <p className="text-muted-ink text-[13px]">
              A saved day keeps the streak going but doesn’t add to it.
            </p>
          </div>
        )}
      </Sheet>

      <Sheet open={missed?.kind === 'reset'} onClose={letGo} title="A fresh start">
        {missed?.kind === 'reset' && (
          <div className="flex flex-col items-center gap-5 text-center">
            <p className="text-[17px]">
              You were away for a little while, so your {missed.streak}-day streak has wrapped up.
              That streak still happened, and your best is saved. Today is a good day to begin a new
              one.
            </p>
            <button type="button" className="btn-sun" disabled={busy} onClick={letGo}>
              Let’s begin
            </button>
          </div>
        )}
      </Sheet>

      <DailyQuestionSheet open={dailyOpen && !todayEntry} onClose={() => setDailyOpen(false)} />
    </>
  );
}
