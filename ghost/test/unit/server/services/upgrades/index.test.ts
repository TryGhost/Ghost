import assert from 'node:assert/strict';
import upgrades from '../../../../../core/server/services/upgrades';
import { UpgradeService } from '../../../../../core/server/services/upgrades/upgrade-service';

const adapterManager = require('../../../../../core/server/services/adapter-manager').default;

describe('Upgrades service root', function () {
  afterEach(function () {
    adapterManager.clearCache();
  });

  it('constructs one service backed by the configured adapter', async function () {
    await upgrades.init();
    const service = upgrades.service;
    await upgrades.init();

    assert.ok(service instanceof UpgradeService);
    assert.equal(upgrades.service, service);
    assert.deepEqual(await service.getStatus(), { supported: false, reason: 'not-configured' });
  });
});
