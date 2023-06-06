const assert = require('assert');
const collectionsServiceWrapper = require('../../../../../core/server/services/collections');

describe('CollectionsServiceWrapper', function () {
    it('Exposes a valid instance of CollectionsServiceWrapper', async function () {
        assert.ok(collectionsServiceWrapper);
        assert.ok(collectionsServiceWrapper.api);
        assert.deepEqual(Object.keys(collectionsServiceWrapper.api), [
            'browse',
            'read',
            'add',
            'edit',
            'addPost',
            'destroy',
            'destroyCollectionPost'
        ]);
    });
});
