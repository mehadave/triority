import type { ReactNode } from 'react';

// Pressed flowers for won days on the calendar. Each date always gets the same flower,
// tilt and petal wobble, so a month looks the same every time it's opened.

const KINDS = [
  'daisy',
  'cosmos',
  'poppy',
  'forget',
  'pansy',
  'lavender',
  'marigold',
  'buttercup',
  'sunflower',
] as const;
type Kind = (typeof KINDS)[number];

type Rng = () => number;

function rngFor(key: string): Rng {
  // FNV-1a spreads neighbouring dates apart; a plain sum would give them all the same flower.
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = ((h >>> 0) % 2147483646) + 1;
  const next = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 3; i++) next();
  return next;
}

function petalPath(l: number, w: number, notch: boolean): string {
  return notch
    ? `M0 0C${w * 0.6} ${-l * 0.25} ${w} ${-l * 0.7} ${w * 0.55} ${-l}L${w * 0.25} ${-l * 0.92}L0 ${-l}L${-w * 0.25} ${-l * 0.92}L${-w * 0.55} ${-l}C${-w} ${-l * 0.7} ${-w * 0.6} ${-l * 0.25} 0 0Z`
    : `M0 0C${w * 0.7} ${-l * 0.2} ${w * 1.05} ${-l * 0.75} 0 ${-l}C${-w * 1.05} ${-l * 0.75} ${-w * 0.7} ${-l * 0.2} 0 0Z`;
}

function ring(
  rnd: Rng,
  n: number,
  l: number,
  w: number,
  fill: string,
  vein: string | null,
  { off = 0, notch = false, opacity = 0.92 } = {},
): ReactNode[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i * 360) / n + off + (rnd() - 0.5) * 8;
    const len = l * (0.9 + rnd() * 0.18);
    const wid = w * (0.92 + rnd() * 0.16);
    return (
      <g key={`${l}-${i}`} transform={`rotate(${angle.toFixed(1)})`}>
        <path d={petalPath(len, wid, notch)} fill={`url(#pf-${fill})`} fillOpacity={opacity} />
        {vein && (
          <path
            d={`M0 -2Q${wid * 0.15} ${-len * 0.5} 0 ${-len * 0.88}M0 -2Q${wid * 0.45} ${-len * 0.45} ${wid * 0.4} ${-len * 0.8}M0 -2Q${-wid * 0.45} ${-len * 0.45} ${-wid * 0.4} ${-len * 0.8}`}
            fill="none"
            stroke={vein}
            strokeOpacity={0.35}
            strokeWidth={0.35}
          />
        )}
      </g>
    );
  });
}

/** Seeds packed in a sunflower spiral. */
function seeds(n: number, radius: number, color: string, size: number, skipCentre = false) {
  return Array.from({ length: n }, (_, i) => {
    if (skipCentre && i === 0) return null;
    const t = i * 2.39996;
    const d = radius * Math.sqrt(i / n);
    return (
      <circle
        key={`s${i}`}
        cx={(d * Math.cos(t)).toFixed(2)}
        cy={(d * Math.sin(t)).toFixed(2)}
        r={size}
        fill={color}
      />
    );
  });
}

const stem = (d: string, w = 1.2) => (
  <path d={d} fill="none" stroke="#6d8a48" strokeWidth={w} strokeLinecap="round" />
);

const leaf = (x: number, y: number, angle: number, scale = 1) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <path d="M0 0C4 -3 10 -3 15 0C10 3 4 3 0 0Z" fill="url(#pf-leaf)" fillOpacity={0.9} />
    <path d="M0 0L14 0" stroke="#4c6630" strokeWidth={0.4} strokeOpacity={0.6} />
  </g>
);

const DRAW: Record<Kind, (rnd: Rng) => ReactNode> = {
  daisy: (rnd) => (
    <>
      {stem('M2 4Q6 26 10 46')}
      {leaf(6, 28, -30, 1.1)}
      {ring(rnd, 18, 21, 3.2, 'daisy', '#a99c6a')}
      <circle r={6.2} fill="#e5ad1c" />
      {seeds(34, 5.6, '#b97a0c', 0.55)}
    </>
  ),
  cosmos: (rnd) => (
    <>
      {stem('M0 4Q-4 28 -8 46')}
      {ring(rnd, 8, 23, 8, 'cosmos', '#8f2656', { notch: true, opacity: 0.88 })}
      <circle r={4.6} fill="#d7a21d" />
      {seeds(22, 4.2, '#9c6a08', 0.5)}
    </>
  ),
  poppy: (rnd) => (
    <>
      {stem('M0 4Q3 26 -2 46', 1.4)}
      {ring(rnd, 4, 24, 13.5, 'poppy', '#7a1a0c', { off: 45, opacity: 0.86 })}
      {ring(rnd, 2, 18, 11, 'poppy', '#7a1a0c', { opacity: 0.6 })}
      <circle r={4.2} fill="#56653f" />
      {seeds(18, 6.8, '#1a120f', 0.7, true)}
    </>
  ),
  forget: (rnd) => (
    <>
      {stem('M-8 -2Q-2 20 0 46', 0.8)}
      {stem('M10 -6Q4 18 0 46', 0.8)}
      {stem('M2 10Q1 28 0 46', 0.8)}
      {(
        [
          [-9, -6, 1],
          [10, -9, 1],
          [2, 8, 0.85],
        ] as const
      ).map(([x, y, s]) => (
        <g key={`${x}`} transform={`translate(${x} ${y}) scale(${s})`}>
          {ring(rnd, 5, 8, 4.6, 'forget', '#2f5f9e')}
          <circle r={1.5} fill="#f1cc45" />
        </g>
      ))}
      {leaf(-2, 30, -140, 0.9)}
    </>
  ),
  pansy: (rnd) => (
    <>
      {stem('M0 4Q2 26 0 46')}
      {leaf(1, 30, -25)}
      {ring(rnd, 5, 21, 11.5, 'pansy', '#20104a', { off: 18, opacity: 0.95 })}
      <circle r={2.2} fill="#f7e7a0" />
    </>
  ),
  lavender: (rnd) => (
    <>
      {stem('M0 46Q-2 10 2 -30', 1.1)}
      {leaf(-1, 30, -150, 1.1)}
      {leaf(0, 22, -20, 0.9)}
      {Array.from({ length: 16 }, (_, i) => {
        const y = -30 + i * 2.6;
        const x = (i % 2 ? 2.4 : -2.4) + (rnd() - 0.5);
        return (
          <ellipse
            key={i}
            cx={x.toFixed(1)}
            cy={y.toFixed(1)}
            rx={1.9}
            ry={2.6}
            transform={`rotate(${i % 2 ? 25 : -25} ${x.toFixed(1)} ${y.toFixed(1)})`}
            fill="url(#pf-lavender)"
            fillOpacity={0.92}
          />
        );
      })}
    </>
  ),
  marigold: (rnd) => (
    <>
      {stem('M0 4Q-3 26 2 46', 1.3)}
      {leaf(0, 28, 200)}
      {ring(rnd, 18, 20, 5.6, 'marigold', '#8a3a06', { notch: true })}
      {ring(rnd, 13, 13, 5.4, 'marigold', '#8a3a06', { notch: true, off: 9 })}
      {ring(rnd, 8, 7, 4, 'marigold', '#8a3a06', { notch: true })}
      <circle r={2.6} fill="#8e3d07" />
    </>
  ),
  buttercup: (rnd) => (
    <>
      {stem('M0 4Q4 28 1 46', 0.9)}
      {leaf(2, 30, -35, 0.9)}
      {ring(rnd, 5, 16, 10.5, 'buttercup', '#a07600', { opacity: 0.95 })}
      <circle r={3.4} fill="#a8a032" />
      {seeds(14, 3, '#7d7a1c', 0.5)}
    </>
  ),
  sunflower: (rnd) => (
    <>
      {stem('M0 4Q-2 28 0 46', 1.5)}
      {leaf(0, 30, -155, 1.2)}
      {ring(rnd, 16, 22, 4.6, 'sunflower', '#9a6a00', { off: 11 })}
      {ring(rnd, 16, 20, 4.4, 'sunflower', '#9a6a00')}
      <circle r={8.5} fill="#5a3a1c" />
      {seeds(46, 8, '#2e1d0e', 0.6)}
    </>
  ),
};

const RADIAL: Record<string, [number, string][]> = {
  daisy: [
    [0, '#cfc08a'],
    [0.3, '#f4efdc'],
    [1, '#fffdf6'],
  ],
  cosmos: [
    [0, '#a32d5e'],
    [0.3, '#da6f9b'],
    [1, '#f3c0d4'],
  ],
  poppy: [
    [0, '#1e1210'],
    [0.2, '#b72d1a'],
    [0.6, '#e2553a'],
    [1, '#f08260'],
  ],
  forget: [
    [0, '#f4f1e2'],
    [0.25, '#a9cbef'],
    [1, '#5b8fd2'],
  ],
  pansy: [
    [0, '#f0c22e'],
    [0.25, '#efc030'],
    [0.42, '#6c42aa'],
    [1, '#3b2274'],
  ],
  marigold: [
    [0, '#a84a08'],
    [0.5, '#e9841c'],
    [1, '#f6b44a'],
  ],
  buttercup: [
    [0, '#c99300'],
    [0.5, '#f3cd2a'],
    [1, '#fde374'],
  ],
  sunflower: [
    [0, '#b07a00'],
    [0.5, '#f1c22a'],
    [1, '#fbd860'],
  ],
};

/** Shared gradients and the "pressed" filter. Render once on any screen that shows flowers. */
export function PressedFlowerDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        {/* Slightly ragged edges, a fibrous texture and a soft shadow, like a flower glued to paper. */}
        <filter id="pf-pressed" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            seed={4}
            result="n"
          />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.8} result="d" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 .35 0 0 0 0 .28 0 0 0 0 .2 0 0 0 .5 -.1"
            result="t"
          />
          <feComposite in="t" in2="d" operator="in" result="t2" />
          <feMerge>
            <feMergeNode in="d" />
            <feMergeNode in="t2" />
          </feMerge>
          <feDropShadow
            dx={0.5}
            dy={0.9}
            stdDeviation={0.8}
            floodColor="#3a2a10"
            floodOpacity={0.3}
          />
        </filter>
        {Object.entries(RADIAL).map(([id, stops]) => (
          <radialGradient
            key={id}
            id={`pf-${id}`}
            gradientUnits="userSpaceOnUse"
            cx={0}
            cy={0}
            r={24}
          >
            {stops.map(([o, c]) => (
              <stop key={o} offset={o} stopColor={c} />
            ))}
          </radialGradient>
        ))}
        <linearGradient id="pf-leaf" x1={0} y1={0} x2={1} y2={1}>
          <stop offset={0} stopColor="#5f7d3c" />
          <stop offset={1} stopColor="#a3bb7a" />
        </linearGradient>
        <linearGradient id="pf-lavender" x1={0} y1={0} x2={1} y2={1}>
          <stop offset={0} stopColor="#7a5bbd" />
          <stop offset={1} stopColor="#c1ade9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** The flower pressed for a given day. Needs `PressedFlowerDefs` somewhere on the page. */
export function PressedFlower({ dateKey }: { dateKey: string }) {
  const rnd = rngFor(dateKey);
  const kind = KINDS[Math.floor(rnd() * KINDS.length)]!;
  const tilt = Math.round((rnd() - 0.5) * 50);
  return (
    <svg
      viewBox="-28 -34 56 72"
      width="100%"
      height="100%"
      overflow="visible"
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
      focusable="false"
    >
      <g filter="url(#pf-pressed)">{DRAW[kind](rnd)}</g>
    </svg>
  );
}
