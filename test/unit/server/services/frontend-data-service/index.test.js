const models = require('../../../../../core/server/models');
const assert = require('assert');

describe('Frontend Data Service', function () {
    let frontendDataService;

    before(function () {
        models.init();
    });

    it('Provides expected public API', async function () {
        frontendDataService = require('../../../../../core/server/services/frontend-data-service');

        assert.ok(frontendDataService.init);
    });

    it('init gets an integration model', function () {
        frontendDataService = require('../../../../../core/server/services/frontend-data-service');
        let instance = frontendDataService.init();

        assert.ok(instance.IntegrationModel);
        assert.equal(instance.frontendKey, null);
    });
});
