var should = require('should'),
    sinon = require('sinon'),
    passport = require('passport'),
    ghostPassport = require('../../../../server/services/auth/passport');

describe('Ghost Passport', function () {
    beforeEach(function () {
        sinon.spy(passport, 'use');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('[default] local auth', function () {
        it('initialise passport with passport auth type', function () {
            var response = ghostPassport.init();
            should.exist(response);
            passport.use.callCount.should.eql(2);
        });
    });
});
