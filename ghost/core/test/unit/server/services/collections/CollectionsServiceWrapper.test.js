const assert = require('assert/strict');
const collectionsServiceWrapper = require('../../../../../core/server/services/collections');
const {CollectionsService} = require('@tryghost/collections');

describe('CollectionsServiceWrapper', function () {
    it('Exposes a valid instance of CollectionsServiceWrapper', async function () {
        assert.ok(collectionsServiceWrapper);
        assert.ok(collectionsServiceWrapper.api);
        assert.ok(collectionsServiceWrapper.api instanceof CollectionsService);
    });
});
