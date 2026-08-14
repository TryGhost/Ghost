const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../../utils/assertions');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

describe('Unit: endpoints/utils/serializers/output/all', function () {
    describe('after', function () {
        it('x_by', function () {
            const apiConfig = {};
            let response = {
                posts: [
                    {
                        published_by: 'xxx',
                        title: 'xxx'
                    }
                ]
            };

            serializers.output.all.after(apiConfig, {
                response: response
            });

            assert.equal(response.posts[0].published_by, undefined);
            assertExists(response.posts[0].title);

            response = {
                post:
                    {
                        published_by: 'xxx',
                        title: 'xxx'
                    }
            };

            serializers.output.all.after(apiConfig, {
                response: response
            });

            assert.equal(response.post.published_by, undefined);
            assertExists(response.post.title);

            response = {
                pages: [
                    {
                        published_by: 'xxx',
                        authors: [
                            {
                                slug: 'ghost'
                            }
                        ]
                    },
                    {
                        published_by: 'yyy'
                    }
                ]
            };

            serializers.output.all.after(apiConfig, {
                response: response
            });

            assert.equal(response.pages[0].published_by, undefined);
            assert.equal(response.pages[1].published_by, undefined);
            assertExists(response.pages[0].authors);
            assertExists(response.pages[0].authors[0].slug);
        });

        it('removes a null published_by', function () {
            const response = {post: {published_by: null, title: 'xxx'}};

            serializers.output.all.after({}, {response});

            assert.equal('published_by' in response.post, false);
            assertExists(response.post.title);
        });

        it('removes published_by from deeply nested resources', function () {
            const response = {
                posts: [
                    {
                        title: 'xxx',
                        published_by: 'xxx',
                        tiers: [{name: 'free', published_by: 'yyy'}]
                    }
                ]
            };

            serializers.output.all.after({}, {response});

            assert.equal('published_by' in response.posts[0], false);
            assert.equal('published_by' in response.posts[0].tiers[0], false);
            assert.equal(response.posts[0].tiers[0].name, 'free');
        });

        it('preserves existing behavior for object-valued published_by', function () {
            const response = {
                post: {
                    published_by: {
                        id: 'user-1',
                        published_by: 'nested'
                    },
                    title: 'xxx'
                }
            };

            serializers.output.all.after({}, {response});

            assert.equal('published_by' in response.post, true);
            assert.equal(response.post.published_by.id, 'user-1');
            assert.equal('published_by' in response.post.published_by, false);
            assertExists(response.post.title);
        });
    });
});
