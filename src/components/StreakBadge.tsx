import { m } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { softSpring } from '../lib/motion';

export function StreakBadge({ value, className = '' }: { value: number; className?: string }) {
  const previous = useRef(value);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (value > previous.current) setBump((n) => n + 1);
    previous.current = value;
  }, [value]);

  const label = `${value}-day streak`;
  return (
    <m.span
      key={bump}
      className={`inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 text-[15px] font-medium tabular-nums ${
        value > 0 ? 'text-ink' : 'text-muted-ink'
      } ${className}`}
      initial={bump > 0 ? { scale: 1.35, y: -3 } : false}
      animate={{ scale: 1, y: 0 }}
      transition={softSpring}
      title={label}
    >
      <span aria-hidden="true" className={value > 0 ? '' : 'opacity-60 grayscale'}>
        🔥
      </span>
      <span aria-hidden="true">{value}</span>
      <span className="sr-only">{label}</span>
    </m.span>
  );
}
