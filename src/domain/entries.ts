import { TASKS_PER_DAY, TASK_MAX, type DateKey, type DayEntry } from './types';

export class PastDayError extends Error {
  constructor() {
    super('Only today’s tasks can be changed.');
    this.name = 'PastDayError';
  }
}

export class InvalidTasksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTasksError';
  }
}

function cleanText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) throw new InvalidTasksError('Every task needs some words.');
  if (trimmed.length > TASK_MAX)
    throw new InvalidTasksError(`Keep each task under ${TASK_MAX} characters.`);
  return trimmed;
}

function assertToday(entry: DayEntry, today: DateKey): void {
  if (entry.date !== today) throw new PastDayError();
}

export function createDay(date: DateKey, texts: readonly string[], now: string): DayEntry {
  if (texts.length !== TASKS_PER_DAY) throw new InvalidTasksError('Pick exactly three things.');
  return {
    date,
    updatedAt: now,
    tasks: texts.map((text) => ({ text: cleanText(text), done: false, doneAt: null })),
  };
}

export function toggleTask(entry: DayEntry, index: number, today: DateKey, now: string): DayEntry {
  assertToday(entry, today);
  const task = entry.tasks[index];
  if (!task) throw new InvalidTasksError('No such task.');
  const done = !task.done;
  return {
    ...entry,
    updatedAt: now,
    tasks: entry.tasks.map((t, i) => (i === index ? { ...t, done, doneAt: done ? now : null } : t)),
  };
}

export function editTaskText(
  entry: DayEntry,
  index: number,
  text: string,
  today: DateKey,
  now: string,
): DayEntry {
  assertToday(entry, today);
  if (!entry.tasks[index]) throw new InvalidTasksError('No such task.');
  const clean = cleanText(text);
  return {
    ...entry,
    updatedAt: now,
    tasks: entry.tasks.map((t, i) => (i === index ? { ...t, text: clean } : t)),
  };
}

export function doneCount(entry: DayEntry | undefined): number {
  return entry ? entry.tasks.filter((t) => t.done).length : 0;
}
