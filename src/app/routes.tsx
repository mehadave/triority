import { lazy } from 'react';

const loaders = {
  '/cal': () => import('../screens/CalScreen'),
  '/extras': () => import('../screens/ExtrasScreen'),
} as const;

export const CalScreen = lazy(loaders['/cal']);
export const ExtrasScreen = lazy(loaders['/extras']);

const started = new Set<string>();

/** Warm a route's chunk on hover/focus so tab switches feel instant. */
export function prefetchRoute(path: string): void {
  if (!(path in loaders) || started.has(path)) return;
  started.add(path);
  void loaders[path as keyof typeof loaders]();
}
