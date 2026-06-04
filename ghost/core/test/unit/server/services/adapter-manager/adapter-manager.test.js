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

    // Builds a MODULE_NOT_FOUND error shaped like Node's, including the Require
    // stack so we can assert the manager doesn't fall for the substring trap.
    function moduleNotFoundError(specifier, requireStack = []) {
        const stack = requireStack.map(p => `- ${p}`).join('\n');
        const err = new Error(`Cannot find module '${specifier}'${stack ? `\nRequire stack:\n${stack}` : ''}`);
        err.code = 'MODULE_NOT_FOUND';
        if (requireStack.length) {
            err.requireStack = requireStack;
        }
        return err;
    }

    it('surfaces the missing dependency when an adapter loads but one of its requires fails', function () {
        // Regression: SchedulingPro requires `superagent`; when it's absent the
        // MODULE_NOT_FOUND message embeds the adapter's own path in the require
        // stack, which used to be misread as "adapter not found at this path".
        const pathsToAdapters = ['/path'];

        const loadAdapterFromPath = sinon.stub();
        loadAdapterFromPath.withArgs('/path/scheduling/SchedulingPro')
            .throws(moduleNotFoundError('superagent', ['/path/scheduling/SchedulingPro.js']));

        const adapterManager = new AdapterManager({loadAdapterFromPath, pathsToAdapters});
        adapterManager.registerAdapter('scheduling', BaseMailAdapter);

        assert.throws(() => {
            adapterManager.getAdapter('scheduling', 'SchedulingPro', {});
        }, {
            errorType: 'IncorrectUsageError',
            message: `The scheduling adapter SchedulingPro is missing a dependency: 'superagent'. Install it where the adapter can resolve it (e.g. ghost/core).`
        });
    });

    it('reports adapter-not-found (not missing dependency) when the adapter file itself is absent', function () {
        const pathsToAdapters = ['/path'];

        const loadAdapterFromPath = sinon.stub();
        // The unresolved specifier IS the adapter path -> the file is genuinely missing.
        loadAdapterFromPath.withArgs('/path/scheduling/SchedulingPro')
            .throws(moduleNotFoundError('/path/scheduling/SchedulingPro'));

        const adapterManager = new AdapterManager({loadAdapterFromPath, pathsToAdapters});
        adapterManager.registerAdapter('scheduling', BaseMailAdapter);

        assert.throws(() => {
            adapterManager.getAdapter('scheduling', 'SchedulingPro', {});
        }, {
            errorType: 'IncorrectUsageError',
            message: 'Unable to find scheduling adapter SchedulingPro in /path.'
        });
    });

    it('falls back to reporting a missing dependency when the specifier cannot be parsed', function () {
        const pathsToAdapters = ['/path'];

        const loadAdapterFromPath = sinon.stub();
        // An unusual MODULE_NOT_FOUND whose message has no parseable specifier
        // and does not mention the adapter path -> treated as a missing dependency.
        const err = new Error('module resolution failed for some transitive require');
        err.code = 'MODULE_NOT_FOUND';
        loadAdapterFromPath.withArgs('/path/scheduling/SchedulingPro').throws(err);

        const adapterManager = new AdapterManager({loadAdapterFromPath, pathsToAdapters});
        adapterManager.registerAdapter('scheduling', BaseMailAdapter);

        assert.throws(() => {
            adapterManager.getAdapter('scheduling', 'SchedulingPro', {});
        }, {
            errorType: 'IncorrectUsageError',
            message: 'The scheduling adapter SchedulingPro is missing a dependency: a dependency. Install it where the adapter can resolve it (e.g. ghost/core).'
        });
    });
});
