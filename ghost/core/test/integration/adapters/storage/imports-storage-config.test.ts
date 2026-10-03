import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import _ from 'lodash';

import defaults from '../../../../core/shared/config/defaults.json';
import {
  normalizeAdapterConfig,
  resolveAdapterOptions,
} from '../../../../core/server/services/adapter-manager/utils';
import { createConfig } from '../../../../core/shared/config/validated';

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
  const config = createConfig(
    _.merge({}, structuredClone(defaults), { env: 'testing' }, siteConfig),
  );

  return resolveAdapterOptions(feature, normalizeAdapterConfig(config));
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
