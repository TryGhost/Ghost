import { afterEach, beforeEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { runImportFileStoreContractTests } from '@tryghost/adapter-base-import-files/contract-test-suite';

// config-utils is untyped JS and the adapter-manager is required for its
// `.default` export. The store class is required too, so this file exercises
// the same module instance the adapter loader resolves; an ESM import would
// load a second copy and the coverage would land on the wrong one.
const FileStore = require('../../../../core/server/adapters/import-files/FileStore').default;
const adapterManager = require('../../../../core/server/services/adapter-manager').default;
const configUtils = require('../../../utils/config-utils');

// The contract suite also runs from the unit project. It runs here as well so
// the store's lines count towards the coverage Ghost uploads, which excludes
// unit tests.
describe('Integration: import-files FileStore', function () {
  let basePath: string;

  beforeEach(function () {
    basePath = path.join(os.tmpdir(), `import-files-integration-${crypto.randomUUID()}`);
  });

  afterEach(async function () {
    await fs.remove(basePath);
    await configUtils.restore();
    adapterManager.clearCache();
  });

  runImportFileStoreContractTests(() => new FileStore({ basePath }), { describe, it });

  it('round-trips a file through the store the adapter manager resolves from config', async function () {
    configUtils.set('adapters:import-files:FileStore', { basePath });
    adapterManager.clearCache();
    const store = adapterManager.getAdapter('import-files');
    const key = 'members-import/run1/rows.ndjson';

    await store.put(key, Buffer.from('{"email":"a@example.com"}\n'), {
      contentType: 'application/x-ndjson',
    });

    assert.equal(
      await fs.readFile(path.join(basePath, 'members-import/run1/rows.ndjson'), 'utf8'),
      '{"email":"a@example.com"}\n',
    );
    assert.deepEqual(await store.head(key), { size: 26, contentType: 'application/x-ndjson' });

    await store.delete(key);

    assert.equal(await fs.pathExists(path.join(basePath, 'members-import/run1')), false);
    // The kind directory is shared by every members import and stays in place.
    assert.equal(await fs.pathExists(path.join(basePath, 'members-import')), true);
  });
});
