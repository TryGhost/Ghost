const should = require('should');
const find = require('lodash/find');
const PostsImporter = require('../../../../../../server/data/importer/importers/data/posts');

describe('PostsImporter', function () {
    describe('#beforeImport', function () {
        it('converts post.type to post.page', function () {
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
            should.exist(pageFalse.page, 'pageFalse.page should exist');
            should.not.exist(pageFalse.type, 'pageFalse.type should not exist');
            pageFalse.page.should.equal(false);

            const pageTrue = find(importer.dataToImport, {slug: 'page-true'});
            should.exist(pageTrue);
            should.exist(pageTrue.page, 'pageTrue.page should exist');
            should.not.exist(pageTrue.type, 'pageTrue.type should not exist');
            pageTrue.page.should.equal(true);

            const typePost = find(importer.dataToImport, {slug: 'type-post'});
            should.exist(typePost);
            should.exist(typePost.page, 'typePost.page should exist');
            should.not.exist(typePost.type, 'typePost.type should not exist');
            typePost.page.should.equal(false);

            const typePage = find(importer.dataToImport, {slug: 'type-page'});
            should.exist(typePage);
            should.exist(typePage.page, 'typePage.page should exist');
            should.not.exist(typePage.type, 'typePage.type should not exist');
            typePage.page.should.equal(true);
        });
    });
});
