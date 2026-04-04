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
    });
});
