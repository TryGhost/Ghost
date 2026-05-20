const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');

describe('Unit: models/comment', function () {
    describe('defaultRelations', function () {
        it('does not include dislike count relations unless comment dislikes are enabled', function () {
            const options = {};

            models.Comment.defaultRelations('findPage', options);

            assert.ok(options.withRelated.includes('count.likes'));
            assert.ok(!options.withRelated.includes('count.dislikes'));
            assert.ok(!options.withRelated.includes('count.disliked'));
            assert.ok(!options.withRelated.includes('count.net_score'));
        });

        it('includes dislike count relations when comment dislikes are enabled', function () {
            const options = {
                commentDislikesEnabled: true
            };

            models.Comment.defaultRelations('findPage', options);

            assert.ok(options.withRelated.includes('count.likes'));
            assert.ok(options.withRelated.includes('count.dislikes'));
            assert.ok(options.withRelated.includes('count.disliked'));
            assert.ok(options.withRelated.includes('count.net_score'));
        });
    });

    describe('orderAttributes', function () {
        it('does not expose dislike count ordering directly', function () {
            const attributes = models.Comment.forge().orderAttributes();

            assert.ok(attributes.includes('count__likes'));
            assert.ok(attributes.includes('count__net_score'));
            assert.ok(!attributes.includes('count__dislikes'));
        });
    });
});
