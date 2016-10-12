var sinon           = require('sinon'),
    should          = require('should'),
    Promise         = require('bluebird'),
    api             = require('../../../server/api'),
    redirectToSetup = require('../../../server/middleware/redirect-to-setup');

should.equal(true, true);

describe('redirectToSetup', function () {
    var res, req, next, sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        res = sinon.spy();
        req = sinon.spy();
        next = sinon.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should redirect to setup if not on setup', function () {
        sandbox.stub(api.authentication, 'isSetup', function () {
            return Promise.resolve({setup: [{status: false}]});
        });

        req.path = '/';
        res.redirect = sinon.spy(function () {
            next.called.should.be.false();
            res.redirect.called.should.be.true();
        });

        redirectToSetup(req, res, next);
    });

    it('should not redirect if setup is done', function () {
        sandbox.stub(api.authentication, 'isSetup', function () {
            return Promise.resolve({setup: [{status: true}]});
        });

        res = {redirect: sinon.spy()};
        req.path = '/';

        next = sinon.spy(function () {
            next.called.should.be.true();
            res.redirect.called.should.be.false();
        });

        redirectToSetup(req, res, next);
    });

    it('should not redirect if already on setup', function () {
        sandbox.stub(api.authentication, 'isSetup', function () {
            return Promise.resolve({setup: [{status: false}]});
        });

        res = {redirect: sinon.spy()};
        req.path = '/ghost/setup/';

        next = sinon.spy(function () {
            next.called.should.be.true();
            res.redirect.called.should.be.false();
        });

        redirectToSetup(req, res, next);
    });

    it('should not redirect successful oauth authorization requests', function () {
        sandbox.stub(api.authentication, 'isSetup', function () {
            return Promise.resolve({setup: [{status: false}]});
        });

        res = {redirect: sinon.spy()};
        req.path = '/';
        req.query = {code: 'authCode'};

        next = sinon.spy(function () {
            next.called.should.be.true();
            res.redirect.called.should.be.false();
        });

        redirectToSetup(req, res, next);
    });

    it('should not redirect failed oauth authorization requests', function () {
        sandbox.stub(api.authentication, 'isSetup', function () {
            return Promise.resolve({setup: [{status: false}]});
        });

        res = {redirect: sinon.spy()};
        req.path = '/';
        req.query = {error: 'access_denied', state: 'randomstring'};

        next = sinon.spy(function () {
            next.called.should.be.true();
            res.redirect.called.should.be.false();
        });

        redirectToSetup(req, res, next);
    });
});
