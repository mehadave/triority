import { AnimatePresence, m } from 'motion/react';
import { GrowthStage } from '../components/art';
import { SunflowerPhoto } from '../components/SunflowerPhoto';
import { softSpring } from '../lib/motion';

/** Seed → sprout → bud → the crochet bloom, one step per finished task. */
export function GrowingSunflower({ done, ready }: { done: number; ready: boolean }) {
  const stage = Math.max(0, Math.min(3, done));
  // The box is always reserved so nothing shifts; art appears once data is in.
  return (
    <div className="relative mx-auto h-40 w-40 md:h-44 md:w-44" aria-hidden="true">
      {ready && (
        <AnimatePresence initial={false}>
          {stage < 3 ? (
            <m.div
              key={stage}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={softSpring}
            >
              <GrowthStage stage={stage as 0 | 1 | 2} />
            </m.div>
          ) : (
            <m.div
              key="bloom"
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.4, rotate: -25 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={softSpring}
            >
              <SunflowerPhoto
                sizes="(min-width: 768px) 176px, 160px"
                className="h-full w-full object-contain"
              />
            </m.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
