import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

const {
  createImportManager,
} = require('../../../../../core/server/data/importer/create-import-manager');
const importerPath = require.resolve('../../../../../core/server/data/importer');

describe('Site importer lifecycle', function () {
  it('requires eager initialization and hands out the importer the last boot built', function () {
    const previous = require.cache[importerPath];
    delete require.cache[importerPath];
    try {
      const importer = require(importerPath);
      assert.throws(() => importer.getInstance(), /before init/);
      const instance = importer.init();
      assert.equal(importer.getInstance(), instance);
      const rebooted = importer.init();
      assert.notEqual(rebooted, instance);
      assert.equal(importer.getInstance(), rebooted);
    } finally {
      delete require.cache[importerPath];
      if (previous) {
        require.cache[importerPath] = previous;
      }
    }
  });

  // Streaming reads are not part of the storage base contract, so a third-party
  // imports adapter without one still has to boot and serve the site.
  it('builds with an imports storage adapter that only implements the base contract', function () {
    const manager = createImportManager({ importsStorage: { save() {}, read() {}, delete() {} } });

    assert.equal(typeof manager.importFromFile, 'function');
  });
});
