import { m } from 'motion/react';
import type { SVGProps } from 'react';

/** Three slightly different hand-sketched rings so the checkboxes never look stamped. */
export const CIRCLE_PATHS = [
  'M23.5 4.2C34.1 3.6 42.4 11.8 42 22.9C41.6 33.6 33.2 42.1 22.6 41.8C12.1 41.5 4.1 33.2 4.4 22.4C4.7 12.3 12.2 4.9 21.4 4.6C23.8 4.5 25.6 5 26.9 5.8',
  'M20.8 5.1C31.6 3.2 41.9 10.4 42.6 21.7C43.2 32.9 35.1 41.6 23.9 42.2C13.3 42.7 4.6 35.4 3.9 24.6C3.3 14.1 10.1 6.6 19.2 5C21.4 4.6 23.3 4.9 24.4 5.6',
  'M25.9 4.9C36.2 6.1 42.9 14.2 41.8 24.6C40.8 34.3 32.4 41.9 22.1 41.3C11.4 40.7 4.2 32.1 5 21.5C5.8 11.6 13.7 4.3 23.4 4.1C26.2 4 28.1 5.3 28.8 6.4',
] as const;

export const TICK_PATH = 'M12.5 24.2C15.2 26.4 17.4 29.1 19.6 32.4C23.9 23.6 29.8 15.9 37.6 9.8';

const ink = {
  fill: 'none',
  stroke: 'var(--ink)',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function HandCircle({
  variant,
  size = 46,
  draw = false,
  delay = 0,
}: {
  variant: number;
  size?: number;
  draw?: boolean;
  delay?: number;
}) {
  const d = CIRCLE_PATHS[variant % CIRCLE_PATHS.length];
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" aria-hidden="true" focusable="false">
      {draw ? (
        <m.path
          d={d}
          {...ink}
          strokeWidth={2.4}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: 'easeInOut', delay }}
        />
      ) : (
        <path d={d} {...ink} strokeWidth={2.4} />
      )}
    </svg>
  );
}

export function Tick({
  size = 46,
  animate = true,
  delay = 0,
}: {
  size?: number;
  animate?: boolean;
  delay?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 46 46"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0"
    >
      <m.path
        d={TICK_PATH}
        {...ink}
        strokeWidth={3.2}
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: [0.3, 0.6, 0.35, 1], delay }}
      />
    </svg>
  );
}

const soil = (
  <>
    <path d="M10 94C30 86.5 52 85 64 85.4C80 86 96 89 110 94" {...ink} strokeWidth={2.4} />
    <path d="M24 101C40 98 62 97.5 80 99" {...ink} strokeWidth={1.6} />
    <path
      d="M30 92.5l1.5 0.6M48 95l1.4-0.4M78 93.5l1.3 0.8M92 95.6l1.2-0.3"
      {...ink}
      strokeWidth={1.8}
    />
  </>
);

function Leaf({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="var(--sun)"
      fillOpacity={0.35}
      stroke="var(--ink)"
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
  );
}

export function GrowthStage({ stage }: { stage: 0 | 1 | 2 }) {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" focusable="false">
      {stage === 0 && (
        <>
          <path
            d="M55.5 85.8C52.4 79.6 54.6 72.6 59.6 71.6C64.8 70.6 68.4 76.2 66.8 82.4C66.2 84.6 65.4 85.8 64.6 86.6"
            fill="var(--paper)"
            {...{ stroke: 'var(--ink)', strokeLinecap: 'round', strokeLinejoin: 'round' }}
            strokeWidth={2.4}
          />
          <path d="M60.2 74.6C59.6 78 60 81.6 61.2 84.6" {...ink} strokeWidth={1.6} />
        </>
      )}
      {stage === 1 && (
        <>
          <path d="M60 86C60.6 78 59.4 70 60.4 62" {...ink} strokeWidth={2.4} />
          <Leaf d="M60.2 66C52 67.5 45.5 63 43.6 56.4C51.6 55 58.4 58.6 60.2 66Z" />
          <Leaf d="M60.4 63.6C66.2 57.4 74 56.6 79.2 59.4C75.6 66 67.6 67.8 60.4 63.6Z" />
        </>
      )}
      {stage === 2 && (
        <>
          <path d="M60 86C61.2 72 58.6 58 60.6 40" {...ink} strokeWidth={2.4} />
          <Leaf d="M60.4 70C50.6 72.4 42.8 67.4 40.4 59.4C49.8 57.6 58 61.6 60.4 70Z" />
          <Leaf d="M60.6 61C67.4 53.6 76.6 52.6 82.6 56C78.4 63.8 69 66 60.6 61Z" />
          <path
            d="M60.6 41.6C53.4 40 50.2 32.6 53.6 26.2C56 21.8 59.6 19.2 61.4 17.4C63.2 19.8 66.8 22.8 68.2 27.4C70.4 34.4 66.8 41 60.6 41.6Z"
            fill="var(--sun)"
            stroke="var(--ink)"
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <path
            d="M54 34.4C51.4 36 49 36.2 47 35.4M67.6 34C70.4 35.6 72.8 35.6 74.6 34.6"
            {...ink}
            strokeWidth={2}
          />
        </>
      )}
      {soil}
    </svg>
  );
}

export function MiniSunflower({ filled, saved = false }: { filled: boolean; saved?: boolean }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" focusable="false">
      {petals.map((deg) => (
        <ellipse
          key={deg}
          cx="12"
          cy="5.2"
          rx="2.4"
          ry="3.6"
          transform={`rotate(${deg} 12 12)`}
          fill={filled ? 'var(--sun)' : 'var(--paper)'}
          stroke="var(--ink)"
          strokeWidth="1.1"
        />
      ))}
      <circle
        cx="12"
        cy="12"
        r="3.6"
        fill={filled ? 'var(--ink)' : 'var(--paper)'}
        stroke="var(--ink)"
        strokeWidth="1.2"
      />
      {saved && (
        <g>
          <circle cx="18.6" cy="18.6" r="4.6" fill="var(--ink)" />
          <path
            d="M18.6 16.4v4.4M16.4 18.6h4.4"
            stroke="var(--paper)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}

export function HollowDay() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" focusable="false">
      <path
        d="M12.4 4.2C17 4.1 20 7.8 19.8 12.2C19.6 16.8 16.2 19.9 11.8 19.8C7.4 19.6 4.2 16.4 4.3 11.9C4.4 7.6 7.6 4.6 11.2 4.4"
        {...ink}
        strokeWidth={1.6}
      />
    </svg>
  );
}

type IconProps = SVGProps<SVGSVGElement>;
const iconBase = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
} as const;

export function TasksIcon(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path
        d="M12.3 3.4C17.4 3.3 20.8 7.4 20.6 12.2C20.4 17.2 16.6 20.7 11.8 20.6C7 20.4 3.4 16.8 3.5 11.9C3.6 7.1 7.4 3.7 11.1 3.5"
        {...ink}
        strokeWidth={1.8}
      />
      <path d="M8.2 12.4L11 15.2L16.4 8.8" {...ink} strokeWidth={2} />
    </svg>
  );
}

export function AffirmIcon(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path
        d="M12 19.6C6.4 15.8 3.6 12.6 3.8 9.2C4 6.6 6 4.8 8.4 4.9C10 5 11.2 6 12 7.4C12.8 6 14 5 15.6 4.9C18 4.8 20 6.6 20.2 9.2C20.4 12.6 17.6 15.8 12 19.6Z"
        {...ink}
        strokeWidth={1.8}
      />
    </svg>
  );
}

export function CalIcon(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path
        d="M4.4 7.2C4.2 5.8 5 5 6.4 5.1L17.8 5C19.2 5 19.9 5.8 19.8 7.2L19.6 18.4C19.6 19.6 18.8 20.2 17.6 20.2L6.4 20.1C5.2 20.1 4.5 19.4 4.5 18.2Z"
        {...ink}
        strokeWidth={1.8}
      />
      <path d="M4.6 9.6H19.6M8.4 3.4V6.4M15.6 3.4V6.4" {...ink} strokeWidth={1.8} />
      <path
        d="M8.6 13.4h.1M12 13.4h.1M15.4 13.4h.1M8.6 16.6h.1M12 16.6h.1"
        {...ink}
        strokeWidth={2.4}
      />
    </svg>
  );
}

export function ExtrasIcon(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M5.4 12h.1M12 12.1h.1M18.6 11.9h.1" {...ink} strokeWidth={3.4} />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...iconBase} width={20} height={20} {...props}>
      <path
        d="M4.6 19.4L5.4 15.4L15.8 5C16.8 4 18.2 4.1 19 5C19.9 5.9 20 7.2 19 8.2L8.6 18.6Z"
        {...ink}
        strokeWidth={1.7}
      />
      <path d="M14.2 6.6L17.4 9.8" {...ink} strokeWidth={1.7} />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...iconBase} width={20} height={20} {...props}>
      <path
        d="M5 7.2H19M9.6 7V5.2C9.6 4.6 10 4.2 10.6 4.2H13.4C14 4.2 14.4 4.6 14.4 5.2V7M6.6 7.4L7.4 18.8C7.5 19.6 8 20 8.8 20H15.2C16 20 16.5 19.6 16.6 18.8L17.4 7.4"
        {...ink}
        strokeWidth={1.7}
      />
    </svg>
  );
}

export function ChevronIcon({ dir, ...props }: IconProps & { dir: 'left' | 'right' }) {
  return (
    <svg {...iconBase} {...props}>
      <path
        d={dir === 'left' ? 'M14.8 5.4L8.4 12.2L14.6 18.6' : 'M9.2 5.4L15.6 12.2L9.4 18.6'}
        {...ink}
        strokeWidth={2}
      />
    </svg>
  );
}
