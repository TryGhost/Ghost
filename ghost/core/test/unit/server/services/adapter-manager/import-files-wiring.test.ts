import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { Provider } from 'nconf';
import { bindAll as bindUrlHelpers } from '@tryghost/config-url-helpers';
import defaults from '../../../../../core/shared/config/defaults.json';
import { AdapterManager } from '../../../../../core/server/services/adapter-manager/adapter-manager';
import { baseClasses } from '../../../../../core/server/services/adapter-manager/base-classes';
import { bindAll as bindHelpers } from '../../../../../core/shared/config/helpers';
import type { ConfigInstance } from '../../../../../core/shared/config/loader';

// The adapter-manager is required via its `.default` export (so its methods stay
// stubbable) and config-utils is untyped JS, so neither can be imported.
// ImportFileStoreBase is required rather than imported so that we compare against
// the same class the adapter loader resolves: it loads adapters with `require`,
// which reads the package's compiled build, whereas an ESM import here resolves
// to the package source and would fail the `instanceof` check.
const { ImportFileStoreBase } = require('@tryghost/adapter-base-import-files');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const configUtils = require('../../../../utils/config-utils');

describe('adapter-manager import-files wiring', function () {
  afterEach(async function () {
    await configUtils.restore();
    adapterManager.clearCache();
  });

  it('returns a FileStore instance extending ImportFileStoreBase by default', function () {
    const store = adapterManager.getAdapter('import-files');

    assert.ok(store instanceof ImportFileStoreBase);
    assert.equal(store.constructor.name, 'FileStore');
    assert.deepEqual([...store.requiredFns], ['put', 'get', 'head', 'delete']);
  });

  it('keeps import files in a per-user folder of the OS temp directory unless configured otherwise', function () {
    const store = adapterManager.getAdapter('import-files');

    const suffix = typeof process.getuid === 'function' ? `-${process.getuid()}` : '';
    assert.equal(store.basePath, path.join(os.tmpdir(), `ghost-import-files${suffix}`));
  });

  it('honours a configured basePath', function () {
    configUtils.set('adapters:import-files:FileStore', { basePath: '/var/lib/ghost/import-files' });
    adapterManager.clearCache();

    const store = adapterManager.getAdapter('import-files');

    assert.equal(store.basePath, '/var/lib/ghost/import-files');
  });

  it('registers FileStore as the default in the shipped config', function () {
    assert.equal(defaults.adapters['import-files'].active, 'FileStore');
    assert.ok(defaults.adapters['import-files'].FileStore);
  });

  it('rejects a misconfigured FileStore at boot with a clear error', function () {
    configUtils.set('adapters:import-files:FileStore', { basePath: '' });
    adapterManager.clearCache();

    assert.throws(
      () => {
        adapterManager.init();
      },
      (err: Error & { errorType?: string }) => {
        assert.equal(err.errorType, 'IncorrectUsageError');
        assert.match(err.message, /import-files: .*basePath/);
        return true;
      },
    );
  });

  it('rejects an import-files adapter that lacks one of the four required methods', function () {
    // The loader is replaced so the class under test never has to exist on disk.
    class Incomplete extends ImportFileStoreBase {
      async put() {
        return { size: 0, contentType: 'text/plain' };
      }
      async get() {
        throw new Error('unused');
      }
      async head() {
        return null;
      }
    }
    const nconf = new Provider();
    nconf.use('memory');
    nconf.set('paths:contentPath', '/some/path');
    nconf.set('adapters', { 'import-files': { active: 'Incomplete', Incomplete: {} } });
    bindUrlHelpers(nconf);
    bindHelpers(nconf);
    const manager = new AdapterManager({
      loadAdapterFromPath: () => Incomplete,
      pathsToAdapters: ['first/path'],
      config: nconf as unknown as ConfigInstance,
      baseClasses,
    });

    assert.throws(
      () => {
        manager.getAdapter('import-files');
      },
      (err: Error & { errorType?: string }) => {
        assert.equal(err.errorType, 'IncorrectUsageError');
        assert.match(err.message, /import-files adapter Incomplete is missing the delete method/);
        return true;
      },
    );
  });

  it('rejects an unknown active adapter with a clear error', function () {
    configUtils.set('adapters:import-files:active', 'MissingStore');
    adapterManager.clearCache();

    assert.throws(
      () => {
        adapterManager.getAdapter('import-files');
      },
      (err: Error & { errorType?: string }) => {
        assert.equal(err.errorType, 'IncorrectUsageError');
        assert.match(err.message, /Unable to find import-files adapter MissingStore/);
        return true;
      },
    );
  });
});
