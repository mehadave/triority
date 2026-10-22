import { format } from 'date-fns';
import type { DateKey } from './types';

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Device-local calendar date of `date`. */
export function toDateKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd');
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function isDateKey(value: string): boolean {
  if (!KEY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

// Key arithmetic runs in UTC so DST and timezone shifts can never add or drop a day.
function keyToUtc(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = keyToUtc(key);
  date.setUTCDate(date.getUTCDate() + days);
  return utcToKey(date);
}

/** Keys sort lexically, so plain string comparison is chronological. */
export function compareKeys(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function monthOf(key: DateKey): string {
  return key.slice(0, 7);
}

/** Whole months from `from` (yyyy-MM) to `to` (yyyy-MM). */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number) as [number, number];
  const [ty, tm] = to.split('-').map(Number) as [number, number];
  return (ty - fy) * 12 + (tm - fm);
}

export function daysInMonth(month: string): DateKey[] {
  const first = `${month}-01`;
  const days: DateKey[] = [];
  for (let key = first; monthOf(key) === month; key = addDays(key, 1)) days.push(key);
  return days;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  return (keyToUtc(key).getUTCDay() + 6) % 7;
}
