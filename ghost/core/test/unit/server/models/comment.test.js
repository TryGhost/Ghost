const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');

describe('Unit: models/comment', function () {
    describe('defaultRelations', function () {
        it('includes member dislike state but not public dislike counts by default', function () {
            const options = {};

            models.Comment.defaultRelations('findPage', options);

            assert.ok(options.withRelated.includes('count.likes'));
            assert.ok(!options.withRelated.includes('count.dislikes'));
            assert.ok(options.withRelated.includes('count.disliked'));
            assert.ok(options.withRelated.includes('count.net_score'));
        });

        it('includes dislike count relations for admin requests', function () {
            const options = {
                isAdmin: true
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
