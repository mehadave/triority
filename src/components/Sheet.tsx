import { AnimatePresence, m, useDragControls, type PanInfo } from 'motion/react';
import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../lib/useFocusTrap';
import { spring } from '../lib/motion';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
}

function SheetBody({ onClose, title, children, initialFocus }: Omit<SheetProps, 'open'>) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const controls = useDragControls();
  useFocusTrap(ref, onClose, initialFocus);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <m.div
        className="absolute inset-0 bg-[var(--scrim)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <m.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-b-none border-b-0 px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(26,26,26,0.12)] md:mb-6 md:rounded-b-[24px] md:border-b-2"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={spring}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={onDragEnd}
      >
        <div
          className="-mx-5 flex cursor-grab touch-none justify-center pt-1 pb-3"
          onPointerDown={(e) => controls.start(e)}
        >
          <span className="bg-ink/25 h-1.5 w-11 rounded-full" aria-hidden="true" />
        </div>
        <h2 id={titleId} className="title mb-5 text-[2.25rem]">
          {title}
        </h2>
        {children}
      </m.div>
    </div>
  );
}

/** iOS-style bottom sheet: swipe the handle down, tap outside or press Esc to close. */
export function Sheet({ open, ...rest }: SheetProps) {
  return createPortal(
    <AnimatePresence>{open && <SheetBody {...rest} />}</AnimatePresence>,
    document.body,
  );
}
