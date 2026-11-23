import assert from 'node:assert/strict';

import { openServices, services } from '../../../../utils/services';

// Required, not imported: an `import` would load a second copy of the root, whose `.service`
// asks an application other than the one `openServices()` opens.
const {
  UpgradeService,
}: typeof import('../../../../../core/server/services/upgrades/upgrade-service') = require('../../../../../core/server/services/upgrades/upgrade-service');
const upgrades: typeof import('../../../../../core/server/services/upgrades').default =
  require('../../../../../core/server/services/upgrades').default;
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;

describe('Upgrades service root', function () {
  afterEach(function () {
    adapterManager.clearCache();
  });

  it('constructs one service backed by the configured adapter', async function () {
    openServices();
    const service = services.get(upgrades);

    assert.ok(service instanceof UpgradeService);
    assert.equal(services.get(upgrades), service);
    assert.deepEqual(await service.getStatus(), { supported: false, reason: 'not-configured' });
  });
});
