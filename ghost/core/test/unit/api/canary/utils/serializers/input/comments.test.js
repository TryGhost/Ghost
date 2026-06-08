const assert = require('node:assert/strict');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

describe('Unit: endpoints/utils/serializers/input/comments', function () {
    describe('all', function () {
        it('converts member reaction includes to count relations', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {},
                    withRelated: ['liked', 'disliked', 'replies.liked', 'replies.disliked', 'member']
                }
            };

            serializers.input.comments.all(apiConfig, frame);

            assert.deepEqual(frame.options.withRelated, [
                'count.liked',
                'count.disliked',
                'replies.count.liked',
                'replies.count.disliked',
                'member'
            ]);
        });

        it('loads post routing relations when post is included', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {},
                    withRelated: ['post']
                }
            };

            serializers.input.comments.all(apiConfig, frame);

            assert.deepEqual(frame.options.withRelated, ['post', 'post.tags', 'post.authors']);
        });
    });
});
