const should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    testUtils = require('../../../../utils'),
    api = require('../../../../../server/api'),
    helpers = require('../../../../../server/services/routing/helpers'),
    sandbox = sinon.sandbox.create();

describe('Unit - services/routing/helpers/entry-lookup', function () {
    let posts, locals;

    afterEach(function () {
        sandbox.restore();
    });

    describe('v0.1', function () {
        beforeEach(function () {
            sandbox.stub(api.posts, 'read');

            locals = {apiVersion: 'v0.1'};
        });

        describe('static pages', function () {
            const routerOptions = {
                permalinks: '/:slug/',
                query: {controller: 'posts', resource: 'posts'}
            };

            let pages;

            beforeEach(function () {
                pages = [
                    testUtils.DataGenerator.forKnex.createPost({url: '/test/', slug: 'test', page: true})
                ];

                api.posts.read.withArgs({slug: pages[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        posts: pages
                    });
            });

            it('ensure posts controller is triggered', function () {
                const testUrl = 'http://127.0.0.1:2369' + pages[0].url;

                return helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                    api.posts.read.calledOnce.should.be.true();
                    should.exist(lookup.entry);
                    lookup.entry.should.have.property('url', pages[0].url);
                    lookup.isEditURL.should.be.false();
                });
            });
        });

        describe('Permalinks: /:slug/', function () {
            const routerOptions = {
                permalinks: '/:slug/',
                query: {controller: 'posts', resource: 'posts'}
            };

            beforeEach(function () {
                posts = [
                    testUtils.DataGenerator.forKnex.createPost({url: '/test/', slug: 'test'})
                ];

                api.posts.read.withArgs({slug: posts[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        posts: posts
                    });
            });

            it('can lookup absolute url: /:slug/', function (done) {
                const testUrl = 'http://127.0.0.1:2369' + posts[0].url;

                helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                    api.posts.read.calledOnce.should.be.true();
                    should.exist(lookup.entry);
                    lookup.entry.should.have.property('url', posts[0].url);
                    lookup.isEditURL.should.be.false();

                    done();
                }).catch(done);
            });

            it('can lookup relative url: /:slug/', function (done) {
                const testUrl = posts[0].url;

                helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                    api.posts.read.calledOnce.should.be.true();
                    should.exist(lookup.entry);
                    lookup.entry.should.have.property('url', posts[0].url);
                    lookup.isEditURL.should.be.false();

                    done();
                }).catch(done);
            });

            it('cannot lookup absolute url: /:year/:month/:day/:slug/', function (done) {
                const testUrl = 'http://127.0.0.1:2369/2016/01/01' + posts[0].url;

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.false();
                        should.not.exist(lookup);
                        done();
                    })
                    .catch(done);
            });

            it('cannot lookup relative url: /:year/:month/:day/:slug/', function (done) {
                const testUrl = '/2016/01/01' + posts[0].url;

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.false();
                        should.not.exist(lookup);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Permalinks: /:year/:month/:day/:slug/', function () {
            const routerOptions = {
                permalinks: '/:year/:month/:day/:slug/',
                query: {controller: 'posts', resource: 'posts'}
            };

            beforeEach(function () {
                posts = [
                    testUtils.DataGenerator.forKnex.createPost({url: '/2016/01/01/example/', slug: 'example'})
                ];

                api.posts.read.withArgs({slug: posts[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        posts: posts
                    });
            });

            it('cannot lookup absolute url: /:slug/', function (done) {
                const testUrl = 'http://127.0.0.1:2369/' + posts[0].slug;

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.false();
                        should.not.exist(lookup);
                        done();
                    })
                    .catch(done);
            });

            it('cannot lookup relative url using :slug', function (done) {
                const testUrl = posts[0].slug;

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.false();
                        should.not.exist(lookup);
                        done();
                    })
                    .catch(done);
            });

            it('can lookup absolute url: /:year/:month/:day/:slug/', function (done) {
                const testUrl = 'http://127.0.0.1:2369' + posts[0].url;

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.true();
                        should.exist(lookup.entry);
                        lookup.entry.should.have.property('url', posts[0].url);
                        lookup.isEditURL.should.be.false();

                        done();
                    })
                    .catch(done);
            });

            it('can lookup relative url: /:year/:month/:day/:slug/', function (done) {
                const testUrl = posts[0].url;

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.true();
                        should.exist(lookup.entry);
                        lookup.entry.should.have.property('url', posts[0].url);
                        lookup.isEditURL.should.be.false();

                        done();
                    })
                    .catch(done);
            });
        });

        describe('with url options', function () {
            const routerOptions = {
                permalinks: '/:slug/:options(edit)?',
                query: {controller: 'posts', resource: 'posts'}
            };

            beforeEach(function () {
                posts = [
                    testUtils.DataGenerator.forKnex.createPost({url: '/test/', slug: 'test'})
                ];

                api.posts.read.withArgs({slug: posts[0].slug, include: 'author,authors,tags'})
                    .resolves({posts: posts});
            });

            it('can lookup absolute url: /:slug/edit/', function (done) {
                const testUrl = 'http://127.0.0.1:2369' + posts[0].url + 'edit/';

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.true();
                        lookup.entry.should.have.property('url', posts[0].url);
                        lookup.isEditURL.should.be.true();
                        done();
                    })
                    .catch(done);
            });

            it('can lookup relative url: /:slug/edit/', function (done) {
                const testUrl = posts[0].url + 'edit/';

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.true();
                        lookup.entry.should.have.property('url', posts[0].url);
                        lookup.isEditURL.should.be.true();
                        done();
                    })
                    .catch(done);
            });

            it('cannot lookup absolute url: /:year/:month/:day/:slug/edit/', function (done) {
                const testUrl = 'http://127.0.0.1:2369/2016/01/01' + posts[0].url + 'edit/';

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.false();
                        should.not.exist(lookup);
                        done();
                    })
                    .catch(done);
            });

            it('cannot lookup relative url: /:year/:month/:day/:slug/edit/', function (done) {
                const testUrl = '/2016/01/01' + posts[0].url + 'edit/';

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.false();
                        should.not.exist(lookup);
                        done();
                    })
                    .catch(done);
            });

            it('unknown url option', function (done) {
                const testUrl = posts[0].url + 'not-edit/';

                helpers.entryLookup(testUrl, routerOptions, locals)
                    .then(function (lookup) {
                        api.posts.read.calledOnce.should.be.false();
                        should.not.exist(lookup);
                        done();
                    })
                    .catch(done);
            });
        });
    });

    describe('v2', function () {
        describe('static pages', function () {
            const routerOptions = {
                permalinks: '/:slug/',
                query: {controller: 'pages', resource: 'pages'}
            };

            let pages;
            let postsReadStub;
            let pagesReadStub;

            beforeEach(function () {
                pages = [
                    testUtils.DataGenerator.forKnex.createPost({url: '/test/', slug: 'test', page: true})
                ];

                postsReadStub = sandbox.stub();
                pagesReadStub = sandbox.stub();

                pagesReadStub.withArgs({slug: pages[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        pages: pages
                    });

                sandbox.stub(api.v2, 'posts').get(() => {
                    return {
                        read: postsReadStub
                    };
                });

                sandbox.stub(api.v2, 'pages').get(() => {
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

                postsReadStub = sandbox.stub();
                pagesReadStub = sandbox.stub();

                postsReadStub.withArgs({slug: posts[0].slug, include: 'author,authors,tags'})
                    .resolves({
                        posts: posts
                    });

                sandbox.stub(api.v2, 'posts').get(() => {
                    return {
                        read: postsReadStub
                    };
                });

                sandbox.stub(api.v2, 'pages').get(() => {
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
});
