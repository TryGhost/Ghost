const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');

describe('Unit: models/GiftLink', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('is registered on the models index', function () {
        assert(models.GiftLink);
    });

    it('uses the gift_links table', function () {
        const model = models.GiftLink.forge({id: 'any'});
        assert.equal(model.tableName, 'gift_links');
    });

    it('has a post relation', function () {
        const model = models.GiftLink.forge({id: 'any'});
        // Calling the relation method should not throw
        model.post();
    });

    it('Post has a gift_links relation', function () {
        const post = models.Post.forge({id: 'any'});
        post.gift_links();
    });
});
