const should = require('should');
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

            should.not.exist(response.posts[0].published_by);
            should.exist(response.posts[0].title);

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

            should.not.exist(response.post.published_by);
            should.exist(response.post.title);

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

            should.not.exist(response.pages[0].published_by);
            should.not.exist(response.pages[1].published_by);
            should.exist(response.pages[0].authors);
            should.exist(response.pages[0].authors[0].slug);
        });
    });
});
