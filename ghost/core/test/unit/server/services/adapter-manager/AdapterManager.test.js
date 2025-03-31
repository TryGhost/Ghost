const sinon = require('sinon');
const should = require('should');
const AdapterManager = require('../../../../../core/server/services/adapter-manager/AdapterManager');

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
            should.fail(null, null, 'Should not have created');
        } catch (err) {
            should.exist(err);
            should.equal(err.errorType, 'IncorrectUsageError');
            should.equal(err.message, 'getAdapter must be called with a adapterName and a adapterClassName.');
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
            should.fail(null, null, 'Should not have created');
        } catch (err) {
            should.exist(err);
            should.equal(err.errorType, 'NotFoundError');
            should.equal(err.message, 'Unknown adapter type mail. Please register adapter.');
        }
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

            should.ok(customAdapter instanceof BaseMailAdapter);
            should.ok(customAdapter instanceof CustomMailAdapter);
        } catch (err) {
            should.fail(err, null, 'Should not have errored');
        }

        try {
            const incompleteAdapter = adapterManager.getAdapter('mail', 'incomplete', {});
            should.fail(incompleteAdapter, null, 'Should not have created');
        } catch (err) {
            should.exist(err);
            should.equal(err.errorType, 'IncorrectUsageError');
            should.equal(err.message, 'mail adapter incomplete is missing the someMethod method.');
        }

        try {
            const defaultAdapter = adapterManager.getAdapter('mail', 'default', {});

            should.ok(defaultAdapter instanceof BaseMailAdapter);
            should.ok(defaultAdapter instanceof DefaultMailAdapter);
        } catch (err) {
            should.fail(err, null, 'Should not have errored');
        }

        try {
            const brokenAdapter = adapterManager.getAdapter('mail', 'broken', {});
            should.fail(brokenAdapter, null, 'Should not have created');
        } catch (err) {
            should.exist(err);
            should.equal(err.errorType, 'IncorrectUsageError');
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

            should.ok(customAdapter instanceof BaseMailAdapter);
            should.ok(customAdapter instanceof CustomMailAdapter);
        } catch (err) {
            should.fail(err, null, 'Should not have errored');
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

            should.ok(mailNewslettersAdapter instanceof BaseMailAdapter);
            should.ok(mailNewslettersAdapter instanceof CustomMailAdapter);
        } catch (err) {
            should.fail(err, null, 'Should not have errored');
        }

        let mailNotificationsAdapter;
        try {
            mailNotificationsAdapter = adapterManager.getAdapter('mail:notifications', 'custom');

            should.ok(mailNotificationsAdapter instanceof BaseMailAdapter);
            should.ok(mailNotificationsAdapter instanceof CustomMailAdapter);
        } catch (err) {
            should.fail(err, null, 'Should not have errored');
        }

        should.notEqual(mailNewslettersAdapter, mailNotificationsAdapter);

        const secondMailNewslettersAdapter = adapterManager.getAdapter('mail:newsletters', 'custom');
        should.equal(mailNewslettersAdapter, secondMailNewslettersAdapter);
    });
});
