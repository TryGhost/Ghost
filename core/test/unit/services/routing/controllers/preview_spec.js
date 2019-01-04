const should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    testUtils = require('../../../../utils'),
    configUtils = require('../../../../utils/configUtils'),
    api = require('../../../../../server/api'),
    filters = require('../../../../../server/filters'),
    controllers = require('../../../../../server/services/routing/controllers'),
    helpers = require('../../../../../server/services/routing/helpers'),
    themes = require('../../../../../server/services/themes'),
    urlService = require('../../../../../server/services/url'),
    sandbox = sinon.sandbox.create(),
    EDITOR_URL = '/editor/';

describe('Unit - services/routing/controllers/preview', function () {
    let secureStub, renderStub;
    let req, res, post, apiResponse;

    function failTest(done) {
        return function (err) {
            should.exist(err);
            done(err);
        };
    }

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('v0.1', function () {
        beforeEach(function () {
            post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});

            apiResponse = {
                posts: [post]
            };

            req = {
                path: '/',
                params: {
                    uuid: 'something'
                },
                route: {}
            };

            res = {
                routerOptions: {
                    query: {controller: 'posts', resource: 'posts'}
                },
                locals: {
                    apiVersion: 'v0.1'
                },
                render: sinon.spy(),
                redirect: sinon.spy(),
                set: sinon.spy()
            };

            secureStub = sandbox.stub();
            renderStub = sandbox.stub();

            sandbox.stub(urlService.utils, 'redirectToAdmin');
            sandbox.stub(urlService.utils, 'redirect301');
            sandbox.stub(urlService, 'getUrlByResourceId');

            sandbox.stub(helpers, 'secure').get(function () {
                return secureStub;
            });

            sandbox.stub(helpers, 'renderEntry').get(function () {
                return renderStub;
            });

            sandbox.stub(filters, 'doFilter');

            sandbox.stub(api.posts, 'read').withArgs({
                uuid: req.params.uuid,
                status: 'all',
                include: 'author,authors,tags'
            }).callsFake(function () {
                return Promise.resolve(apiResponse);
            });
        });

        it('should render post', function (done) {
            filters.doFilter.withArgs('prePostsRender', post, res.locals).resolves();

            helpers.renderEntry.callsFake(function () {
                renderStub.called.should.be.true();
                secureStub.called.should.be.true();
                done();
            });

            controllers.preview(req, res, failTest(done));
        });

        it('should call next if post is not found', function (done) {
            apiResponse = {posts: []};

            controllers.preview(req, res, function (err) {
                should.not.exist(err);
                renderStub.called.should.be.false();
                secureStub.called.should.be.false();
                done();
            });
        });

        it('should call redirect if post is published', function (done) {
            post.status = 'published';
            urlService.getUrlByResourceId.withArgs(post.id).returns('/something/');

            urlService.utils.redirect301.callsFake(function (res, postUrl) {
                postUrl.should.eql('/something/');
                renderStub.called.should.be.false();
                secureStub.called.should.be.false();
                done();
            });

            controllers.preview(req, res, failTest(done));
        });

        it('should call redirect if /edit/ (options param) is detected', function (done) {
            req.params.options = 'edit';

            urlService.utils.redirectToAdmin.callsFake(function (statusCode, res, editorUrl) {
                statusCode.should.eql(302);
                editorUrl.should.eql(EDITOR_URL + post.id);
                renderStub.called.should.be.false();
                secureStub.called.should.be.false();
                done();
            });

            controllers.preview(req, res, failTest(done));
        });

        it('should call next for unknown options param detected', function (done) {
            req.params.options = 'abcde';

            controllers.preview(req, res, function (err) {
                should.not.exist(err);
                renderStub.called.should.be.false();
                secureStub.called.should.be.false();
                done();
            });
        });
    });

    describe('v2', function () {
        let previewStub;

        beforeEach(function () {
            post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});

            apiResponse = {
                preview: [post]
            };

            req = {
                path: '/',
                params: {
                    uuid: 'something'
                },
                route: {}
            };

            res = {
                routerOptions: {
                    query: {controller: 'preview', resource: 'preview'}
                },
                locals: {
                    apiVersion: 'v2'
                },
                render: sinon.spy(),
                redirect: sinon.spy(),
                set: sinon.spy()
            };

            secureStub = sandbox.stub();
            renderStub = sandbox.stub();

            sandbox.stub(urlService.utils, 'redirectToAdmin');
            sandbox.stub(urlService.utils, 'redirect301');
            sandbox.stub(urlService, 'getUrlByResourceId');

            sandbox.stub(helpers, 'secure').get(function () {
                return secureStub;
            });

            sandbox.stub(helpers, 'renderEntry').get(function () {
                return renderStub;
            });

            sandbox.stub(filters, 'doFilter');

            previewStub = sandbox.stub();
            previewStub.withArgs({
                uuid: req.params.uuid,
                status: 'all',
                include: 'author,authors,tags'
            }).resolves(apiResponse);

            sandbox.stub(api.v2, 'preview').get(() => {
                return {
                    read: previewStub
                };
            });
        });

        it('should render post', function (done) {
            filters.doFilter.withArgs('prePostsRender', post, res.locals).resolves();

            helpers.renderEntry.callsFake(function () {
                renderStub.called.should.be.true();
                secureStub.called.should.be.true();
                done();
            });

            controllers.preview(req, res, failTest(done));
        });
    });
});
