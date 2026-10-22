import { AnimatePresence, m } from 'motion/react';
import { useEffect } from 'react';
import { useUi } from '../state/ui';

export function LiveRegion() {
  const message = useUi((s) => s.announcement);
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}

export function Toast() {
  const toast = useUi((s) => s.toast);
  const clear = useUi((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(clear, 3200);
    return () => window.clearTimeout(t);
  }, [toast, clear]);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:top-24 md:bottom-auto"
      role="status"
    >
      <AnimatePresence>
        {toast && (
          <m.p
            className="bg-ink text-paper rounded-full px-4 py-2.5 text-[15px] shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}
