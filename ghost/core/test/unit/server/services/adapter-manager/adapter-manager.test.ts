import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import {Provider} from 'nconf';
import {AdapterManager, type AdapterManagerOptions} from '../../../../../core/server/services/adapter-manager/adapter-manager';
import {bindAll as bindUrlHelpers} from '@tryghost/config-url-helpers';
import {bindAll as bindHelpers} from '../../../../../core/shared/config/helpers';
import type {ConfigInstance} from '../../../../../core/shared/config/loader';
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

// A minimal nconf-backed config instance, seeded with `adapters` config, that
// drives which adapter class name and options getAdapter resolves.
function makeConfig(adapters: object = {}): ConfigInstance {
    const nconf = new Provider();
    nconf.use('memory');
    nconf.set('paths:contentPath', '/some/path');
    nconf.set('adapters', adapters);

    bindUrlHelpers(nconf);
    bindHelpers(nconf);

    return nconf;
}

describe('AdapterManager', function () {
    it('constructor throws if an adapter type has a ":"', function () {
        const opts: AdapterManagerOptions = {
            loadAdapterFromPath: sinon.stub(),
            pathsToAdapters: ['first/path'],
            config: makeConfig(),
            baseClasses: {'mail:newsletters': BaseMailAdapter}
        }

        assert.throws(() => {
            new AdapterManager(opts);
        }, {
            errorType: 'IncorrectUsageError',
            message: 'Adapter type "mail:newsletters" cannot contain a colon.'
        });
    });

    it('getAdapter throws if called without a name', function () {
        const adapterManager = new AdapterManager({
            loadAdapterFromPath: sinon.stub(),
            pathsToAdapters: ['first/path'],
            config: makeConfig({mail: {active: 'custom'}}),
            baseClasses: {mail: BaseMailAdapter}
        });

        assert.throws(() => {
            // @ts-expect-error missing args assertion
            adapterManager.getAdapter();
        }, {
            errorType: 'IncorrectUsageError',
            message: 'getAdapter must be called with an adapter name.'
        });
    });

    it('getAdapter throws for an unregistered adapter type', function () {
        const adapterManager = new AdapterManager({
            loadAdapterFromPath: sinon.stub(),
            pathsToAdapters: ['first/path'],
            config: makeConfig({mail: {active: 'custom'}}),
            baseClasses: {some_other_adapter_type: BaseMailAdapter}
        });

        assert.throws(() => {
            // @ts-expect-error invalid adapter type assertion
            adapterManager.getAdapter('mail');
        }, {
            errorType: 'NotFoundError',
            message: 'Unknown adapter type mail. Please register adapter.'
        });
    });

    it('getAdapter can handle looking up from node_modules', function () {
        const loadAdapterFromPath = sinon.stub();

        const adapterManager = new AdapterManager({
            loadAdapterFromPath,
            pathsToAdapters: [
                '', // node_modules
                'first/path'
            ],
            config: makeConfig({mail: {active: 'some-node-module-adapter'}}),
            baseClasses: {mail: BaseMailAdapter}
        });

        assert.throws(() => {
            adapterManager.getAdapter('mail');
        });

        sinon.assert.calledWith(loadAdapterFromPath, 'some-node-module-adapter');
    });

    it('Throws missing-dependency error when adapter exists but requires a missing package', function () {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-adapter-test-'));
        const adapterDir = path.join(tmpDir, 'scheduling');
        fs.mkdirSync(adapterDir, {recursive: true});
        fs.writeFileSync(
            path.join(adapterDir, 'BrokenAdapter.js'),
            `require('this-package-does-not-exist-at-all');\nmodule.exports = class {};`
        );

        try {
            const adapterManager = new AdapterManager({
                loadAdapterFromPath: require,
                pathsToAdapters: [tmpDir],
                config: makeConfig({scheduling: {active: 'BrokenAdapter'}}),
                baseClasses: {scheduling: BaseMailAdapter}
            });

            assert.throws(() => {
                adapterManager.getAdapter('scheduling');
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

        const config = makeConfig({mail: {active: 'custom'}});
        const adapterManager = new AdapterManager({
            loadAdapterFromPath,
            pathsToAdapters,
            config,
            baseClasses: {mail: BaseMailAdapter}
        });

        const customAdapter = adapterManager.getAdapter('mail');
        assert(customAdapter instanceof BaseMailAdapter);
        assert(customAdapter instanceof CustomMailAdapter);

        config.set('adapters', {mail: {active: 'incomplete'}});
        assert.throws(() => {
            adapterManager.getAdapter('mail');
        }, {
            errorType: 'IncorrectUsageError',
            message: 'mail adapter incomplete is missing the someMethod method.'
        });

        config.set('adapters', {mail: {active: 'default'}});
        const defaultAdapter = adapterManager.getAdapter('mail');
        assert(defaultAdapter instanceof BaseMailAdapter);
        assert(defaultAdapter instanceof DefaultMailAdapter);

        config.set('adapters', {mail: {active: 'broken'}});
        assert.throws(() => {
            adapterManager.getAdapter('mail');
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
            pathsToAdapters,
            config: makeConfig({mail: {active: 'custom'}}),
            baseClasses: {mail: BaseMailAdapter}
        });

        const customAdapter = adapterManager.getAdapter('mail:newsletters');
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
            pathsToAdapters,
            config: makeConfig({mail: {active: 'custom'}}),
            baseClasses: {mail: BaseMailAdapter}
        });

        const mailNewslettersAdapter = adapterManager.getAdapter('mail:newsletters');
        assert(mailNewslettersAdapter instanceof BaseMailAdapter);
        assert(mailNewslettersAdapter instanceof CustomMailAdapter);

        const mailNotificationsAdapter = adapterManager.getAdapter('mail:notifications');
        assert(mailNotificationsAdapter instanceof BaseMailAdapter);
        assert(mailNotificationsAdapter instanceof CustomMailAdapter);

        assert.notEqual(mailNewslettersAdapter, mailNotificationsAdapter);

        const secondMailNewslettersAdapter = adapterManager.getAdapter('mail:newsletters');
        assert.equal(mailNewslettersAdapter, secondMailNewslettersAdapter);
    });

    describe('init', function () {
        // An adapter whose static `validate` records the config it was called
        // with, and optionally throws — so tests can assert init's behaviour.
        function makeValidatingAdapter(calls: object[], {shouldThrow = false} = {}) {
            return class ValidatingAdapter extends BaseMailAdapter {
                someMethod() {}
                static validate(config: object) {
                    calls.push(config);
                    if (shouldThrow) {
                        throw new Error('bad config');
                    }
                }
            };
        }

        it('calls validate on a configured adapter and passes valid config through', function () {
            const calls: object[] = [];
            const loadAdapterFromPath = sinon.stub().returns(makeValidatingAdapter(calls));

            const adapterManager = new AdapterManager({
                loadAdapterFromPath,
                pathsToAdapters: ['/path'],
                config: makeConfig({mail: {active: 'custom', custom: {some: 'value'}}}),
                baseClasses: {mail: BaseMailAdapter}
            });

            adapterManager.init();

            assert.equal(calls.length, 1);
            assert.deepEqual(calls[0], {some: 'value'});
        });

        it('is a no-op for an adapter without a validate static', function () {
            const loadAdapterFromPath = sinon.stub().returns(CustomMailAdapter);

            const adapterManager = new AdapterManager({
                loadAdapterFromPath,
                pathsToAdapters: ['/path'],
                config: makeConfig({mail: {active: 'custom'}}),
                baseClasses: {mail: BaseMailAdapter}
            });

            assert.doesNotThrow(() => adapterManager.init());
        });

        it('skips adapter types that are not configured', function () {
            const loadAdapterFromPath = sinon.stub().throws(new Error('should not load'));

            const adapterManager = new AdapterManager({
                loadAdapterFromPath,
                pathsToAdapters: ['/path'],
                config: makeConfig({}), // no active adapter configured
                baseClasses: {mail: BaseMailAdapter}
            });

            assert.doesNotThrow(() => adapterManager.init());
            sinon.assert.notCalled(loadAdapterFromPath);
        });

        it('validates configured feature adapters', function () {
            const calls: object[] = [];
            const loadAdapterFromPath = sinon.stub().returns(makeValidatingAdapter(calls));

            const adapterManager = new AdapterManager({
                loadAdapterFromPath,
                pathsToAdapters: ['/path'],
                config: makeConfig({
                    storage: {
                        active: 'active-adapter',
                        'active-adapter': {which: 'active'},
                        media: {adapter: 'active-adapter', which: 'media'}
                    }
                }),
                baseClasses: {storage: BaseMailAdapter}
            });

            adapterManager.init();

            // Both the active adapter and the media feature (distinct merged
            // config, with the `adapter` key stripped) validate.
            assert.equal(calls.length, 2);
            assert.deepEqual(calls, [
                {which: 'active'},
                {which: 'media'}
            ]);
        });

        it('dedupes adapters resolving to the same class and config', function () {
            const calls: object[] = [];
            const loadAdapterFromPath = sinon.stub().returns(makeValidatingAdapter(calls));

            const adapterManager = new AdapterManager({
                loadAdapterFromPath,
                pathsToAdapters: ['/path'],
                config: makeConfig({
                    storage: {
                        active: 'the-adapter',
                        // both features point at the active adapter (string form),
                        // so all three resolve to the same class + config
                        media: 'the-adapter',
                        files: 'the-adapter',
                        'the-adapter': {shared: 'config'}
                    }
                }),
                baseClasses: {storage: BaseMailAdapter}
            });

            adapterManager.init();

            assert.equal(calls.length, 1);
            assert.deepEqual(calls[0], {shared: 'config'});
        });

        it('aggregates failures from multiple adapters into one error', function () {
            const loadAdapterFromPath = sinon.stub();
            loadAdapterFromPath.withArgs('/path/mail/bad-mail').returns(makeValidatingAdapter([], {shouldThrow: true}));
            loadAdapterFromPath.withArgs('/path/storage/bad-storage').returns(makeValidatingAdapter([], {shouldThrow: true}));

            const adapterManager = new AdapterManager({
                loadAdapterFromPath,
                pathsToAdapters: ['/path'],
                config: makeConfig({
                    mail: {active: 'bad-mail'},
                    storage: {active: 'bad-storage'}
                }),
                baseClasses: {mail: BaseMailAdapter, storage: BaseMailAdapter}
            });

            assert.throws(() => adapterManager.init(), (err: Error & {errorDetails?: unknown}) => {
                assert.equal((err as {errorType?: string}).errorType, 'IncorrectUsageError');
                assert.match(err.message, /mail/);
                assert.match(err.message, /storage/);
                assert.equal((err.errorDetails as unknown[]).length, 2);
                return true;
            });
        });
    });
});
