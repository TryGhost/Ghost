const should = require('should');
const sinon = require('sinon');
const helpers = require('../../../../../core/frontend/services/helpers');
const AppProxy = require('../../../../../core/frontend/services/apps/proxy');
const routing = require('../../../../../core/frontend/services/routing');

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
            const appProxy = AppProxy.getInstance('TestApp');

            should.exist(appProxy.helperService);
            should.exist(appProxy.helperService.registerAlias);
            should.exist(appProxy.helperService.registerDir);
            should.exist(appProxy.helperService.registerHelper);
        });

        it('allows helper registration', function () {
            const registerSpy = sinon.stub(helpers, 'registerHelper');
            const appProxy = AppProxy.getInstance('TestApp');

            appProxy.helperService.registerHelper('myTestHelper', sinon.stub().returns('test result'));

            registerSpy.called.should.equal(true);
        });
    });
});
