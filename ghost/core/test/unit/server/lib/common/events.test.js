const assert = require('node:assert/strict');
const sinon = require('sinon');
const events = require('../../../../../core/server/lib/common/events');
const {getRootContainer, setDefaultScope, resetContainer} = require('../../../../../core/shared/container/current');
const {registerCoreServices} = require('../../../../../core/registrations');

describe('common events facade', function () {
    afterEach(function () {
        sinon.restore();
        events.removeAllListeners();
        resetContainer();
    });

    it('works as an emitter without a container scope', function () {
        let fired = 0;
        events.on('test.event', () => {
            fired += 1;
        });
        events.emit('test.event');

        assert.equal(fired, 1);
        assert.equal(typeof events.hasRegisteredListener, 'function');
    });

    it('delegates to the default scope when one is set', function () {
        const root = getRootContainer();
        registerCoreServices(root);
        const scope = root.createScope({siteConfig: {}});
        setDefaultScope(scope);

        let fired = 0;
        events.on('test.event', () => {
            fired += 1;
        });

        const scopeEvents = scope.resolve('events');
        scopeEvents.emit('test.event');

        assert.equal(fired, 1);
    });

    it('supports stubbing emit, as the test mock manager does', function () {
        const stub = sinon.stub(events, 'emit');

        events.emit('stubbed.event');

        sinon.assert.calledWith(stub, 'stubbed.event');
    });
});
