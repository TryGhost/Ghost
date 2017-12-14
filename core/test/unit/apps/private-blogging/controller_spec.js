/*globals describe, beforeEach, afterEach, it*/
var should = require('should'),
    sinon = require('sinon'),
    path = require('path'),
    configUtils = require('../../../utils/configUtils'),
    themes = require('../../../../server/services/themes'),
    privateController = require('../../../../server/apps/private-blogging/lib/router'),

    sandbox = sinon.sandbox.create();

describe('Private Controller', function () {
    var res, req, defaultPath, hasTemplateStub;

    // Helper function to prevent unit tests
    // from failing via timeout when they
    // should just immediately fail
    function failTest(done) {
        return function (err) {
            done(err);
        };
    }

    beforeEach(function () {
        hasTemplateStub = sandbox.stub().returns(false);
        hasTemplateStub.withArgs('index').returns(true);

        sandbox.stub(themes, 'getActive').returns({
            hasTemplate: hasTemplateStub
        });

        res = {
            locals: {version: ''},
            render: sandbox.spy()
        };

        req = {
            route: {path: '/private/?r=/'},
            query: {r: ''},
            params: {}
        };

        defaultPath = path.join(configUtils.config.get('paths').appRoot, '/core/server/apps/private-blogging/lib/views/private.hbs');

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

    it('Should render default password page when theme has no password template', function (done) {
        res.render = function (view, context) {
            view.should.eql(defaultPath);
            should.exist(context);
            done();
        };

        privateController.renderer(req, res, failTest(done));
    });

    it('Should render theme password page when it exists', function (done) {
        hasTemplateStub.withArgs('private').returns(true);

        res.render = function (view, context) {
            view.should.eql('private');
            should.exist(context);
            done();
        };

        privateController.renderer(req, res, failTest(done));
    });

    it('Should render with error when error is passed in', function (done) {
        res.error = 'Test Error';

        res.render = function (view, context) {
            view.should.eql(defaultPath);
            context.should.eql({error: 'Test Error'});
            done();
        };

        privateController.renderer(req, res, failTest(done));
    });
});
