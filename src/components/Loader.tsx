import { AnimatePresence, m } from 'motion/react';
import { useEffect, useState } from 'react';
import { HandCircle, Tick } from './art';
import { SunflowerPhoto } from './SunflowerPhoto';
import { softSpring } from '../lib/motion';

const KEY = 'triority:intro-seen';

function shouldShow(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return sessionStorage.getItem(KEY) !== '1';
  } catch {
    return false;
  }
}

/** First-load intro: three circles, the last blooms, a tick lands. Never longer than 2s. */
export function Loader() {
  const [show, setShow] = useState(shouldShow);

  useEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      // ignore
    }
    const t = window.setTimeout(() => setShow(false), 1900);
    return () => window.clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <m.div
          className="bg-paper fixed inset-0 z-[60] flex flex-col items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          onClick={() => setShow(false)}
          aria-hidden="true"
        >
          <div className="flex items-center gap-3">
            <HandCircle variant={0} size={56} draw />
            <HandCircle variant={1} size={56} draw delay={0.3} />
            <div className="relative h-24 w-24">
              <m.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0, scale: 0.6 }}
                transition={{ delay: 1.0, duration: 0.2 }}
              >
                <HandCircle variant={2} size={56} draw delay={0.6} />
              </m.div>
              <m.div
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.3, rotate: -24 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ ...softSpring, delay: 1.0 }}
              >
                <SunflowerPhoto sizes="96px" eager className="h-24 w-24 object-contain" />
              </m.div>
              <div className="absolute top-1/2 left-1/2 h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2">
                <Tick delay={1.3} />
              </div>
            </div>
          </div>
          <m.p
            className="font-display mt-8 text-[44px] leading-none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.45, duration: 0.3 }}
          >
            Triority
          </m.p>
          <m.p
            className="text-muted-ink mt-2 text-[15px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.55, duration: 0.3 }}
          >
            3 priorities. every day.
          </m.p>
        </m.div>
      )}
    </AnimatePresence>
  );
}
