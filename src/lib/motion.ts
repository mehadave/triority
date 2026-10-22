export const spring = { type: 'spring', stiffness: 400, damping: 30 } as const;
export const softSpring = { type: 'spring', stiffness: 260, damping: 20 } as const;

export function haptic(): void {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Not supported; ignore.
  }
}
