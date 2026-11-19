import { defineService } from '@tryghost/kernel/define-service';
import type { SettingsGiven, SettingsTransition } from './dependencies';
import { startSettings } from './start-settings';

/**
 * Settings: the key-value pairs the site stores, used in critical pathways
 * and as public data such as the site title.
 *
 * It is given the foundation, limits (the `publicSiteAccess` limit decides
 * whether the site is made private, so limits start first) and what it still
 * takes from legacy Core, which `./dependencies.ts` lists with the reason for
 * each.
 *
 * The instance is the settings cache. Settings does not build it yet: the
 * cache is built when `core/shared/settings-cache` is imported, and this root
 * is handed that one. Every start stores missing defaults and rebuilds the
 * cache from the database, so a process that starts Ghost again gets fresh
 * settings.
 */
export default defineService<SettingsTransition['cache'], SettingsGiven>('Settings', {
  create: ({ 'settings-transition': transition }) => transition.cache,
  start: (_cache, given) => startSettings(given),
});
