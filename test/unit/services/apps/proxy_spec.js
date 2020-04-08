const should = require('should'),
    sinon = require('sinon'),
    helpers = require('../../../../core/frontend/services/themes/handlebars/register'),
    AppProxy = require('../../../../core/frontend/services/apps/proxy'),
    routing = require('../../../../core/frontend/services/routing');

describe('Apps', function () {
    beforeEach(function () {
        sinon.stub(routing.registry, 'getRouter').withArgs('appRouter').returns({
            mountRouter: sinon.stub()
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Proxy', function () {
        it('creates a ghost proxy', function () {
            var appProxy = AppProxy.getInstance('TestApp');

            should.exist(appProxy.helpers);
            should.exist(appProxy.helpers.register);
            should.exist(appProxy.helpers.registerAsync);
        });

        it('allows helper registration', function () {
            var registerSpy = sinon.stub(helpers, 'registerThemeHelper'),
                appProxy = AppProxy.getInstance('TestApp');

            appProxy.helpers.register('myTestHelper', sinon.stub().returns('test result'));

            registerSpy.called.should.equal(true);
        });
    });
});
