/*globals describe, beforeEach, afterEach, it*/
var privateController = require('../lib/router').controller,
    path              = require('path'),
    sinon             = require('sinon'),
    configUtils       = require('../../../../test/utils/configUtils'),
    sandbox = sinon.sandbox.create();

describe('Private Controller', function () {
    var res, req, defaultPath;

    // Helper function to prevent unit tests
    // from failing via timeout when they
    // should just immediately fail
    function failTest(done) {
        return function (err) {
            done(err);
        };
    }

    beforeEach(function () {
        res = {
            locals: {version: ''},
            render: sandbox.spy()
        };

        req = {
            app: {get: function () { return 'casper'; }},
            route: {path: '/private/?r=/'},
            query: {r: ''},
            params: {}
        };

        defaultPath = path.join(configUtils.config.paths.appRoot, '/core/server/apps/private-blogging/lib/views/private.hbs');

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
        configUtils.set({paths: {availableThemes: {casper: {}}}});

        res.render = function (view) {
            view.should.eql(defaultPath);
            done();
        };

        privateController(req, res, failTest(done));
    });

    it('Should render theme password page when it exists', function (done) {
        configUtils.set({paths: {availableThemes: {casper: {
            'private.hbs': '/content/themes/casper/private.hbs'
        }}}});

        res.render = function (view) {
            view.should.eql('private');
            done();
        };

        privateController(req, res, failTest(done));
    });

    it('Should render with error when error is passed in', function (done) {
        configUtils.set({paths: {availableThemes: {casper: {}}}});
        res.error = 'Test Error';

        res.render = function (view, context) {
            view.should.eql(defaultPath);
            context.should.eql({error: 'Test Error'});
            done();
        };

        privateController(req, res, failTest(done));
    });
});
