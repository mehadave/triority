import { useEffect, useState } from 'react';
import { todayKey } from '../domain/dates';

function msUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next.getTime() - now.getTime();
}

/** Device-local today, refreshed at midnight and whenever the app comes back to the foreground. */
export function useDeviceToday(): string {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const refresh = () => setToday(todayKey());
    let timer = window.setTimeout(function tick() {
      refresh();
      timer = window.setTimeout(tick, msUntilMidnight());
    }, msUntilMidnight());
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return today;
}
