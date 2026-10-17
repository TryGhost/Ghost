import assert from 'node:assert/strict';

// Required, not imported: the loader resolves adapters with `require`, which reads the
// package build, so an ESM import of the source would fail the `instanceof` check.
const { UpgradeBase } = require('@tryghost/adapter-base-upgrade');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;

describe('adapter-manager upgrade wiring', function () {
  afterEach(function () {
    adapterManager.clearCache();
  });

  it('returns the NoopUpgradeAdapter by default', async function () {
    const adapter = adapterManager.getAdapter('upgrade');

    assert.ok(adapter instanceof UpgradeBase);
    assert.equal(adapter.constructor.name, 'NoopUpgradeAdapter');
    assert.deepEqual(await adapter.getStatus(), { supported: false, reason: 'not-configured' });
    await assert.rejects(adapter.createRequest(), { code: 'unsupported' });
    assert.deepEqual(await adapter.getJob('id'), { id: 'id', state: 'unknown' });
  });
});
