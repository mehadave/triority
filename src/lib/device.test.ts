import { describe, expect, it } from 'vitest';
import { isBackupDue } from './device';

const NOW = Date.parse('2026-05-30T12:00:00Z');

describe('isBackupDue', () => {
  it('stays quiet until there is a week of history', () => {
    expect(isBackupDue(6, null, NOW)).toBe(false);
  });

  it('nudges when there has never been a backup', () => {
    expect(isBackupDue(7, null, NOW)).toBe(true);
  });

  it('nudges again after two weeks', () => {
    expect(isBackupDue(30, '2026-05-20T12:00:00Z', NOW)).toBe(false);
    expect(isBackupDue(30, '2026-05-16T12:00:00Z', NOW)).toBe(true);
  });

  it('treats an unreadable date as due', () => {
    expect(isBackupDue(30, 'garbage', NOW)).toBe(true);
  });
});
