const assert = require('node:assert/strict');
const configUtils = require('../utils/config-utils');

function clearModuleCache() {
  delete require.cache[require.resolve('../../core/shared/prometheus-client')];
}

function getFreshPrometheusClient() {
  clearModuleCache();
  return require('../../core/shared/prometheus-client');
}

describe('Integration: prometheus-client', function () {
  let prometheusClient;

  beforeEach(function () {
    if (prometheusClient) {
      prometheusClient.client.register.clear();
    }
  });

  afterAll(async function () {
    // Files share this process: don't leave the enabled flag, the default
    // metrics or a test-built client in the require cache for later files.
    if (prometheusClient) {
      prometheusClient.stop();
      prometheusClient.client.register.clear();
    }
    clearModuleCache();
    await configUtils.restore();
  });

  it('should export an instance of the prometheus client if it is enabled', async function () {
    configUtils.set('prometheus:enabled', true);
    prometheusClient = getFreshPrometheusClient();
    assert.ok(prometheusClient);
  });

  it('should not create a new instance if one already exists', async function () {
    configUtils.set('prometheus:enabled', true);
    prometheusClient = getFreshPrometheusClient();
    const prometheusClient2 = require('../../core/shared/prometheus-client');
    assert.equal(prometheusClient, prometheusClient2);
  });

  it('should not export an instance of the prometheus client if it is disabled', async function () {
    configUtils.set('prometheus:enabled', false);
    prometheusClient = getFreshPrometheusClient();
    assert.equal(prometheusClient, undefined);
  });
});
