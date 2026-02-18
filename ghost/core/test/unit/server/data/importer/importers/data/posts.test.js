const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../../utils/assertions');
const find = require('lodash/find');
const PostsImporter = require('../../../../../../../core/server/data/importer/importers/data/posts-importer');

describe('PostsImporter', function () {
    describe('#beforeImport', function () {
        it('converts post.page to post.type', function () {
            const fakePosts = [{
                slug: 'page-false',
                page: false
            }, {
                slug: 'page-true',
                page: true
            }, {
                slug: 'type-post',
                type: 'post'
            }, {
                slug: 'type-page',
                type: 'page'
            }];

            const importer = new PostsImporter({posts: fakePosts});

            importer.beforeImport();

            const pageFalse = find(importer.dataToImport, {slug: 'page-false'});
            assertExists(pageFalse);
            assert.equal(pageFalse.page, undefined, 'pageFalse.page should not exist');
            assertExists(pageFalse.type, 'pageFalse.type should exist');
            assert.equal(pageFalse.type, 'post');

            const pageTrue = find(importer.dataToImport, {slug: 'page-true'});
            assertExists(pageTrue);
            assert.equal(pageTrue.page, undefined, 'pageTrue.page should not exist');
            assertExists(pageTrue.type, 'pageTrue.type should exist');
            assert.equal(pageTrue.type, 'page');

            const typePost = find(importer.dataToImport, {slug: 'type-post'});
            assertExists(typePost);
            assert.equal(typePost.page, undefined, 'typePost.page should not exist');
            assertExists(typePost.type, 'typePost.type should exist');
            assert.equal(typePost.type, 'post');

            const typePage = find(importer.dataToImport, {slug: 'type-page'});
            assertExists(typePage);
            assert.equal(typePage.page, undefined, 'typePage.page should not exist');
            assertExists(typePage.type, 'typePage.type should exist');
            assert.equal(typePage.type, 'page');
        });

        it('gives precedence to post.type when post.page is also present', function () {
            const fakePosts = [{
                slug: 'page-false-type-page',
                page: false,
                type: 'page'
            }, {
                slug: 'page-true-type-page',
                page: true,
                type: 'page'
            }, {
                slug: 'page-false-type-post',
                page: false,
                type: 'post'
            }, {
                slug: 'page-true-type-post',
                page: true,
                type: 'post'
            }];

            const importer = new PostsImporter({posts: fakePosts});

            importer.beforeImport();

            const pageFalseTypePage = find(importer.dataToImport, {slug: 'page-false-type-page'});
            assertExists(pageFalseTypePage);
            assert.equal(pageFalseTypePage.type, 'page', 'pageFalseTypePage.type');

            const pageTrueTypePage = find(importer.dataToImport, {slug: 'page-true-type-page'});
            assertExists(pageTrueTypePage);
            assert.equal(pageTrueTypePage.type, 'page', 'pageTrueTypePage.type');

            const pageFalseTypePost = find(importer.dataToImport, {slug: 'page-false-type-post'});
            assertExists(pageFalseTypePost);
            assert.equal(pageFalseTypePost.type, 'post', 'pageFalseTypePost.type');

            const pageTrueTypePost = find(importer.dataToImport, {slug: 'page-true-type-post'});
            assertExists(pageTrueTypePost);
            assert.equal(pageTrueTypePost.type, 'post', 'pageTrueTypePost.type');
        });

        it('Does not remove the newsletter_id column', function () {
            const fakePosts = [{
                slug: 'post-with-newsletter',
                newsletter_id: 'bananas'
            }];

            const importer = new PostsImporter({posts: fakePosts});

            importer.beforeImport();

            const postWithoutNewsletter = find(importer.dataToImport, {slug: 'post-with-newsletter'});
            assertExists(postWithoutNewsletter);
            assertExists(postWithoutNewsletter.newsletter_id);
        });

        it('Maps send_email_when_published', function () {
            const fakePosts = [{
                slug: 'post-with-newsletter',
                send_email_when_published: true
            }];

            const importer = new PostsImporter({posts: fakePosts});

            importer.beforeImport();

            const post = find(importer.dataToImport, {slug: 'post-with-newsletter'});
            assertExists(post);
            assert.equal(post.email_recipient_filter, 'all');
            assert.equal(post.send_email_when_published, undefined);
            // @TODO: need to check this mapping
            // assert.equal(post.newsletter_id, TODO);
        });

        it('Doesn\'t populate the mobiledoc column if it is a lexical post', function () {
            const fakePosts = [{
                slug: 'post-with-newsletter',
                lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Bananas!","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
                html: '<p>Bananas!</p>'
            }];

            const importer = new PostsImporter({posts: fakePosts});

            importer.beforeImport();

            const post = find(importer.dataToImport, {slug: 'post-with-newsletter'});
            assertExists(post);
            assert.equal(post.mobiledoc, undefined);
        });
    });
});
