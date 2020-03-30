const should = require('should'),
    testUtils = require('../../../../utils'),
    helpers = require('../../../../../core/frontend/services/routing/helpers');

describe('Unit - services/routing/helpers/format-response', function () {
    let posts, tags;

    beforeEach(function () {
        posts = [
            testUtils.DataGenerator.forKnex.createPost({slug: 'sluggy-thing'})
        ];

        tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'video', slug: 'video'})
        ];
    });

    describe('entry', function () {
        it('should return the post object wrapped in a post key', function () {
            let formatted,
                postObject = posts[0];

            formatted = helpers.formatResponse.entry(postObject);

            formatted.should.be.an.Object().with.property('post');
            formatted.post.should.eql(postObject);
        });
    });

    describe('entries', function () {
        it('should return posts and posts pagination as top level keys', function () {
            let formatted,
                data = {
                    posts: posts,
                    meta: {pagination: {}}
                };

            formatted = helpers.formatResponse.entries(data);

            formatted.should.be.an.Object().with.properties('posts', 'pagination');
            formatted.posts.should.eql(data.posts);
            formatted.pagination.should.eql(data.meta.pagination);
        });

        it('should flatten api read responses which have no pagination data', function () {
            let formatted,
                data = {
                    posts: posts,
                    meta: {pagination: {}},
                    data: {tag: tags}
                };

            formatted = helpers.formatResponse.entries(data);

            formatted.should.be.an.Object().with.properties('posts', 'pagination', 'tag');
            formatted.tag.should.eql(data.data.tag[0]);
        });

        it('should remove the meta key from api browse responses', function () {
            let formatted,
                data = {
                    posts: posts,
                    meta: {pagination: {}},
                    data: {
                        featured: {
                            posts: posts,
                            meta: {pagination: {}}
                        }
                    }
                };

            formatted = helpers.formatResponse.entries(data);

            formatted.should.be.an.Object().with.properties('posts', 'pagination', 'featured');
            formatted.featured.should.be.an.Object().with.properties('posts', 'pagination');
        });
    });
});
