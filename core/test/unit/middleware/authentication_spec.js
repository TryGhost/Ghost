/*globals describe, it, beforeEach, afterEach */
/*jshint expr:true*/
var sinon        = require('sinon'),
    should       = require('should'),
    passport     = require('passport'),
    authenticate = require('../../../server/middleware/authenticate');

should.equal(true, true);

describe('authenticate', function () {
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

    it('should skip authentication if not hitting /ghost', function () {
        req.path = '/tag/foo';

        authenticate(req, res, next);

        next.called.should.be.true;
    });

    it('should authenticate if hitting /ghost/ auth endpoint', function (done) {
        req.path = '/ghost/api/v0.1/authentication/';
        req.method = 'PUT';

        sandbox.stub(passport, 'authenticate', function (method, options, cb) {
            var user = {slug: 'user'},
                info = {info: 'some'};

            method.should.equal('bearer');
            options.session.should.be.false;
            options.failWithError.should.be.true;

            return function (req, res, next) {
                cb(null, user, info);
                next.called.should.be.true;
                next.calledWith(null, user, info).should.be.true;
                req.authInfo.should.equal(info);
                req.user.should.equal(user);
                done();
            };
        });

        authenticate(req, res, next);
    });
});
