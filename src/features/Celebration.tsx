import { m } from 'motion/react';
import { useRef } from 'react';
import { Dialog } from '../components/Dialog';
import { SunflowerPhoto } from '../components/SunflowerPhoto';
import { useDay } from '../data/DayProvider';
import { softSpring } from '../lib/motion';
import { usePrefersReducedMotion } from '../lib/useReducedMotion';
import { useUi } from '../state/ui';

const PETALS = [
  { x: -120, r: -40, d: 0 },
  { x: -70, r: 25, d: 0.08 },
  { x: -20, r: -15, d: 0.16 },
  { x: 40, r: 35, d: 0.04 },
  { x: 90, r: -30, d: 0.12 },
  { x: 130, r: 20, d: 0.2 },
  { x: -150, r: 50, d: 0.24 },
];

function Petals() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 -top-6 flex justify-center"
      aria-hidden="true"
    >
      {PETALS.map((p, i) => (
        <m.svg
          key={i}
          width="18"
          height="28"
          viewBox="0 0 18 28"
          className="absolute"
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: p.x, y: [0, 120, 260], rotate: p.r * 3 }}
          transition={{ duration: 1.8, delay: 0.25 + p.d, ease: 'easeOut' }}
        >
          <path
            d="M9 1.5C14.2 7 15.6 15 9 26.5C2.4 15 3.8 7 9 1.5Z"
            fill="var(--sun)"
            stroke="var(--ink)"
            strokeWidth="1.4"
          />
        </m.svg>
      ))}
    </div>
  );
}

export function Celebration() {
  const open = useUi((s) => s.celebrating);
  const setOpen = useUi((s) => s.setCelebrating);
  const { streak } = useDay();
  const reduced = usePrefersReducedMotion();
  const button = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Day won!"
      initialFocus={button}
      titleClassName="title mt-1 mb-2"
      hero={
        <>
          {!reduced && <Petals />}
          <m.div
            className="mx-auto h-36 w-36 md:h-40 md:w-40"
            initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ ...softSpring, delay: 0.05 }}
          >
            <SunflowerPhoto sizes="160px" className="h-full w-full object-contain" />
          </m.div>
        </>
      }
    >
      <p className="text-[17px]">Three promises made. Three promises kept.</p>
      <p className="mt-3 text-[17px] font-medium">
        <span aria-hidden="true">🔥 </span>
        {streak.current}-day streak
      </p>
      <button ref={button} type="button" className="btn-sun mt-6 px-8" onClick={close}>
        Keep blooming
      </button>
    </Dialog>
  );
}
