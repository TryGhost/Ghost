const assert = require('node:assert/strict');
const sinon = require('sinon');
const AdapterManager = require('../../../../../core/server/services/adapter-manager/adapter-manager');

class BaseMailAdapter {
    constructor() {
        this.requiredFns = ['someMethod'];
    }
}

class IncompleteMailAdapter extends BaseMailAdapter {}

class CustomMailAdapter extends BaseMailAdapter {
    someMethod() {}
}

class DefaultMailAdapter extends BaseMailAdapter {
    someMethod() {}
}

describe('AdapterManager', function () {
    it('getAdapter throws if called without correct parameters', function () {
        const pathsToAdapters = [
            'first/path'
        ];

        const loadAdapterFromPath = sinon.stub();
        const adapterManager = new AdapterManager({
            loadAdapterFromPath,
            pathsToAdapters
        });

        adapterManager.registerAdapter('mail', BaseMailAdapter);

        assert.throws(() => {
            adapterManager.getAdapter('mail');
        }, {
            errorType: 'IncorrectUsageError',
            message: 'getAdapter must be called with a adapterName and a adapterClassName.'
        });
    });

    it('getAdapter throws if config does not contain adapter type key', function () {
        const pathsToAdapters = [
            'first/path'
        ];

        const loadAdapterFromPath = sinon.stub();
        const adapterManager = new AdapterManager({
            loadAdapterFromPath,
            pathsToAdapters
        });

        adapterManager.registerAdapter('some_other_adapter_type', BaseMailAdapter);

        assert.throws(() => {
            adapterManager.getAdapter('mail', 'custom');
        }, {
            errorType: 'NotFoundError',
            message: 'Unknown adapter type mail. Please register adapter.'
        });
    });

    it('getAdapter can handle looking up from node_modules', function () {
        const pathsToAdapters = [
            '', // node_modules
            'first/path'
        ];

        const loadAdapterFromPath = sinon.stub();
        const adapterManager = new AdapterManager({
            loadAdapterFromPath,
            pathsToAdapters
        });

        adapterManager.registerAdapter('mail', BaseMailAdapter);

        assert.throws(() => {
            adapterManager.getAdapter('mail', 'some-node-module-adapter');
        });

        sinon.assert.calledWith(loadAdapterFromPath, 'some-node-module-adapter');
    });

    it('Loads registered adapters in the order defined by the paths', function () {
        const pathsToAdapters = [
            'first/path',
            'second/path',
            'third/path'
        ];

        const loadAdapterFromPath = sinon.stub();
        loadAdapterFromPath.withArgs('first/path/mail/incomplete')
            .returns(IncompleteMailAdapter);
        loadAdapterFromPath.withArgs('second/path/mail/custom')
            .returns(CustomMailAdapter);
        loadAdapterFromPath.withArgs('third/path/mail/default')
            .returns(DefaultMailAdapter);
        loadAdapterFromPath.withArgs('first/path/mail/broken')
            .throwsException('SHIT_GOT_REAL');

        const adapterManager = new AdapterManager({
            loadAdapterFromPath,
            pathsToAdapters
        });

        adapterManager.registerAdapter('mail', BaseMailAdapter);

        const customAdapter = adapterManager.getAdapter('mail', 'custom', {});
        assert(customAdapter instanceof BaseMailAdapter);
        assert(customAdapter instanceof CustomMailAdapter);

        assert.throws(() => {
            adapterManager.getAdapter('mail', 'incomplete', {});
        }, {
            errorType: 'IncorrectUsageError',
            message: 'mail adapter incomplete is missing the someMethod method.'
        });

        const defaultAdapter = adapterManager.getAdapter('mail', 'default', {});
        assert(defaultAdapter instanceof BaseMailAdapter);
        assert(defaultAdapter instanceof DefaultMailAdapter);

        assert.throws(() => {
            adapterManager.getAdapter('mail', 'broken', {});
        }, {errorType: 'IncorrectUsageError'});
    });

    it('Reads adapter type from the adapter name divided with a colon (adapter:feature syntax)', function () {
        const pathsToAdapters = [
            '/path'
        ];

        const loadAdapterFromPath = sinon.stub();

        loadAdapterFromPath.withArgs('/path/mail/custom')
            .returns(CustomMailAdapter);
        loadAdapterFromPath.withArgs('/path/mail/default')
            .returns(DefaultMailAdapter);

        const adapterManager = new AdapterManager({
            loadAdapterFromPath,
            pathsToAdapters
        });
        adapterManager.registerAdapter('mail', BaseMailAdapter);

        const customAdapter = adapterManager.getAdapter('mail:newsletters', 'custom');
        assert(customAdapter instanceof BaseMailAdapter);
        assert(customAdapter instanceof CustomMailAdapter);
    });

    it('Creates separate class instances for adapters requested for different features', function () {
        const pathsToAdapters = [
            '/path'
        ];

        const loadAdapterFromPath = sinon.stub();

        loadAdapterFromPath.withArgs('/path/mail/custom')
            .returns(CustomMailAdapter);
        loadAdapterFromPath.withArgs('/path/mail/default')
            .returns(DefaultMailAdapter);

        const adapterManager = new AdapterManager({
            loadAdapterFromPath,
            pathsToAdapters
        });
        adapterManager.registerAdapter('mail', BaseMailAdapter);

        const mailNewslettersAdapter = adapterManager.getAdapter('mail:newsletters', 'custom');
        assert(mailNewslettersAdapter instanceof BaseMailAdapter);
        assert(mailNewslettersAdapter instanceof CustomMailAdapter);

        const mailNotificationsAdapter = adapterManager.getAdapter('mail:notifications', 'custom');
        assert(mailNotificationsAdapter instanceof BaseMailAdapter);
        assert(mailNotificationsAdapter instanceof CustomMailAdapter);

        assert.notEqual(mailNewslettersAdapter, mailNotificationsAdapter);

        const secondMailNewslettersAdapter = adapterManager.getAdapter('mail:newsletters', 'custom');
        assert.equal(mailNewslettersAdapter, secondMailNewslettersAdapter);
    });
});
