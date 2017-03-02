var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    auth = require('../../../server/auth'),
    models = require('../../../server/models'),
    sandbox = sinon.sandbox.create();

describe('UNIT: auth validation', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        sandbox.restore();
    });

    describe('ghost is enabled', function () {
        it('[success]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(false));

            return auth.validation.switch({
                authType: 'ghost'
            });
        });

        it('[success]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(true));
            sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(true));

            return auth.validation.switch({
                authType: 'ghost'
            });
        });

        it('[failure]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(true));
            sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(true));

            return auth.validation.switch({
                authType: 'password'
            }).catch(function (err) {
                should.exist(err);
                err.code.should.eql('AUTH_SWITCH');
            });
        });
    });

    describe('password is enabled', function () {
        it('[success]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(false));

            return auth.validation.switch({
                authType: 'password'
            });
        });

        it('[success]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(true));
            sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(false));

            return auth.validation.switch({
                authType: 'password'
            });
        });

        it('[failure]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(true));
            sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(true));

            return auth.validation.switch({
                authType: 'ghost'
            }).catch(function (err) {
                should.exist(err);
                err.code.should.eql('AUTH_SWITCH');
            });
        });
    });
});
