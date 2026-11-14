import assert from 'node:assert/strict';
import { IncorrectUsageError } from '@tryghost/errors';
import type serviceRoot from '../../../../../core/server/services/action-log';

// Match the root's CommonJS loading path so instanceof uses the same constructor.
const { ActionLogService } =
  require('../../../../../core/server/services/action-log/service') as typeof import('../../../../../core/server/services/action-log/service');
const ROOT_PATH = require.resolve('../../../../../core/server/services/action-log');

describe('ActionLogService root', function () {
  let originalModule: NodeJS.Module | undefined;
  let root: typeof serviceRoot;

  beforeEach(function () {
    // Reload only the root and restore its cache entry for other tests' consumers.
    originalModule = require.cache[ROOT_PATH];
    delete require.cache[ROOT_PATH];
    root = require(ROOT_PATH).default as typeof serviceRoot;
  });

  afterEach(function () {
    if (originalModule) {
      require.cache[ROOT_PATH] = originalModule;
    } else {
      delete require.cache[ROOT_PATH];
    }
  });

  it('requires initialization and retains one wired instance', async function () {
    assert.throws(() => root.service, IncorrectUsageError);

    await Promise.all([root.init(), root.init()]);
    const service = root.service;
    assert.ok(service instanceof ActionLogService);

    await root.init();
    assert.equal(root.service, service);
  });

  // Add behavior, dependency timing, and partial-startup failure/retry tests as needed.
});
