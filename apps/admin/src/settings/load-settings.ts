import { preloadComponent } from '@/shared/use-lazy-component';

export const loadSettingsScreen = () => import('./settings');
// Loading sections separately lets Settings navigation show first on a cold load.
export const loadSettingsContent = () => import('./layout/main-content');

/** Warm both stages of Settings without mounting providers or fetching screen data. */
export function preloadSettings(): void {
  // Leave failures for the mounted screen to surface through its error boundary.
  preloadComponent(loadSettingsScreen).catch(() => undefined);
  preloadComponent(loadSettingsContent).catch(() => undefined);
}
