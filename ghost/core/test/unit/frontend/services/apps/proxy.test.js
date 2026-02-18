const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
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

            assertExists(appProxy.helperService);
            assertExists(appProxy.helperService.registerAlias);
            assertExists(appProxy.helperService.registerDir);
            assertExists(appProxy.helperService.registerHelper);
        });

        it('allows helper registration', function () {
            const registerSpy = sinon.stub(helpers, 'registerHelper');
            const appProxy = AppProxy.getInstance('TestApp');

            appProxy.helperService.registerHelper('myTestHelper', sinon.stub().returns('test result'));

            assert.equal(registerSpy.called, true);
        });
    });
});
