import { lazy } from 'react';

const loaders = {
  '/cal': () => import('../screens/CalScreen'),
  '/settings': () => import('../screens/SettingsScreen'),
  '/about': () => import('../screens/AboutScreen'),
} as const;

export const CalScreen = lazy(loaders['/cal']);
export const SettingsScreen = lazy(loaders['/settings']);
export const AboutScreen = lazy(loaders['/about']);

const started = new Set<string>();

/** Warm a route's chunk on hover/focus so tab switches feel instant. */
export function prefetchRoute(path: string): void {
  if (!(path in loaders) || started.has(path)) return;
  started.add(path);
  void loaders[path as keyof typeof loaders]();
}
