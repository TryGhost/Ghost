const should = require('should');
const serializers = require('../../../../../../../core/server/api/canary/utils/serializers');

describe('Unit: canary/utils/serializers/output/all', function () {
    describe('after', function () {
        it('x_by', function () {
            const apiConfig = {};
            let response = {
                posts: [
                    {
                        created_by: 'xxx',
                        title: 'xxx'
                    }
                ]
            };

            serializers.output.all.after(apiConfig, {
                response: response
            });

            should.not.exist(response.posts[0].created_by);
            should.exist(response.posts[0].title);

            response = {
                post:
                    {
                        created_by: 'xxx',
                        updated_by: 'yyy',
                        title: 'xxx'
                    }
            };

            serializers.output.all.after(apiConfig, {
                response: response
            });

            should.not.exist(response.post.created_by);
            should.not.exist(response.post.updated_by);
            should.exist(response.post.title);

            response = {
                pages: [
                    {
                        created_by: 'xxx',
                        authors: [
                            {
                                updated_by: 'yyy',
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

            should.not.exist(response.pages[0].created_by);
            should.not.exist(response.pages[1].published_by);
            should.exist(response.pages[0].authors);
            should.exist(response.pages[0].authors[0].slug);
            should.not.exist(response.pages[0].authors[0].updated_by);
        });
    });
});
