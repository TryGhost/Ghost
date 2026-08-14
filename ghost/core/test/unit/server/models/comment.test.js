const assert = require('node:assert/strict');
const {Comment} = require('../../../../core/server/models/comment');

describe('Unit: models/comment', function () {
    describe('defaultRelations', function () {
        it('includes member dislike state but not public dislike counts by default', function () {
            const options = {};

            Comment.defaultRelations('findPage', options);

            assert.ok(options.withRelated.includes('count.likes'));
            assert.ok(!options.withRelated.includes('count.dislikes'));
            assert.ok(options.withRelated.includes('count.disliked'));
            assert.ok(options.withRelated.includes('count.net_score'));
        });

        it('includes dislike count relations for admin requests', function () {
            const options = {
                isAdmin: true
            };

            Comment.defaultRelations('findPage', options);

            assert.ok(options.withRelated.includes('count.likes'));
            assert.ok(options.withRelated.includes('count.dislikes'));
            assert.ok(options.withRelated.includes('count.disliked'));
            assert.ok(options.withRelated.includes('count.net_score'));
        });

        it('scopes non-page reply tombstone filtering to the loaded comment', function () {
            const options = {
                id: 'root-comment-id'
            };

            Comment.defaultRelations('findOne', options);

            const repliesRelation = options.withRelated.find((relation) => {
                return typeof relation === 'object' && relation.replies;
            });
            let query;
            const qb = {
                whereIn(_column, rawQuery) {
                    query = rawQuery.toSQL();
                }
            };

            repliesRelation.replies(qb);

            assert.match(query.sql, /comments\.parent_id IN \(\?\)/);
            assert.equal(query.bindings.filter(binding => binding === 'root-comment-id').length, 2);
        });
    });

    describe('orderAttributes', function () {
        it('does not expose dislike count ordering directly', function () {
            const attributes = Comment.forge().orderAttributes();

            assert.ok(attributes.includes('count__likes'));
            assert.ok(attributes.includes('count__net_score'));
            assert.ok(!attributes.includes('count__dislikes'));
        });
    });
});
