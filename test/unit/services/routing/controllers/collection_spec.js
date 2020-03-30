const should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../../utils'),
    common = require('../../../../../core/server/lib/common'),
    security = require('../../../../../core/server/lib/security'),
    themeService = require('../../../../../core/frontend/services/themes'),
    urlService = require('../../../../../core/frontend/services/url'),
    controllers = require('../../../../../core/frontend/services/routing/controllers'),
    helpers = require('../../../../../core/frontend/services/routing/helpers');

function failTest(done) {
    return function (err) {
        should.exist(err);
        done(err);
    };
}

describe('Unit - services/routing/controllers/collection', function () {
    let req, res, fetchDataStub, secureStub, renderStub, posts, postsPerPage;

    beforeEach(function () {
        postsPerPage = 5;

        posts = [
            testUtils.DataGenerator.forKnex.createPost()
        ];

        secureStub = sinon.stub();
        fetchDataStub = sinon.stub();
        renderStub = sinon.stub();

        sinon.stub(helpers, 'fetchData').get(function () {
            return fetchDataStub;
        });

        sinon.stub(security.string, 'safe').returns('safe');

        sinon.stub(helpers, 'secure').get(function () {
            return secureStub;
        });

        sinon.stub(themeService, 'getActive').returns({
            updateTemplateOptions: sinon.stub(),
            config: function (key) {
                key.should.eql('posts_per_page');
                return postsPerPage;
            }
        });

        sinon.stub(helpers, 'renderEntries').returns(renderStub);

        sinon.stub(urlService, 'owns');
        urlService.owns.withArgs('identifier', posts[0].id).returns(true);

        req = {
            path: '/',
            params: {},
            route: {}
        };

        res = {
            routerOptions: {
                identifier: 'identifier'
            },
            render: sinon.spy(),
            redirect: sinon.spy()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('no params', function (done) {
        fetchDataStub.withArgs({page: 1, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            secureStub.calledOnce.should.be.true();
            urlService.owns.calledOnce.should.be.true();
            done();
        }).catch(done);
    });

    it('pass page param', function (done) {
        req.params.page = 2;

        fetchDataStub.withArgs({page: 2, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            secureStub.calledOnce.should.be.true();
            urlService.owns.calledOnce.should.be.true();
            done();
        }).catch(done);
    });

    it('update hbs engine: router defines limit', function (done) {
        res.routerOptions.limit = 3;
        req.params.page = 2;

        fetchDataStub.withArgs({page: 2, slug: undefined, limit: 3}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 3
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            themeService.getActive.calledOnce.should.be.true();
            themeService.getActive().updateTemplateOptions.withArgs({data: {config: {posts_per_page: 3}}}).calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            secureStub.calledOnce.should.be.true();
            urlService.owns.calledOnce.should.be.true();
            done();
        }).catch(done);
    });

    it('page param too big', function (done) {
        req.params.page = 6;

        fetchDataStub.withArgs({page: 6, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, function (err) {
            (err instanceof common.errors.NotFoundError).should.be.true();

            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            renderStub.calledOnce.should.be.false();
            secureStub.calledOnce.should.be.false();
            urlService.owns.calledOnce.should.be.false();
            done();
        });
    });

    it('slug param', function (done) {
        req.params.slug = 'unsafe';

        fetchDataStub.withArgs({page: 1, slug: 'safe', limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.true();
            fetchDataStub.calledOnce.should.be.true();
            secureStub.calledOnce.should.be.true();
            urlService.owns.calledOnce.should.be.true();
            done();
        }).catch(done);
    });

    it('invalid posts per page', function (done) {
        postsPerPage = -1;

        fetchDataStub.withArgs({page: 1, slug: undefined}, res.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            secureStub.calledOnce.should.be.true();
            urlService.owns.calledOnce.should.be.true();
            done();
        }).catch(done);
    });

    it('ensure secure helper get\'s called for data object', function (done) {
        fetchDataStub.withArgs({page: 1, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                data: {
                    tag: [testUtils.DataGenerator.forKnex.createTag()]
                },
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            secureStub.calledTwice.should.be.true();
            urlService.owns.calledOnce.should.be.true();
            done();
        }).catch(done);
    });

    it('should verify if post belongs to collection', function (done) {
        posts = [
            testUtils.DataGenerator.forKnex.createPost({url: '/a/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/b/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/c/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/d/'})
        ];

        res.routerOptions.filter = 'featured:true';

        urlService.owns.reset();
        urlService.owns.withArgs('identifier', posts[0].id).returns(false);
        urlService.owns.withArgs('identifier', posts[1].id).returns(true);
        urlService.owns.withArgs('identifier', posts[2].id).returns(false);
        urlService.owns.withArgs('identifier', posts[3].id).returns(false);

        fetchDataStub.withArgs({page: 1, slug: undefined, limit: postsPerPage}, res.routerOptions)
            .resolves({
                posts: posts,
                data: {
                    tag: [testUtils.DataGenerator.forKnex.createTag()]
                },
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, failTest(done)).then(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            secureStub.calledTwice.should.be.true();
            urlService.owns.callCount.should.eql(4);
            done();
        }).catch(done);
    });
});
