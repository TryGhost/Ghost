var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    auth = require('../../../server/auth'),
    models = require('../../../server/models'),

    sandbox = sinon.sandbox.create();

/**
 * See https://github.com/TryGhost/Ghost/issues/8342
 * We have disabled Ghost authentication temporary.
 * That's why some tests are skipped for now.
 */
describe('UNIT: auth validation', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('ghost is enabled', function () {
        it('[failure]', function () {
            return auth.validation.validate({
                authType: 'ghost'
            }).catch(function (err) {
                should.exist(err);
                err.code.should.eql('AUTH_TYPE');
            });
        });

        it.skip('[success]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(false));

            return auth.validation.validate({
                authType: 'ghost'
            });
        });

        it.skip('[success]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(true));
            sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(true));

            return auth.validation.validate({
                authType: 'ghost'
            });
        });

        it.skip('[failure]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(true));
            sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(true));

            return auth.validation.validate({
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

            return auth.validation.validate({
                authType: 'password'
            });
        });

        it('[success]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(true));
            sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(false));

            return auth.validation.validate({
                authType: 'password'
            });
        });

        it.skip('[failure]', function () {
            sandbox.stub(models.User, 'isSetup').returns(Promise.resolve(true));
            sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(true));

            return auth.validation.validate({
                authType: 'ghost'
            }).catch(function (err) {
                should.exist(err);
                err.code.should.eql('AUTH_SWITCH');
            });
        });
    });
});
