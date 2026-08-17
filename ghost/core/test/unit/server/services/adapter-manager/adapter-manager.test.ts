import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import {Provider} from 'nconf';
import {AdapterManager, type AdapterManagerOptions} from '../../../../../core/server/services/adapter-manager/adapter-manager';
import {resolveAdapterEntryPoint} from '../../../../../core/server/services/adapter-manager/utils';
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

    describe('module-style adapter packages', function () {
        let tmpDir: string;

        beforeEach(function () {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-adapter-pkg-'));
        });

        afterEach(function () {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        });

        // A self-contained adapter mirroring how a real one extends its base
        // class: it carries its own copy, and the manager accepts it because the
        // parent class name matches the registered base class.
        function adapterSource({esm, className = 'PackagedMailAdapter'}: {esm: boolean; className?: string}) {
            const body = `class BaseMailAdapter {
    constructor() {
        this.requiredFns = ['someMethod'];
    }
}

class ${className} extends BaseMailAdapter {
    someMethod() {}
}
`;

            return esm
                ? `${body}\nexport default ${className};\n`
                : `${body}\nmodule.exports = ${className};\n`;
        }

        /**
         * Write an adapter package to `<tmpDir>/mail/<name>`, with `manifest`
         * merged into its package.json and the adapter itself at `entry`.
         */
        function writeAdapterPackage(name: string, manifest: object, entry: string = 'dist/index.js') {
            const pkgDir = path.join(tmpDir, 'mail', name);
            const entryPath = path.join(pkgDir, entry);
            const esm = (manifest as {type?: string}).type === 'module';

            fs.mkdirSync(path.dirname(entryPath), {recursive: true});
            fs.writeFileSync(entryPath, adapterSource({esm}));
            fs.writeFileSync(
                path.join(pkgDir, 'package.json'),
                JSON.stringify({name, version: '1.0.0', ...manifest})
            );

            return pkgDir;
        }

        function getPackagedAdapter(activeName: string) {
            const adapterManager = new AdapterManager({
                loadAdapterFromPath: require,
                pathsToAdapters: [tmpDir],
                config: makeConfig({mail: {active: activeName}}),
                baseClasses: {mail: BaseMailAdapter}
            });

            return adapterManager.getAdapter('mail');
        }

        it('loads a package that declares only exports', function () {
            writeAdapterPackage('exports-adapter', {exports: {'.': './dist/index.js'}});

            const adapter = getPackagedAdapter('exports-adapter');

            assert.equal(adapter.constructor.name, 'PackagedMailAdapter');
            assert.deepEqual(adapter.requiredFns, ['someMethod']);
        });

        it('loads an ESM package via exports', function () {
            writeAdapterPackage('esm-adapter', {
                type: 'module',
                exports: {'.': './dist/index.js'}
            });

            const adapter = getPackagedAdapter('esm-adapter');

            assert.equal(adapter.constructor.name, 'PackagedMailAdapter');
            assert.deepEqual(adapter.requiredFns, ['someMethod']);
        });

        it('loads a package using the exports string shorthand', function () {
            writeAdapterPackage('shorthand-adapter', {
                type: 'module',
                exports: './dist/index.js'
            });

            assert.equal(getPackagedAdapter('shorthand-adapter').constructor.name, 'PackagedMailAdapter');
        });

        it('resolves nested export conditions', function () {
            writeAdapterPackage('nested-adapter', {
                exports: {'.': {node: {default: './dist/index.js'}}}
            });

            assert.equal(getPackagedAdapter('nested-adapter').constructor.name, 'PackagedMailAdapter');
        });

        it('resolves a subpath-free conditions object', function () {
            writeAdapterPackage('sugar-adapter', {
                exports: {require: './dist/index.js', default: './dist/index.js'}
            });

            assert.equal(getPackagedAdapter('sugar-adapter').constructor.name, 'PackagedMailAdapter');
        });

        it('prefers the require condition over import for a dual package', function () {
            // The import target does not exist, so loading only succeeds if the
            // require condition was the one selected.
            writeAdapterPackage('dual-adapter', {
                exports: {'.': {require: './dist/index.js', import: './dist/missing.js'}}
            });

            assert.equal(getPackagedAdapter('dual-adapter').constructor.name, 'PackagedMailAdapter');
        });

        it('does not resolve a package whose root export is conditioned only on import', function () {
            // @NOTE: documents a known limitation — `require` never matches the
            // `import` condition, so such a package is unreachable. See
            // resolveAdapterEntryPoint.
            writeAdapterPackage('import-only-adapter', {
                type: 'module',
                exports: {'.': {import: './dist/index.js'}}
            });

            assert.throws(() => getPackagedAdapter('import-only-adapter'), {
                errorType: 'IncorrectUsageError',
                message: /Unable to find mail adapter import-only-adapter/
            });
        });

        it('still loads a package that declares only main', function () {
            writeAdapterPackage('main-adapter', {type: 'module', main: './dist/index.js'});

            assert.equal(getPackagedAdapter('main-adapter').constructor.name, 'PackagedMailAdapter');
        });

        it('does not load a same-named package from node_modules up the tree', function () {
            // Self-referencing needs `exports`; a main-only package instead falls
            // through to a node_modules walk, which must not be allowed to
            // resolve an impostor sitting above the adapter directory.
            const impostorDir = path.join(tmpDir, 'node_modules', 'shadowed-adapter');
            fs.mkdirSync(impostorDir, {recursive: true});
            fs.writeFileSync(
                path.join(impostorDir, 'package.json'),
                JSON.stringify({name: 'shadowed-adapter', version: '1.0.0', main: './index.js'})
            );
            fs.writeFileSync(
                path.join(impostorDir, 'index.js'),
                adapterSource({esm: false, className: 'ImpostorMailAdapter'})
            );

            writeAdapterPackage('shadowed-adapter', {main: './dist/index.js'});

            // The adapter in the adapter directory wins, not the node_modules one.
            assert.equal(getPackagedAdapter('shadowed-adapter').constructor.name, 'PackagedMailAdapter');
        });

        it('still loads a plain directory with an index.js and no package.json', function () {
            const pkgDir = path.join(tmpDir, 'mail', 'plain-adapter');
            fs.mkdirSync(pkgDir, {recursive: true});
            fs.writeFileSync(path.join(pkgDir, 'index.js'), adapterSource({esm: false}));

            assert.equal(getPackagedAdapter('plain-adapter').constructor.name, 'PackagedMailAdapter');
        });

        it('falls back to directory resolution when the manifest has no name', function () {
            const pkgDir = writeAdapterPackage('unnamed-adapter', {exports: {'.': './dist/index.js'}});
            // Self-referencing needs a name, so this must fall through to `main`.
            fs.writeFileSync(
                path.join(pkgDir, 'package.json'),
                JSON.stringify({version: '1.0.0', main: './dist/index.js'})
            );

            assert.equal(getPackagedAdapter('unnamed-adapter').constructor.name, 'PackagedMailAdapter');
        });

        it('surfaces an error when the manifest is malformed', function () {
            const pkgDir = writeAdapterPackage('broken-manifest-adapter', {main: './dist/index.js'});
            fs.writeFileSync(path.join(pkgDir, 'package.json'), '{not valid json');
            fs.writeFileSync(path.join(pkgDir, 'index.js'), adapterSource({esm: false}));

            // resolveAdapterEntryPoint leaves the path alone, but Node's own
            // directory resolution then rejects the manifest outright
            // (ERR_INVALID_PACKAGE_CONFIG) rather than falling back to index.js,
            // so the operator gets a real error instead of a silent miss.
            assert.throws(() => getPackagedAdapter('broken-manifest-adapter'), {
                errorType: 'IncorrectUsageError'
            });
        });

        describe('resolveAdapterEntryPoint', function () {
            it('returns non-absolute paths untouched', function () {
                // The node_modules lane passes a bare specifier, which Node
                // already resolves against `exports` itself.
                assert.equal(resolveAdapterEntryPoint('some-node-module-adapter'), 'some-node-module-adapter');
                assert.equal(resolveAdapterEntryPoint('relative/path/mail/custom'), 'relative/path/mail/custom');
            });

            it('returns a directory without a package.json untouched', function () {
                const pkgDir = path.join(tmpDir, 'mail', 'no-manifest');
                fs.mkdirSync(pkgDir, {recursive: true});

                assert.equal(resolveAdapterEntryPoint(pkgDir), pkgDir);
            });

            it('returns the path untouched when the manifest is malformed', function () {
                const pkgDir = writeAdapterPackage('bad-manifest', {exports: {'.': './dist/index.js'}});
                fs.writeFileSync(path.join(pkgDir, 'package.json'), '{not valid json');

                assert.equal(resolveAdapterEntryPoint(pkgDir), pkgDir);
            });

            it('resolves an entry point whose name begins with dots', function () {
                // Contained, despite looking like traversal at a glance.
                const pkgDir = writeAdapterPackage(
                    'dotted-entry',
                    {exports: {'.': './..hidden.js'}},
                    '..hidden.js'
                );

                assert.equal(
                    fs.realpathSync(resolveAdapterEntryPoint(pkgDir)),
                    fs.realpathSync(path.join(pkgDir, '..hidden.js'))
                );
            });

            it('rejects an entry point that escapes the adapter directory', function () {
                const pkgDir = path.join(tmpDir, 'mail', 'escaping-adapter');
                fs.mkdirSync(pkgDir, {recursive: true});
                fs.writeFileSync(path.join(tmpDir, 'mail', 'outside.js'), adapterSource({esm: false}));
                fs.writeFileSync(
                    path.join(pkgDir, 'package.json'),
                    JSON.stringify({name: 'escaping-adapter', exports: {'.': '../outside.js'}})
                );

                assert.equal(resolveAdapterEntryPoint(pkgDir), pkgDir);
            });

            it('resolves the exports entry point to a concrete file', function () {
                const pkgDir = writeAdapterPackage('resolve-me', {exports: {'.': './dist/index.js'}});

                // Compare realpaths: Node's resolution resolves symlinks, and on
                // macOS the temp dir is itself a symlink (/var -> /private/var).
                assert.equal(
                    fs.realpathSync(resolveAdapterEntryPoint(pkgDir)),
                    fs.realpathSync(path.join(pkgDir, 'dist', 'index.js'))
                );
            });
        });
    });
});
