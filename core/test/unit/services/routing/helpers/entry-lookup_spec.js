const should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    testUtils = require('../../../../utils'),
    api = require('../../../../../server/api'),
    helpers = require('../../../../../frontend/services/routing/helpers');

describe('Unit - services/routing/helpers/entry-lookup', function () {
    let posts, locals;

    afterEach(function () {
        sinon.restore();
    });

    describe('v2', function () {
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

                pagesReadStub//.withArgs({slug: pages[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        pages: pages
                    });

                sinon.stub(api.v2, 'posts').get(() => {
                    return {
                        read: postsReadStub
                    };
                });

                sinon.stub(api.v2, 'pagesPublic').get(() => {
                    return {
                        read: pagesReadStub
                    };
                });

                locals = {apiVersion: 'v2'};
            });

            it('ensure pages controller is triggered', function () {
                const testUrl = 'http://127.0.0.1:2369' + pages[0].url;

                return helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
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
                permalinks: '/:slug/',
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

                postsReadStub//.withArgs({slug: posts[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        posts: posts
                    });

                sinon.stub(api.v2, 'posts').get(() => {
                    return {
                        read: postsReadStub
                    };
                });

                sinon.stub(api.v2, 'pagesPublic').get(() => {
                    return {
                        read: pagesReadStub
                    };
                });

                locals = {apiVersion: 'v2'};
            });

            it('ensure posts controller is triggered', function () {
                const testUrl = 'http://127.0.0.1:2369' + posts[0].url;

                return helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                    postsReadStub.calledOnce.should.be.true();
                    pagesReadStub.called.should.be.false();
                    should.exist(lookup.entry);
                    lookup.entry.should.have.property('url', posts[0].url);
                    lookup.isEditURL.should.be.false();
                });
            });
        });
    });

    describe('canary', function () {
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

                pagesReadStub//.withArgs({slug: pages[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        pages: pages
                    });

                sinon.stub(api.canary, 'posts').get(() => {
                    return {
                        read: postsReadStub
                    };
                });

                sinon.stub(api.canary, 'pagesPublic').get(() => {
                    return {
                        read: pagesReadStub
                    };
                });

                locals = {apiVersion: 'canary'};
            });

            it('ensure pages controller is triggered', function () {
                const testUrl = 'http://127.0.0.1:2369' + pages[0].url;

                return helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
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
                permalinks: '/:slug/',
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

                postsReadStub//.withArgs({slug: posts[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        posts: posts
                    });

                sinon.stub(api.canary, 'posts').get(() => {
                    return {
                        read: postsReadStub
                    };
                });

                sinon.stub(api.canary, 'pagesPublic').get(() => {
                    return {
                        read: pagesReadStub
                    };
                });

                locals = {apiVersion: 'canary'};
            });

            it('ensure posts controller is triggered', function () {
                const testUrl = 'http://127.0.0.1:2369' + posts[0].url;

                return helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                    postsReadStub.calledOnce.should.be.true();
                    pagesReadStub.called.should.be.false();
                    should.exist(lookup.entry);
                    lookup.entry.should.have.property('url', posts[0].url);
                    lookup.isEditURL.should.be.false();
                });
            });
        });
    });

    describe('v3', function () {
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

                pagesReadStub//.withArgs({slug: pages[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        pages: pages
                    });

                sinon.stub(api.v3, 'posts').get(() => {
                    return {
                        read: postsReadStub
                    };
                });

                sinon.stub(api.v3, 'pagesPublic').get(() => {
                    return {
                        read: pagesReadStub
                    };
                });

                locals = {apiVersion: 'v3'};
            });

            it('ensure pages controller is triggered', function () {
                const testUrl = 'http://127.0.0.1:2369' + pages[0].url;

                return helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
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
                permalinks: '/:slug/',
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

                postsReadStub//.withArgs({slug: posts[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        posts: posts
                    });

                sinon.stub(api.v3, 'posts').get(() => {
                    return {
                        read: postsReadStub
                    };
                });

                sinon.stub(api.v3, 'pagesPublic').get(() => {
                    return {
                        read: pagesReadStub
                    };
                });

                locals = {apiVersion: 'v3'};
            });

            it('ensure posts controller is triggered', function () {
                const testUrl = 'http://127.0.0.1:2369' + posts[0].url;

                return helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                    postsReadStub.calledOnce.should.be.true();
                    pagesReadStub.called.should.be.false();
                    should.exist(lookup.entry);
                    lookup.entry.should.have.property('url', posts[0].url);
                    lookup.isEditURL.should.be.false();
                });
            });
        });
    });
});
