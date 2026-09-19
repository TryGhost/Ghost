import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { dependencies } from './create-import-manager';

const importerPath = require.resolve('../../../../../core/server/data/importer');

describe('Site importer lifecycle', function () {
  it('requires eager initialization and retains the injected instance on reboot', function () {
    const previous = require.cache[importerPath];
    delete require.cache[importerPath];
    try {
      const importer = require(importerPath);
      assert.throws(() => importer.service, /before init/);
      const deps = dependencies();
      const instance = importer.init(deps);
      assert.equal(importer.service, instance);
      assert.equal(instance.jobsService, deps.jobsService);
      assert.equal(instance.handlers, deps.handlers);
      assert.equal(instance.importers, deps.importers);
      assert.equal(instance.mailer, deps.mailer);
      const rebootDeps = dependencies();
      assert.equal(importer.init(rebootDeps), instance);
      assert.equal(instance.importers, rebootDeps.importers);
      assert.equal(instance.mailer, rebootDeps.mailer);
    } finally {
      delete require.cache[importerPath];
      if (previous) {
        require.cache[importerPath] = previous;
      }
    }
  });
});
