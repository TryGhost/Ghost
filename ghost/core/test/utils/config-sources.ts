import _ from 'lodash';
import defaults from '../../core/shared/config/defaults.json';
import overrides from '../../core/shared/config/overrides.json';

/**
 * The smallest sources tree the central schema accepts, for tests that call
 * `createConfig()` directly rather than going through the loader.
 *
 * Only the keys ./core/shared/config/schema.ts requires, and no more: a test
 * asserting on how many adapters it configured should not silently inherit the
 * five in defaults.json. `paths` is layered out of the shipped files the way
 * loader.ts layers them, so its keys stay correct without being restated here.
 *
 * `extra` is merged last so a test can pin the one value it cares about, and
 * deeply, so pinning `paths:contentPath` leaves the other path keys in place.
 */
export function configSources(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return _.merge(
    {},
    {
      env: 'testing',
      url: 'http://localhost:2368',
      paths: { ...defaults.paths, ...overrides.paths },
    },
    extra,
  );
}
