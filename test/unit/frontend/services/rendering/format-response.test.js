const should = require('should');
const testUtils = require('../../../../utils');
const helpers = require('../../../../../core/frontend/services/rendering');
const {SafeString} = require('../../../../../core/frontend/services/handlebars');

describe('Unit - services/routing/helpers/format-response', function () {
    let posts;
    let tags;

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
            const postObject = posts[0];

            const formatted = helpers.formatResponse.entry(postObject);

            formatted.should.be.an.Object().with.property('post');
            formatted.post.should.eql(postObject);
        });

        it('should return the post object with html strings converted to SafeString', function () {
            const postObject = testUtils.DataGenerator.forKnex.createPost({slug: 'with-caption', feature_image_caption: '<a href="#">A link</a>'});

            const formatted = helpers.formatResponse.entry(postObject);

            formatted.post.feature_image_caption.should.be.an.instanceof(SafeString);
        });
    });

    describe('entries', function () {
        it('should return posts and posts pagination as top level keys', function () {
            const data = {
                posts: posts,
                meta: {pagination: {}}
            };

            const formatted = helpers.formatResponse.entries(data);

            formatted.should.be.an.Object().with.properties('posts', 'pagination');
            formatted.posts.should.eql(data.posts);
            formatted.pagination.should.eql(data.meta.pagination);
        });

        it('should flatten api read responses which have no pagination data', function () {
            const data = {
                posts: posts,
                meta: {pagination: {}},
                data: {tag: tags}
            };

            const formatted = helpers.formatResponse.entries(data);

            formatted.should.be.an.Object().with.properties('posts', 'pagination', 'tag');
            formatted.tag.should.eql(data.data.tag[0]);
        });

        it('should remove the meta key from api browse responses', function () {
            const data = {
                posts: posts,
                meta: {pagination: {}},
                data: {
                    featured: {
                        posts: posts,
                        meta: {pagination: {}}
                    }
                }
            };

            const formatted = helpers.formatResponse.entries(data);

            formatted.should.be.an.Object().with.properties('posts', 'pagination', 'featured');
            formatted.featured.should.be.an.Object().with.properties('posts', 'pagination');
        });

        it('should return post objects with html strings converted to SafeString', function () {
            // `data` contains arrays that have extra properties, need to create them first because the extra props can't be added inline
            const featured_multiple = [
                testUtils.DataGenerator.forKnex.createPost({slug: 'featured-two', feature_image_caption: '<a href="#">Featured link two</a>'}),
                testUtils.DataGenerator.forKnex.createPost({slug: 'featured-three', feature_image_caption: '<a href="#">Featured link three</a>'})
            ];
            featured_multiple.meta = {pagination: {}};

            const data = {
                posts: [
                    testUtils.DataGenerator.forKnex.createPost({slug: 'one', feature_image_caption: '<a href="#">Link one</a>'}),
                    testUtils.DataGenerator.forKnex.createPost({slug: 'two', feature_image_caption: '<a href="#">Link two</a>'})
                ],
                data: {
                    featured_single: [testUtils.DataGenerator.forKnex.createPost({slug: 'featured-one', feature_image_caption: '<a href="#">Featured link one</a>'})],
                    featured_multiple
                }
            };

            const formatted = helpers.formatResponse.entries(data);

            formatted.posts[0].feature_image_caption.should.be.an.instanceof(SafeString);
            formatted.posts[1].feature_image_caption.should.be.an.instanceof(SafeString);
            formatted.featured_single.feature_image_caption.should.be.an.instanceof(SafeString);
            formatted.featured_multiple[0].feature_image_caption.should.be.an.instanceof(SafeString);
            formatted.featured_multiple[1].feature_image_caption.should.be.an.instanceof(SafeString);
        });
    });
});
