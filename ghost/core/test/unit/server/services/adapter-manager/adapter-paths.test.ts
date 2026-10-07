import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AdapterManager } from '../../../../../core/server/services/adapter-manager/adapter-manager';
import { buildAdapterPaths } from '../../../../../core/server/services/adapter-manager/adapter-paths';
import { createConfig } from '../../../../../core/shared/config/validated';
import type { ConfigInstance } from '../../../../../core/shared/config/loader';
import type { Adapter } from '../../../../../core/server/services/adapter-manager/types';

class BaseStorageAdapter implements Adapter {
  readonly requiredFns: string[];

  constructor() {
    this.requiredFns = ['someMethod'];
  }
}

// A minimal config instance, seeded with a real `paths:contentPath`, mirroring
// the shape production config provides so `getContentPath('adapters')` resolves
// exactly as it would at runtime.
function makeConfig(contentPath: string, adapters: object = {}): ConfigInstance {
  return createConfig({
    url: 'http://localhost:2368',
    env: 'testing',
    paths: {
      contentPath,
      // No installed adapters path is relevant to this test, so it is left
      // unset, matching how `installedAdaptersPath` is optional in production.
      internalAdaptersPath: path.join(os.tmpdir(), 'ghost-adapter-test-nonexistent-internal'),
    },
    adapters,
  });
}

describe('adapter-paths', function () {
  it('finds an adapter placed in content/adapters/<type>/<name> per the documented convention, and reports its own missing dependency rather than "unable to find adapter"', function () {
    // Regression test for https://github.com/TryGhost/Ghost/issues/22883:
    // a storage adapter placed under content/adapters/storage/<Name>/, per
    // https://docs.ghost.org/config/#location, that itself requires a
    // missing npm dependency (e.g. aws-sdk) was misreported as "unable to
    // find storage adapter" instead of surfacing the real missing-dependency
    // error, because `loadAdapterClass` matched the adapter's own path
    // against Node's full MODULE_NOT_FOUND message - which always includes
    // a trailing "Require stack" naming that same path - and treated any
    // match as "not found here", silently moving on to the next search path.
    const contentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-content-'));

    try {
      const adapterName = 'CustomStorageAdapter';
      // Realistic layout: content/adapters/storage/<Name>/index.js
      const adapterDir = path.join(contentDir, 'adapters', 'storage', adapterName);
      fs.mkdirSync(adapterDir, { recursive: true });
      fs.writeFileSync(
        path.join(adapterDir, 'index.js'),
        `require('this-npm-package-does-not-exist-at-all');\nmodule.exports = class {};`,
      );

      const config = makeConfig(contentDir, { storage: { active: adapterName } });
      const pathsToAdapters = buildAdapterPaths(config);

      // Sanity check: the content adapters path really is last in the list,
      // matching the documented "content wins last" resolution order.
      assert.equal(pathsToAdapters[pathsToAdapters.length - 1], config.getContentPath('adapters'));

      const adapterManager = new AdapterManager({
        loadAdapterFromPath: require,
        pathsToAdapters,
        config,
        baseClasses: { storage: BaseStorageAdapter },
      });

      assert.throws(
        () => {
          adapterManager.getAdapter('storage');
        },
        {
          errorType: 'IncorrectUsageError',
          // Must be the specific missing-dependency error naming the
          // adapter's own unresolved package, NOT the generic
          // "Unable to find storage adapter" fallback the issue reported.
          message: /missing a dependency 'this-npm-package-does-not-exist-at-all' in your adapter/,
        },
      );
    } finally {
      fs.rmSync(contentDir, { recursive: true, force: true });
    }
  });
});
