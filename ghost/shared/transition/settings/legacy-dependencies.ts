import type { SettingsTransition } from '../../settings/dependencies';

/**
 * What settings still takes from legacy Core. TRANSITIONAL: every member is a
 * module-level instance in `ghost/core`, read here so that
 * `ghost/shared/settings` itself imports none of them. See
 * `../../settings/dependencies.ts` for why each one is not handed over yet.
 *
 * Each is read when it is used, not when this is built: tests replace methods
 * on the legacy modules, and the models registry is slow to load.
 */
export function legacyDependencies(): SettingsTransition {
  return {
    get SettingsModel() {
      return require('../../../core/server/models').Settings;
    },
    get cache() {
      return require('../../../core/shared/settings-cache');
    },
    get events() {
      return require('../../../core/server/lib/common/events');
    },
    cacheStore: () =>
      require('../../../core/server/services/adapter-manager').default.getAdapter('cache:settings'),
    calculatedFields: () =>
      require('../../../core/server/services/settings/settings-service').getCalculatedFields(),
    track: (name, run) => require('../../../core/server/lib/tracing').tracer.track(name, run),
    generatePrivateSiteAccessCode: () =>
      require('../../../core/server/services/settings/private-site-access-code').generatePrivateSiteAccessCode(),
  };
}
