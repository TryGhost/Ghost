const assert = require('assert').strict;
const configUtils = require('../utils/configUtils');

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
