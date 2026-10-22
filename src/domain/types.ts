/** A local calendar day, formatted `yyyy-MM-dd`. */
export type DateKey = string;

export interface Task {
  text: string;
  done: boolean;
  /** ISO timestamp of when the task was ticked, or null. */
  doneAt: string | null;
}

export interface DayEntry {
  date: DateKey;
  tasks: Task[];
  updatedAt: string;
}

export interface StreakState {
  current: number;
  best: number;
  saviors: number;
  /** `yyyy-MM` of the last month a savior was granted. */
  lastSaviorGrantMonth: string | null;
  savedDates: DateKey[];
}

export type EntryIndex = ReadonlyMap<DateKey, DayEntry>;

export const TASKS_PER_DAY = 3;
export const MAX_SAVIORS = 2;
export const TASK_MAX = 80;
export const AFFIRMATION_MAX = 140;
export const MAX_CUSTOM_AFFIRMATIONS = 50;
