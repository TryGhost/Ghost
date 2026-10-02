import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AdapterManager } from '../../../../../core/server/services/adapter-manager/adapter-manager';
import type { UpgradeAdapter as Adapter } from '@tryghost/adapter-base-upgrade';
const { UpgradeAdapter } = require('@tryghost/adapter-base-upgrade');
const manager = require('../../../../../core/server/services/adapter-manager').default;
const configUtils = require('../../../../utils/config-utils');
describe('upgrade adapter wiring', () => {
  afterEach(async () => {
    await configUtils.restore();
    manager.clearCache();
  });
  it('loads the default without a supervisor at boot', async () => {
    manager.init();
    const adapter: Adapter = manager.getAdapter('upgrade');
    assert.ok(adapter instanceof UpgradeAdapter);
    assert.equal(adapter.constructor.name, 'NoopUpgradeAdapter');
    assert.deepEqual(await adapter.getStatus(), {
      supported: false,
      reason: 'not-configured',
    });
  });
});

it('loads a CommonJS host adapter and passes normalized options without supervisor I/O at boot', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-upgrade-adapter-'));
  try {
    const adapterPath = path.join(root, 'adapters/upgrade/HostUpgradeAdapter');
    fs.mkdirSync(adapterPath, { recursive: true });
    fs.writeFileSync(
      path.join(adapterPath, 'index.js'),
      `
      const {UpgradeAdapter} = require(${JSON.stringify(require.resolve('@tryghost/adapter-base-upgrade'))});
      module.exports = class HostUpgradeAdapter extends UpgradeAdapter {
        constructor(options) { super(options); this.options = options; }
        async getStatus() { return {supported: true, availability: 'unavailable', backupRequired: true}; }
        async createRequest() { throw new Error('No supervisor'); }
        async getJob(id) { return {id, state: 'unknown'}; }
      };
    `,
    );
    configUtils.set('adapters:upgrade', {
      active: 'HostUpgradeAdapter',
      HostUpgradeAdapter: {
        publicPath: path.join(root, 'missing-public'),
        requestsPath: path.join(root, 'missing-requests'),
      },
    });
    const hostManager = new AdapterManager({
      baseClasses: { upgrade: UpgradeAdapter },
      config: configUtils.config,
      loadAdapterFromPath: require,
      pathsToAdapters: [path.join(root, 'adapters')],
    });
    hostManager.init();
    const adapter = hostManager.getAdapter('upgrade');
    assert.ok(adapter instanceof UpgradeAdapter);
    assert.deepEqual(await adapter.getStatus(), {
      supported: true,
      availability: 'unavailable',
      backupRequired: true,
    });
    assert.deepEqual((adapter as Adapter & { options: object }).options, {
      publicPath: path.join(root, 'missing-public'),
      requestsPath: path.join(root, 'missing-requests'),
    });
    assert.equal(fs.existsSync(path.join(root, 'missing-public')), false);
    assert.equal(fs.existsSync(path.join(root, 'missing-requests')), false);
  } finally {
    await configUtils.restore();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
