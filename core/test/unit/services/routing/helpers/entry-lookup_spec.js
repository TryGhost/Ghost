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

    beforeEach(function () {
        sandbox.stub(api.posts, 'read');

        locals = {apiVersion: 'v0.1'};
    });

    describe('Permalinks: /:slug/', function () {
        const routerOptions = {
            permalinks: '/:slug/'
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
                should.exist(lookup.post);
                lookup.post.should.have.property('url', posts[0].url);
                lookup.isEditURL.should.be.false();

                done();
            }).catch(done);
        });

        it('can lookup relative url: /:slug/', function (done) {
            const testUrl = posts[0].url;

            helpers.entryLookup(testUrl, routerOptions, locals).then(function (lookup) {
                api.posts.read.calledOnce.should.be.true();
                should.exist(lookup.post);
                lookup.post.should.have.property('url', posts[0].url);
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
            permalinks: '/:year/:month/:day/:slug/'
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
                    should.exist(lookup.post);
                    lookup.post.should.have.property('url', posts[0].url);
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
                    should.exist(lookup.post);
                    lookup.post.should.have.property('url', posts[0].url);
                    lookup.isEditURL.should.be.false();

                    done();
                })
                .catch(done);
        });
    });

    describe('with url options', function () {
        const routerOptions = {
            permalinks: '/:slug/:options(edit)?'
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
                    lookup.post.should.have.property('url', posts[0].url);
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
                    lookup.post.should.have.property('url', posts[0].url);
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
