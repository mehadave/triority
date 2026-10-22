import { afterEach, describe, expect, it } from 'vitest';
import { addDays } from '../../domain/dates';
import { PastDayError } from '../../domain/entries';
import { computeStreak, indexEntries } from '../../domain/streak';
import { LocalRepo } from './LocalRepo';
import { TriorityDB } from './db';

let n = 0;
const repos: LocalRepo[] = [];
function freshRepo() {
  const repo = new LocalRepo(new TriorityDB(`test-${n++}`));
  repos.push(repo);
  return repo;
}

afterEach(async () => {
  await Promise.all(repos.splice(0).map((r) => r.db.delete()));
});

async function winDay(repo: LocalRepo, date: string) {
  await repo.createDay(date, ['a', 'b', 'c']);
  for (const i of [0, 1, 2]) await repo.toggleTask(date, i);
}

describe('LocalRepo', () => {
  it('creates, ticks and wins a day', async () => {
    const repo = freshRepo();
    await winDay(repo, '2026-05-01');
    const entries = indexEntries(await repo.listEntries());
    const state = await repo.getStreakState();
    expect(
      computeStreak({ entries, savedDates: state.savedDates, today: '2026-05-01' }).current,
    ).toBe(1);
    expect(state.current).toBe(1);
    expect(state.best).toBe(1);
  });

  it('refuses to tick a past day', async () => {
    const repo = freshRepo();
    await repo.createDay('2026-05-01', ['a', 'b', 'c']);
    await expect(repo.toggleTask('2026-05-02', 0)).rejects.toThrow();
    const entry = (await repo.listEntries())[0]!;
    expect(entry.tasks.every((t) => !t.done)).toBe(true);
    // Domain guard, independent of storage.
    const { toggleTask } = await import('../../domain/entries');
    expect(() => toggleTask(entry, 0, '2026-05-02', new Date().toISOString())).toThrow(
      PastDayError,
    );
  });

  it('only creates one entry per day', async () => {
    const repo = freshRepo();
    await repo.createDay('2026-05-01', ['a', 'b', 'c']);
    await expect(repo.createDay('2026-05-01', ['d', 'e', 'f'])).rejects.toThrow();
  });

  it('grants a savior once per month and offers it after a missed day', async () => {
    const repo = freshRepo();
    for (let i = 0; i < 3; i++) await winDay(repo, addDays('2026-05-01', i));
    expect((await repo.openDay('2026-05-03')).kind).toBe('none');
    expect((await repo.getStreakState()).saviors).toBe(1);
    await repo.openDay('2026-05-03');
    expect((await repo.getStreakState()).saviors).toBe(1);

    const missed = await repo.openDay('2026-05-05');
    expect(missed).toEqual({ kind: 'offer', missed: ['2026-05-04'], streak: 3, saviors: 1 });
    await repo.useSaviors(['2026-05-04'], '2026-05-05');
    const state = await repo.getStreakState();
    expect(state.saviors).toBe(0);
    expect(state.current).toBe(3);
    expect((await repo.openDay('2026-05-05')).kind).toBe('none');
  });

  it('declining resets and stops asking', async () => {
    const repo = freshRepo();
    for (let i = 0; i < 3; i++) await winDay(repo, addDays('2026-05-01', i));
    await repo.openDay('2026-05-05');
    await repo.declineSaviors('2026-05-05');
    expect((await repo.getStreakState()).current).toBe(0);
    expect((await repo.openDay('2026-05-05')).kind).toBe('none');
  });

  it('validates settings limits', async () => {
    const repo = freshRepo();
    await expect(
      repo.updateSettings({ customAffirmations: [{ id: '1', text: 'x'.repeat(141) }] }),
    ).rejects.toThrow();
    const many = Array.from({ length: 51 }, (_, i) => ({ id: String(i), text: 'ok' }));
    await expect(repo.updateSettings({ customAffirmations: many })).rejects.toThrow();
    await repo.updateSettings({ reminderTime: '08:30' });
    expect((await repo.getSettings()).reminderTime).toBe('08:30');
  });

  it('exports and deletes everything', async () => {
    const repo = freshRepo();
    await winDay(repo, '2026-05-01');
    const data = await repo.exportAll();
    expect(data.entries).toHaveLength(1);
    expect(data.app).toBe('triority');
    await repo.deleteAll();
    expect(await repo.hasData()).toBe(false);
  });
});
