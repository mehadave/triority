import * as z from 'zod/mini';
import { isDateKey } from './dates';
import { AFFIRMATION_MAX, MAX_CUSTOM_AFFIRMATIONS, TASKS_PER_DAY, TASK_MAX } from './types';

export const dateKeySchema = z.string().check(z.refine(isDateKey, 'Invalid date'));

export const taskSchema = z.object({
  text: z.string().check(z.trim(), z.minLength(1), z.maxLength(TASK_MAX)),
  done: z.boolean(),
  doneAt: z.nullable(z.iso.datetime({ offset: true })),
});

export const dayEntrySchema = z.object({
  date: dateKeySchema,
  tasks: z.array(taskSchema).check(z.length(TASKS_PER_DAY)),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const streakStateSchema = z.object({
  current: z.number().check(z.int(), z.gte(0)),
  best: z.number().check(z.int(), z.gte(0)),
  saviors: z.number().check(z.int(), z.gte(0), z.lte(2)),
  lastSaviorGrantMonth: z.nullable(z.string().check(z.regex(/^\d{4}-\d{2}$/))),
  savedDates: z.array(dateKeySchema),
});

export const affirmationSchema = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(64)),
  text: z.string().check(z.trim(), z.minLength(1), z.maxLength(AFFIRMATION_MAX)),
});

export const settingsSchema = z.object({
  reminderTime: z.nullable(z.string().check(z.regex(/^([01]\d|2[0-3]):[0-5]\d$/))),
  customAffirmations: z.array(affirmationSchema).check(z.maxLength(MAX_CUSTOM_AFFIRMATIONS)),
});

export type Affirmation = z.infer<typeof affirmationSchema>;
export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = { reminderTime: null, customAffirmations: [] };

export const exportSchema = z.object({
  app: z.literal('triority'),
  version: z.literal(1),
  exportedAt: z.string(),
  entries: z.array(dayEntrySchema),
  streak: streakStateSchema,
  settings: settingsSchema,
});

export type ExportData = z.infer<typeof exportSchema>;
