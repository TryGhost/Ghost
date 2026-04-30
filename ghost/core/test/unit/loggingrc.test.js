const assert = require('node:assert/strict');
const configUtils = require('../utils/config-utils');

describe('loggingrc', function () {
    beforeEach(async function () {
        await configUtils.restore();
    });

    afterEach(async function () {
        await configUtils.restore();
        delete require.cache[require.resolve('../../loggingrc')]; // cleanup
    });

    it('sets useLibrary to true when threshold is provided', function () {
        configUtils.set('logging:rotation', {threshold: '10m'});
        
        delete require.cache[require.resolve('../../loggingrc')];
        const loggingrc = require('../../loggingrc');
        
        assert.equal(loggingrc.rotation.useLibrary, true);
    });

    it('sets useLibrary to true when gzip is provided', function () {
        configUtils.set('logging:rotation', {gzip: true});
        
        delete require.cache[require.resolve('../../loggingrc')];
        const loggingrc = require('../../loggingrc');
        
        assert.equal(loggingrc.rotation.useLibrary, true);
    });

    it('does not set useLibrary when advanced fields are missing', function () {
        configUtils.set('logging:rotation', {enabled: true});
        
        delete require.cache[require.resolve('../../loggingrc')];
        const loggingrc = require('../../loggingrc');
        
        assert.equal(loggingrc.rotation.useLibrary, undefined);
    });
});
