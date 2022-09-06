const sinon = require('sinon');
const should = require('should');
const AdapterManager = require('../');

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
});
