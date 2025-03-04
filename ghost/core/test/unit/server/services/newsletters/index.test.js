const models = require('../../../../../core/server/models');
const assert = require('assert/strict');

describe('Newsletters Service', function () {
    let newslettersService;

    before(function () {
        models.init();
    });

    describe('Newsletter Service', function () {
        it('Provides expected public API', async function () {
            newslettersService = require('../../../../../core/server/services/newsletters');

            assert.ok(newslettersService.browse);
            assert.ok(newslettersService.edit);
            assert.ok(newslettersService.add);
            assert.ok(newslettersService.verifyPropertyUpdate);
        });
    });
});
