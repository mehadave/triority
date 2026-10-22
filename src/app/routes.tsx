import { lazy } from 'react';

const loaders = {
  '/cal': () => import('../screens/CalScreen'),
  '/extras': () => import('../screens/ExtrasScreen'),
  '/auth': () => import('../screens/AuthScreen'),
} as const;

export const CalScreen = lazy(loaders['/cal']);
export const ExtrasScreen = lazy(loaders['/extras']);
export const AuthScreen = lazy(loaders['/auth']);

const started = new Set<string>();

/** Warm a route's chunk on hover/focus so tab switches feel instant. */
export function prefetchRoute(path: string): void {
  if (!(path in loaders) || started.has(path)) return;
  started.add(path);
  void loaders[path as keyof typeof loaders]();
}
