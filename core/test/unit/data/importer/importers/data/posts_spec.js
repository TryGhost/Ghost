const should = require('should');
const find = require('lodash/find');
const PostsImporter = require('../../../../../../server/data/importer/importers/data/posts');

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
            should.exist(pageFalse);
            should.not.exist(pageFalse.page, 'pageFalse.page should not exist');
            should.exist(pageFalse.type, 'pageFalse.type should exist');
            pageFalse.type.should.equal('post');

            const pageTrue = find(importer.dataToImport, {slug: 'page-true'});
            should.exist(pageTrue);
            should.not.exist(pageTrue.page, 'pageTrue.page should not exist');
            should.exist(pageTrue.type, 'pageTrue.type should exist');
            pageTrue.type.should.equal('page');

            const typePost = find(importer.dataToImport, {slug: 'type-post'});
            should.exist(typePost);
            should.not.exist(typePost.page, 'typePost.page should not exist');
            should.exist(typePost.type, 'typePost.type should exist');
            typePost.type.should.equal('post');

            const typePage = find(importer.dataToImport, {slug: 'type-page'});
            should.exist(typePage);
            should.not.exist(typePage.page, 'typePage.page should not exist');
            should.exist(typePage.type, 'typePage.type should exist');
            typePage.type.should.equal('page');
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
            should.exist(pageFalseTypePage);
            pageFalseTypePage.type.should.equal('page', 'pageFalseTypePage.type');

            const pageTrueTypePage = find(importer.dataToImport, {slug: 'page-true-type-page'});
            should.exist(pageTrueTypePage);
            pageTrueTypePage.type.should.equal('page', 'pageTrueTypePage.type');

            const pageFalseTypePost = find(importer.dataToImport, {slug: 'page-false-type-post'});
            should.exist(pageFalseTypePost);
            pageFalseTypePost.type.should.equal('post', 'pageFalseTypePost.type');

            const pageTrueTypePost = find(importer.dataToImport, {slug: 'page-true-type-post'});
            should.exist(pageTrueTypePost);
            pageTrueTypePost.type.should.equal('post', 'pageTrueTypePost.type');
        });
    });
});
