var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    path = require('path'),
    Promise = require('bluebird'),

    ampController = rewire('../../../../server/apps/amp/lib/router'),
    common = require('../../../../server/lib/common'),
    configUtils = require('../../../utils/configUtils'),
    themes = require('../../../../server/services/themes'),

    sandbox = sinon.sandbox.create();

// Helper function to prevent unit tests
// from failing via timeout when they
// should just immediately fail
function failTest(done) {
    return function (err) {
        done(err);
    };
}

describe('AMP Controller', function () {
    var res,
        req,
        defaultPath,
        hasTemplateStub;

    beforeEach(function () {
        hasTemplateStub = sandbox.stub().returns(false);
        hasTemplateStub.withArgs('index').returns(true);

        sandbox.stub(themes, 'getActive').returns({
            hasTemplate: hasTemplateStub
        });

        res = {
            render: sandbox.spy(),
            locals: {
                context: ['amp', 'post']
            }
        };

        req = {
            route: {path: '/'},
            query: {r: ''},
            params: {},
            amp: {},
            body: {
                post: {
                    title: 'test'
                }
            }
        };

        defaultPath = path.join(configUtils.config.get('paths').appRoot, '/core/server/apps/amp/lib/views/amp.hbs');

        configUtils.set({
            theme: {
                permalinks: '/:slug/',
                amp: true
            }
        });
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    it('should render default amp page when theme has no amp template', function (done) {
        res.render = function (view, data) {
            view.should.eql(defaultPath);
            data.should.eql({post: {title: 'test'}});
            done();
        };

        ampController.renderer(req, res, failTest(done));
    });

    it('should render theme amp page when theme has amp template', function (done) {
        hasTemplateStub.withArgs('amp').returns(true);

        res.render = function (view, data) {
            view.should.eql('amp');
            data.should.eql({post: {title: 'test'}});
            done();
        };

        ampController.renderer(req, res, failTest(done));
    });

    it('throws 404 when req.body has no post', function (done) {
        req.body = {};

        ampController.renderer(req, res, function (err) {
            should.exist(err);
            should.exist(err.message);
            should.exist(err.statusCode);
            should.exist(err.errorType);
            err.message.should.be.eql('Page not found');
            err.statusCode.should.be.eql(404);
            err.errorType.should.be.eql('NotFoundError');
            done();
        });
    });

    it('throws 404 when req.body.post is a page', function (done) {
        req.body = {
            post: {
                page: true
            }
        };

        ampController.renderer(req, res, function (err) {
            should.exist(err);
            should.exist(err.message);
            should.exist(err.statusCode);
            should.exist(err.errorType);
            err.message.should.be.eql('Page not found');
            err.statusCode.should.be.eql(404);
            err.errorType.should.be.eql('NotFoundError');
            done();
        });
    });
});

describe('AMP getPostData', function () {
    var res, req, postLookupStub, resetPostLookup, next;

    beforeEach(function () {
        res = {
            locals: {
                relativeUrl: '/welcome/amp/'
            }
        };

        req = {
            amp: {
                post: {}
            }
        };

        next = function () {
        };

        postLookupStub = sandbox.stub();
        resetPostLookup = ampController.__set__('postLookup', postLookupStub);
    });

    afterEach(function () {
        sandbox.restore();
        resetPostLookup();
    });

    it('should successfully get the post data from slug', function (done) {
        postLookupStub.returns(new Promise.resolve({
            post: {
                id: '1',
                slug: 'welcome'
            }
        }));

        ampController.getPostData(req, res, function () {
            req.body.post.should.be.eql({
                    id: '1',
                    slug: 'welcome'
                }
            );
            done();
        });
    });

    it('should return error if postlookup returns NotFoundError', function (done) {
        postLookupStub.returns(new Promise.reject(new common.errors.NotFoundError({message: 'not found'})));

        ampController.getPostData(req, res, function (err) {
            should.exist(err);
            should.exist(err.message);
            should.exist(err.statusCode);
            should.exist(err.errorType);
            err.message.should.be.eql('not found');
            err.statusCode.should.be.eql(404);
            err.errorType.should.be.eql('NotFoundError');
            req.body.should.be.eql({});
            done();
        });
    });

    it('should return error and if postlookup returns error', function (done) {
        postLookupStub.returns(new Promise.reject('not found'));

        ampController.getPostData(req, res, function (err) {
            should.exist(err);
            err.should.be.eql('not found');
            req.body.should.be.eql({});
            done();
        });
    });
});
