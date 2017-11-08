var should = require('should'), // jshint ignore:line

    // Stuff we are testing
    formatResponse = require('../../../../server/controllers/frontend/format-response');

describe('formatResponse', function () {
    describe('entry', function () {
        it('should return the post object wrapped in a post key', function () {
            var formatted,
                postObject = {slug: 'sluggy-thing'};

            formatted = formatResponse.entry(postObject);

            formatted.should.be.an.Object().with.property('post');
            formatted.post.should.eql(postObject);
        });
    });

    describe('channel', function () {
        it('should return posts and posts pagination as top level keys', function () {
            var formatted,
                data = {
                    posts: [{slug: 'a-post'}],
                    meta: {pagination: {}}
                };

            formatted = formatResponse.channel(data);

            formatted.should.be.an.Object().with.properties('posts', 'pagination');
            formatted.posts.should.eql(data.posts);
            formatted.pagination.should.eql(data.meta.pagination);
        });

        it('should flatten api read responses which have no pagination data', function () {
            var formatted,
                data = {
                    posts: [{slug: 'a-post'}],
                    meta: {pagination: {}},
                    data: {tag: [{name: 'video', slug: 'video', id: 1}]}
                };

            formatted = formatResponse.channel(data);

            formatted.should.be.an.Object().with.properties('posts', 'pagination', 'tag');
            formatted.tag.should.eql(data.data.tag[0]);
        });

        it('should remove the meta key from api browse responses', function () {
            var formatted,
                data = {
                    posts: [{slug: 'a-post'}],
                    meta: {pagination: {}},
                    data: {
                        featured: {
                            posts: [{id: 1, title: 'featured post 1', slug: 'featured-1'}],
                            meta: {pagination: {}}
                        }
                    }
                };

            formatted = formatResponse.channel(data);

            formatted.should.be.an.Object().with.properties('posts', 'pagination', 'featured');
            formatted.featured.should.be.an.Object().with.properties('posts', 'pagination');
        });
    });
});
