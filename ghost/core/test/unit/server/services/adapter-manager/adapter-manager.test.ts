import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import {AdapterManager, type AdapterManagerOptions} from '../../../../../core/server/services/adapter-manager/adapter-manager';
import type {Adapter} from  '../../../../../core/server/services/adapter-manager/types';

class BaseMailAdapter implements Adapter {
    readonly requiredFns: string[];

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
    it('registerAdapter throws if type has a ":"', function () {
        const opts: AdapterManagerOptions = {
            loadAdapterFromPath: sinon.stub(),
            pathsToAdapters: ['first/path']
        }

        const adapterManager = new AdapterManager(opts);
        assert.throws(() => {
            adapterManager.registerAdapter('mail:newsletters', BaseMailAdapter);
        }), {
            errorType: 'IncorrectUsageError',
            message: 'Adapter type mail:newsletters cannot contain a colon.'
        };
    });

    it('getAdapter throws if called without correct parameters', function () {
        const opts: AdapterManagerOptions = {
            loadAdapterFromPath: sinon.stub(),
            pathsToAdapters: ['first/path']
        }

        const adapterManager = new AdapterManager(opts)
            .registerAdapter('mail', BaseMailAdapter);

        assert.throws(() => {
            // @ts-expect-error missing args assertion
            adapterManager.getAdapter('mail');
        }, {
            errorType: 'IncorrectUsageError',
            message: 'getAdapter must be called with a adapterName and a adapterClassName.'
        });
    });

    it('getAdapter throws if config does not contain adapter type key', function () {
        const opts: AdapterManagerOptions = {
            loadAdapterFromPath: sinon.stub(),
            pathsToAdapters: ['first/path']
        }

        const adapterManager = new AdapterManager(opts)
            .registerAdapter('some_other_adapter_type', BaseMailAdapter);

        assert.throws(() => {
            // @ts-expect-error invalid adapter type assertion
            adapterManager.getAdapter('mail', 'custom');
        }, {
            errorType: 'NotFoundError',
            message: 'Unknown adapter type mail. Please register adapter.'
        });
    });

    it('getAdapter can handle looking up from node_modules', function () {
        const opts = {
            loadAdapterFromPath: sinon.stub(),
            pathsToAdapters: [
                '', // node_modules
                'first/path'
            ]
        }

        const adapterManager = new AdapterManager(opts)
            .registerAdapter('mail', BaseMailAdapter);

        assert.throws(() => {
            adapterManager.getAdapter('mail', 'some-node-module-adapter');
        });

        sinon.assert.calledWith(opts.loadAdapterFromPath, 'some-node-module-adapter');
    });

    it('Throws missing-dependency error when adapter exists but requires a missing package', function () {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-adapter-test-'));
        const adapterDir = path.join(tmpDir, 'scheduling');
        fs.mkdirSync(adapterDir, {recursive: true});
        fs.writeFileSync(
            path.join(adapterDir, 'BrokenAdapter.js'),
            `require('this-package-does-not-exist-at-all');\nmodule.exports = class {};`
        );

        const opts: AdapterManagerOptions = {
            loadAdapterFromPath: require,
            pathsToAdapters: [tmpDir]
        }

        try {
            const adapterManager = new AdapterManager(opts)
                .registerAdapter('scheduling', BaseMailAdapter);

            assert.throws(() => {
                adapterManager.getAdapter('scheduling', 'BrokenAdapter', {});
            }, {
                errorType: 'IncorrectUsageError',
                // The error names the unresolved module so it's actionable
                message: /missing a dependency 'this-package-does-not-exist-at-all' in your adapter/
            });
        } finally {
            fs.rmSync(tmpDir, {recursive: true, force: true});
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

        const opts: AdapterManagerOptions = {
            loadAdapterFromPath,
            pathsToAdapters,
        }

        const adapterManager = new AdapterManager(opts)
            .registerAdapter('mail', BaseMailAdapter);

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

        const opts: AdapterManagerOptions = {
            loadAdapterFromPath,
            pathsToAdapters,
        }

        const adapterManager = new AdapterManager(opts)
            .registerAdapter('mail', BaseMailAdapter);

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

        const opts: AdapterManagerOptions = {
            loadAdapterFromPath,
            pathsToAdapters,
        }

        const adapterManager = new AdapterManager(opts)
            .registerAdapter('mail', BaseMailAdapter);

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
