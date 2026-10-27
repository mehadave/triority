import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router';
import { GlassNav } from '../components/GlassNav';
import { LiveRegion, Toast } from '../components/Announcer';
import { DayStart } from '../features/DayStart';
import { Celebration } from '../features/Celebration';
import { useDay } from '../data/DayProvider';
import { prefetchRoute } from './routes';
import { isBackupDue, useLastBackup } from '../lib/device';

export function App() {
  const { streak, entries } = useDay();
  const lastBackup = useLastBackup();

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => {
      prefetchRoute('/cal');
      prefetchRoute('/extras');
    });
  }, []);

  return (
    <>
      <a
        href="#main"
        className="focus:bg-sun sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <GlassNav streak={streak.current} extrasBadge={isBackupDue(entries.size, lastBackup)} />
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-16 pb-[calc(110px+env(safe-area-inset-bottom))] md:pt-28 md:pb-12"
      >
        <Suspense fallback={<div className="flex-1" />}>
          <Outlet />
        </Suspense>
      </main>
      <DayStart />
      <Celebration />
      <Toast />
      <LiveRegion />
    </>
  );
}
