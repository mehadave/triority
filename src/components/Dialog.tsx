import { AnimatePresence, m } from 'motion/react';
import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../lib/useFocusTrap';
import { spring } from '../lib/motion';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  titleClassName?: string;
  /** Rendered above the title. */
  hero?: ReactNode;
}

function DialogBody({
  onClose,
  title,
  children,
  initialFocus,
  titleClassName,
  hero,
}: Omit<DialogProps, 'open'>) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, onClose, initialFocus);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="card relative w-full max-w-sm px-6 py-7 text-center shadow-[0_20px_60px_rgba(26,26,26,0.14)]"
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={spring}
      >
        {hero}
        <h2 id={titleId} className={titleClassName ?? 'title mb-3 text-[2rem]'}>
          {title}
        </h2>
        {children}
      </m.div>
    </div>
  );
}

export function Dialog({ open, ...rest }: DialogProps) {
  return createPortal(
    <AnimatePresence>{open && <DialogBody {...rest} />}</AnimatePresence>,
    document.body,
  );
}
