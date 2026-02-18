const assert = require('node:assert/strict');
const testUtils = require('../../../../utils');
const helpers = require('../../../../../core/frontend/services/rendering');
const {SafeString} = require('../../../../../core/frontend/services/handlebars');

describe('Unit - services/routing/helpers/format-response', function () {
    let posts;
    let pages;
    let tags;

    beforeEach(function () {
        posts = [
            testUtils.DataGenerator.forKnex.createPost({slug: 'sluggy-thing'})
        ];

        pages = [
            testUtils.DataGenerator.forKnex.createPost({slug: 'home', page: true}),
            testUtils.DataGenerator.forKnex.createPost({slug: 'about', page: true, show_title_and_feature_image: false})
        ];

        tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'video', slug: 'video'})
        ];
    });

    describe('entry', function () {
        it('should return the post object wrapped in a post key', function () {
            const postObject = posts[0];

            const formatted = helpers.formatResponse.entry(postObject);

            assert(formatted && typeof formatted === 'object');
            assert.equal(formatted.post, postObject);
        });

        it('should return the post object with html strings converted to SafeString', function () {
            const postObject = testUtils.DataGenerator.forKnex.createPost({slug: 'with-caption', feature_image_caption: '<a href="#">A link</a>'});

            const formatted = helpers.formatResponse.entry(postObject);

            assert(formatted.post.feature_image_caption instanceof SafeString);
        });

        it('should set up @page local for posts', function () {
            const postObject = posts[0];
            const locals = {};

            helpers.formatResponse.entry(postObject, ['post'], locals);

            assert.equal(locals._templateOptions.data.page.show_title_and_feature_image, true);
        });

        it('should set up @page local for pages', function () {
            const postObject = pages[0];
            const locals = {};

            const formatted = helpers.formatResponse.entry(postObject, ['page'], locals);

            assert(!('show_title_and_feature_image' in formatted.page));

            assert.equal(locals._templateOptions.data.page.show_title_and_feature_image, true);
        });

        it('should assign properties on @page for pages', function () {
            const postObject = pages[1];
            const locals = {};

            const formatted = helpers.formatResponse.entry(postObject, ['page'], locals);

            assert(!('show_title_and_feature_image' in formatted.page));

            assert.equal(locals._templateOptions.data.page.show_title_and_feature_image, false);
        });
    });

    describe('entries', function () {
        it('should return posts and posts pagination as top level keys', function () {
            const data = {
                posts: posts,
                meta: {pagination: {}}
            };

            const formatted = helpers.formatResponse.entries(data);

            assert.equal(formatted.posts, data.posts);
            assert.equal(formatted.pagination, data.meta.pagination);
        });

        it('should flatten api read responses which have no pagination data', function () {
            const data = {
                posts: posts,
                meta: {pagination: {}},
                data: {tag: tags}
            };

            const formatted = helpers.formatResponse.entries(data);

            assert(formatted && typeof formatted === 'object');
            assert('posts' in formatted && 'pagination' in formatted && 'tag' in formatted);
            assert.equal(formatted.tag, data.data.tag[0]);
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

            assert(formatted && typeof formatted === 'object');
            assert('posts' in formatted && 'pagination' in formatted && 'featured' in formatted);
            assert('posts' in formatted.featured && 'pagination' in formatted.featured);
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

            assert(formatted.posts[0].feature_image_caption instanceof SafeString);
            assert(formatted.posts[1].feature_image_caption instanceof SafeString);
            assert(formatted.featured_single.feature_image_caption instanceof SafeString);
            assert(formatted.featured_multiple[0].feature_image_caption instanceof SafeString);
            assert(formatted.featured_multiple[1].feature_image_caption instanceof SafeString);
        });

        it('should set @page when data.page is present (e.g. custom routing)', function () {
            const data = {
                posts,
                data: {
                    page: [pages[1]]
                }
            };
            const locals = {};

            const formatted = helpers.formatResponse.entries(data, true, locals);
            assert(!('show_title_and_feature_image' in formatted.page));

            assert.equal(locals._templateOptions.data.page.show_title_and_feature_image, false);
        });
    });
});
