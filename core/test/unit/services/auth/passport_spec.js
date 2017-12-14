var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    passport = require('passport'),
    ghostPassport = require('../../../../server/services/auth/passport'),
    sandbox = sinon.sandbox.create();

describe('Ghost Passport', function () {
    beforeEach(function () {
        sandbox.spy(passport, 'use');
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('[default] local auth', function () {
        it('initialise passport with passport auth type', function () {
            var response = ghostPassport.init();
            should.exist(response);
            passport.use.callCount.should.eql(2);
        });
    });
});
