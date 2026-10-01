import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

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
});
