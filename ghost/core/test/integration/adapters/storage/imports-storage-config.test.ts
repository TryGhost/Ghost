import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { Provider } from 'nconf';
import { bindAll as bindUrlHelpers } from '@tryghost/config-url-helpers';

import defaults from '../../../../core/shared/config/defaults.json';
import {
  normalizeAdapterConfig,
  resolveAdapterOptions,
} from '../../../../core/server/services/adapter-manager/utils';
import { bindAll as bindHelpers } from '../../../../core/shared/config/helpers';

// The shape Ghost(Pro) configures: image, media and file features on a shared
// S3Storage block, and nothing for imports.
const PRO_STORAGE = {
  images: { adapter: 'S3Storage', staticFileURLPrefix: 'content/images' },
  media: { adapter: 'S3Storage', staticFileURLPrefix: 'content/media' },
  files: { adapter: 'S3Storage', staticFileURLPrefix: 'content/files' },
  S3Storage: { bucket: 'assets', tenantPrefix: 'c/ab/cd/site' },
};

const LOCAL_IMPORTS = {
  adapterClassName: 'LocalStorageBase',
  adapterConfig: { staticFileURLPrefix: 'content/imports' },
};

// Site config layered over the shipped defaults, as the config loader layers its files.
function resolveFor(feature: string, siteConfig: object) {
  const nconf = new Provider();
  nconf.add('site', { type: 'literal', store: siteConfig });
  // A copy, because nconf's merge writes into the lower store's objects.
  nconf.add('defaults', { type: 'literal', store: structuredClone(defaults) });
  bindUrlHelpers(nconf);
  bindHelpers(nconf);

  return resolveAdapterOptions(feature, normalizeAdapterConfig(nconf));
}

// End-to-end suites boot with the shipped storage config only, so the site configs
// that must keep import files off the images store are covered here.
describe('Integration: storage:imports default', function () {
  it('keeps import files on the local default when Ghost(Pro) configures storage', function () {
    assert.deepEqual(resolveFor('storage:imports', { storage: PRO_STORAGE }), LOCAL_IMPORTS);
    assert.equal(
      resolveFor('storage:images', { storage: PRO_STORAGE }).adapterClassName,
      'S3Storage',
    );
  });

  it('keeps import files on the local default when storage is configured under adapters', function () {
    assert.deepEqual(
      resolveFor('storage:imports', { adapters: { storage: PRO_STORAGE } }),
      LOCAL_IMPORTS,
    );
  });

  it('leaves a configured imports store alone, wherever storage is configured', function () {
    const storage = { ...PRO_STORAGE, imports: 'S3Storage' };

    for (const siteConfig of [{ storage }, { adapters: { storage } }]) {
      assert.equal(resolveFor('storage:imports', siteConfig).adapterClassName, 'S3Storage');
    }
  });
});
