const should = require('should');
const sinon = require('sinon');

const api = require('../../../../../core/frontend/services/proxy').api;
const data = require('../../../../../core/frontend/services/data');
const testUtils = require('../../../../utils');

describe('Unit - frontend/data/entry-lookup', function () {
    let locals;

    afterEach(function () {
        sinon.restore();
    });

    describe('static pages', function () {
        const routerOptions = {
            permalinks: '/:slug/',
            query: {controller: 'pagesPublic', resource: 'pages'}
        };

        let pages;
        let postsReadStub;
        let pagesReadStub;

        beforeEach(function () {
            pages = [
                testUtils.DataGenerator.forKnex.createPost({url: '/test/', slug: 'test', page: true})
            ];

            postsReadStub = sinon.stub();
            pagesReadStub = sinon.stub();

            pagesReadStub//.withArgs({slug: pages[0].slug, include: 'author,authors,tags,tiers'})
                .resolves({
                    pages: pages
                });

            sinon.stub(api, 'posts').get(() => {
                return {
                    read: postsReadStub
                };
            });

            sinon.stub(api, 'pagesPublic').get(() => {
                return {
                    read: pagesReadStub
                };
            });

            locals = {};
        });

        it('ensure pages controller is triggered', function () {
            const testUrl = 'http://127.0.0.1:2369' + pages[0].url;

            return data.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                postsReadStub.called.should.be.false();
                pagesReadStub.calledOnce.should.be.true();
                should.exist(lookup.entry);
                lookup.entry.should.have.property('url', pages[0].url);
                lookup.isEditURL.should.be.false();
            });
        });
    });

    describe('posts', function () {
        const routerOptions = {
            permalinks: '/:slug/:options(edit)?/',
            query: {controller: 'posts', resource: 'posts'}
        };

        let posts;
        let postsReadStub;
        let pagesReadStub;

        beforeEach(function () {
            posts = [
                testUtils.DataGenerator.forKnex.createPost({url: '/test/', slug: 'test'})
            ];

            postsReadStub = sinon.stub();
            pagesReadStub = sinon.stub();

            postsReadStub//.withArgs({slug: posts[0].slug, include: 'author,authors,tags,tiers'})
                .resolves({
                    posts: posts
                });

            sinon.stub(api, 'posts').get(() => {
                return {
                    read: postsReadStub
                };
            });

            sinon.stub(api, 'pagesPublic').get(() => {
                return {
                    read: pagesReadStub
                };
            });

            locals = {};
        });

        it('ensure posts controller is triggered', function () {
            const testUrl = 'http://127.0.0.1:2369' + posts[0].url;

            return data.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                postsReadStub.calledOnce.should.be.true();
                pagesReadStub.called.should.be.false();
                should.exist(lookup.entry);
                lookup.entry.should.have.property('url', posts[0].url);
                lookup.isEditURL.should.be.false();
            });
        });

        it('can handle an edit url', function () {
            const testUrl = `http://127.0.0.1:2369${posts[0].url}edit/`;

            return data.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                postsReadStub.calledOnce.should.be.true();
                pagesReadStub.called.should.be.false();
                should.exist(lookup.entry);
                lookup.entry.should.have.property('url', posts[0].url);
                lookup.isEditURL.should.be.true();
            });
        });
    });
});
