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

        try {
            adapterManager.getAdapter('mail');
            assert.fail('Should not have created');
        } catch (err) {
            assert(err);
            assert.equal(err.errorType, 'IncorrectUsageError');
            assert.equal(err.message, 'getAdapter must be called with a adapterName and a adapterClassName.');
        }
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

        try {
            adapterManager.getAdapter('mail', 'custom');
            assert.fail('Should not have created');
        } catch (err) {
            assert(err);
            assert.equal(err.errorType, 'NotFoundError');
            assert.equal(err.message, 'Unknown adapter type mail. Please register adapter.');
        }
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

        try {
            adapterManager.getAdapter('mail', 'some-node-module-adapter');
        } catch (err) {
            assert(err); // We don't care about the error, we just want to check `loadAdapterFromPath`
        }

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

        try {
            const customAdapter = adapterManager.getAdapter('mail', 'custom', {});

            assert(customAdapter instanceof BaseMailAdapter);
            assert(customAdapter instanceof CustomMailAdapter);
        } catch (err) {
            assert.fail(err, null, 'Should not have errored');
        }

        try {
            const incompleteAdapter = adapterManager.getAdapter('mail', 'incomplete', {});
            assert.fail(incompleteAdapter, null, 'Should not have created');
        } catch (err) {
            assert(err);
            assert.equal(err.errorType, 'IncorrectUsageError');
            assert.equal(err.message, 'mail adapter incomplete is missing the someMethod method.');
        }

        try {
            const defaultAdapter = adapterManager.getAdapter('mail', 'default', {});

            assert(defaultAdapter instanceof BaseMailAdapter);
            assert(defaultAdapter instanceof DefaultMailAdapter);
        } catch (err) {
            assert.fail(err, null, 'Should not have errored');
        }

        try {
            const brokenAdapter = adapterManager.getAdapter('mail', 'broken', {});
            assert.fail(brokenAdapter, null, 'Should not have created');
        } catch (err) {
            assert(err);
            assert.equal(err.errorType, 'IncorrectUsageError');
        }
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

        try {
            const customAdapter = adapterManager.getAdapter('mail:newsletters', 'custom');

            assert(customAdapter instanceof BaseMailAdapter);
            assert(customAdapter instanceof CustomMailAdapter);
        } catch (err) {
            assert.fail(err, null, 'Should not have errored');
        }
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

        let mailNewslettersAdapter;
        try {
            mailNewslettersAdapter = adapterManager.getAdapter('mail:newsletters', 'custom');

            assert(mailNewslettersAdapter instanceof BaseMailAdapter);
            assert(mailNewslettersAdapter instanceof CustomMailAdapter);
        } catch (err) {
            assert.fail(err, null, 'Should not have errored');
        }

        let mailNotificationsAdapter;
        try {
            mailNotificationsAdapter = adapterManager.getAdapter('mail:notifications', 'custom');

            assert(mailNotificationsAdapter instanceof BaseMailAdapter);
            assert(mailNotificationsAdapter instanceof CustomMailAdapter);
        } catch (err) {
            assert.fail(err, null, 'Should not have errored');
        }

        assert.notEqual(mailNewslettersAdapter, mailNotificationsAdapter);

        const secondMailNewslettersAdapter = adapterManager.getAdapter('mail:newsletters', 'custom');
        assert.equal(mailNewslettersAdapter, secondMailNewslettersAdapter);
    });
});