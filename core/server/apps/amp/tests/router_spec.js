/*globals describe, beforeEach, afterEach, it*/
var rewire            = require('rewire'),
    ampController     = rewire('../lib/router'),
    path              = require('path'),
    sinon             = require('sinon'),
    Promise           = require('bluebird'),
    errors            = require('../../../errors'),
    should            = require('should'),
    configUtils       = require('../../../../test/utils/configUtils'),
    sandbox           = sinon.sandbox.create();

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
        setResponseContextStub;

    beforeEach(function () {
        res = {
            render: sandbox.spy(),
            locals: {
                context: ['amp', 'post']
            }
        };

        req = {
            app: {get: function () { return 'casper'; }},
            route: {path: '/'},
            query: {r: ''},
            params: {},
            body: {}
        };

        defaultPath = path.join(configUtils.config.paths.appRoot, '/core/server/apps/amp/lib/views/amp.hbs');

        configUtils.set({
            theme: {
                permalinks: '/:slug/'
            }
        });
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    it('should render default amp page when theme has no amp template', function (done) {
        configUtils.set({paths: {availableThemes: {casper: {}}}});

        setResponseContextStub = sandbox.stub();
        ampController.__set__('setResponseContext', setResponseContextStub);

        res.render = function (view) {
            view.should.eql(defaultPath);
            done();
        };

        ampController.controller(req, res, failTest(done));
    });

    it('should render theme amp page when theme has amp template', function (done) {
        configUtils.set({paths: {availableThemes: {casper: {
            'amp.hbs': '/content/themes/casper/amp.hbs'
        }}}});

        setResponseContextStub = sandbox.stub();
        ampController.__set__('setResponseContext', setResponseContextStub);

        res.render = function (view) {
            view.should.eql('amp');
            done();
        };

        ampController.controller(req, res, failTest(done));
    });

    it('should render with error when error is passed in', function (done) {
        configUtils.set({paths: {availableThemes: {casper: {}}}});
        res.error = 'Test Error';

        setResponseContextStub = sandbox.stub();
        ampController.__set__('setResponseContext', setResponseContextStub);

        res.render = function (view, context) {
            view.should.eql(defaultPath);
            context.should.eql({error: 'Test Error'});
            done();
        };

        ampController.controller(req, res, failTest(done));
    });

    it('does not render amp page when amp context is missing', function (done) {
        var renderSpy;
        configUtils.set({paths: {availableThemes: {casper: {}}}});

        setResponseContextStub = sandbox.stub();
        ampController.__set__('setResponseContext', setResponseContextStub);

        res.locals.context = ['post'];
        res.render = sandbox.spy(function () {
            done();
        });

        renderSpy = res.render;

        ampController.controller(req, res, failTest(done));
        renderSpy.called.should.be.false();
    });

    it('does not render amp page when context is other than amp and post', function (done) {
        var renderSpy;
        configUtils.set({paths: {availableThemes: {casper: {}}}});

        setResponseContextStub = sandbox.stub();
        ampController.__set__('setResponseContext', setResponseContextStub);

        res.locals.context = ['amp', 'page'];
        res.render = sandbox.spy(function () {
            done();
        });

        renderSpy = res.render;

        ampController.controller(req, res, failTest(done));
        renderSpy.called.should.be.false();
    });
});

describe('AMP getPostData', function () {
    var res, req, postLookupStub, next;

    beforeEach(function () {
        res = {
            locals: {
                relativeUrl: '/welcome-to-ghost/amp/'
            }
        };

        req = {
            body: {
                post: {}
            }
        };

        next = function () {};
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should successfully get the post data from slug', function (done) {
        postLookupStub = sandbox.stub();
        postLookupStub.returns(new Promise.resolve({
            post: {
                id: '1',
                slug: 'welcome-to-ghost',
                isAmpURL: true
            }
        }));

        ampController.__set__('postLookup', postLookupStub);

        ampController.getPostData(req, res, function () {
            req.body.post.should.be.eql({
                    id: '1',
                    slug: 'welcome-to-ghost',
                    isAmpURL: true
                }
            );
            done();
        });
    });
    it('should return error if postlookup returns NotFoundError', function (done) {
        postLookupStub = sandbox.stub();
        postLookupStub.returns(new Promise.reject(new errors.NotFoundError('not found')));

        ampController.__set__('postLookup', postLookupStub);

        ampController.getPostData(req, res, function (err) {
            should.exist(err);
            should.exist(err.message);
            should.exist(err.statusCode);
            should.exist(err.errorType);
            err.message.should.be.eql('not found');
            err.statusCode.should.be.eql(404);
            err.errorType.should.be.eql('NotFoundError');
            req.body.post.should.be.eql({});
            done();
        });
    });
    it('should return error and if postlookup returns error', function (done) {
        postLookupStub = sandbox.stub();
        postLookupStub.returns(new Promise.reject('not found'));

        ampController.__set__('postLookup', postLookupStub);

        ampController.getPostData(req, res, function (err) {
            should.exist(err);
            err.should.be.eql('not found');
            req.body.post.should.be.eql({});
            done();
        });
    });
});
