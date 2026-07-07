import assert from 'node:assert/strict';
import {createContainer, ContainerResolutionError} from '../../../../core/shared/container/container';

describe('container', function () {
    describe('resolve', function () {
        it('constructs an instance using the registered factory', function () {
            const root = createContainer();
            root.register('greeting', {
                lifetime: 'SCOPED',
                factory: () => 'hello'
            });

            const scope = root.createScope();

            assert.equal(scope.resolve('greeting'), 'hello');
        });

        it('injects dependencies by name through the cradle', function () {
            const root = createContainer();
            root.register('config', {
                lifetime: 'SCOPED',
                factory: () => ({name: 'site-a'})
            });
            root.register('service', {
                lifetime: 'SCOPED',
                factory: ({config}) => `service for ${config.name}`
            });

            const scope = root.createScope();

            assert.equal(scope.resolve('service'), 'service for site-a');
        });

        it('memoizes scoped instances within a scope', function () {
            const root = createContainer();
            let constructions = 0;
            root.register('service', {
                lifetime: 'SCOPED',
                factory: () => {
                    constructions += 1;
                    return {};
                }
            });

            const scope = root.createScope();

            assert.equal(scope.resolve('service'), scope.resolve('service'));
            assert.equal(constructions, 1);
        });

        it('constructs distinct scoped instances per scope', function () {
            const root = createContainer();
            root.register('service', {
                lifetime: 'SCOPED',
                factory: () => ({})
            });

            const scopeA = root.createScope();
            const scopeB = root.createScope();

            assert.notEqual(scopeA.resolve('service'), scopeB.resolve('service'));
        });

        it('shares singleton instances across scopes', function () {
            const root = createContainer();
            root.register('logger', {
                lifetime: 'SINGLETON',
                factory: () => ({})
            });

            const scopeA = root.createScope();
            const scopeB = root.createScope();

            assert.equal(scopeA.resolve('logger'), scopeB.resolve('logger'));
        });

        it('allows deferred cradle access after construction', function () {
            const root = createContainer();
            root.register('serviceA', {
                lifetime: 'SCOPED',
                factory: cradle => ({
                    get other() {
                        return cradle.serviceB;
                    }
                })
            });
            root.register('serviceB', {
                lifetime: 'SCOPED',
                factory: () => 'b-instance'
            });

            const scope = root.createScope();
            const serviceA = scope.resolve('serviceA') as {other: string};

            assert.equal(serviceA.other, 'b-instance');
        });
    });

    describe('seed values', function () {
        it('exposes seed values through the cradle, per scope', function () {
            const root = createContainer();
            root.register('service', {
                lifetime: 'SCOPED',
                factory: ({siteConfig}) => siteConfig.url
            });

            const scopeA = root.createScope({siteConfig: {url: 'https://a.example'}});
            const scopeB = root.createScope({siteConfig: {url: 'https://b.example'}});

            assert.equal(scopeA.resolve('service'), 'https://a.example');
            assert.equal(scopeB.resolve('service'), 'https://b.example');
        });
    });

    describe('resolution errors', function () {
        it('throws on unknown names, naming the requester', function () {
            const root = createContainer();
            root.register('service', {
                lifetime: 'SCOPED',
                factory: ({missing}) => missing
            });

            const scope = root.createScope();

            assert.throws(() => scope.resolve('service'), (error: Error) => {
                assert(error instanceof ContainerResolutionError);
                assert.match(error.message, /missing/);
                assert.match(error.message, /service/);
                return true;
            });
        });

        it('throws on dependency cycles, printing the path', function () {
            const root = createContainer();
            root.register('serviceA', {
                lifetime: 'SCOPED',
                factory: ({serviceB}) => serviceB
            });
            root.register('serviceB', {
                lifetime: 'SCOPED',
                factory: ({serviceA}) => serviceA
            });

            const scope = root.createScope();

            assert.throws(() => scope.resolve('serviceA'), (error: Error) => {
                assert(error instanceof ContainerResolutionError);
                assert.match(error.message, /serviceA -> serviceB -> serviceA/);
                return true;
            });
        });

        it('throws when a singleton depends on a scoped registration', function () {
            const root = createContainer();
            root.register('settingsCache', {
                lifetime: 'SCOPED',
                factory: () => ({})
            });
            root.register('logger', {
                lifetime: 'SINGLETON',
                factory: ({settingsCache}) => settingsCache
            });

            const scope = root.createScope();

            assert.throws(() => scope.resolve('logger'), (error: Error) => {
                assert(error instanceof ContainerResolutionError);
                assert.match(error.message, /captive/i);
                return true;
            });
        });

        it('throws when a singleton depends on a seed value', function () {
            const root = createContainer();
            root.register('logger', {
                lifetime: 'SINGLETON',
                factory: ({siteConfig}) => siteConfig
            });

            const scope = root.createScope({siteConfig: {}});

            assert.throws(() => scope.resolve('logger'), (error: Error) => {
                assert(error instanceof ContainerResolutionError);
                assert.match(error.message, /captive/i);
                return true;
            });
        });

        it('throws when resolving a scoped registration from the root', function () {
            const root = createContainer();
            root.register('service', {
                lifetime: 'SCOPED',
                factory: () => ({})
            });

            assert.throws(() => root.resolve('service'), ContainerResolutionError);
        });

        it('resolves singletons directly from the root', function () {
            const root = createContainer();
            root.register('logger', {
                lifetime: 'SINGLETON',
                factory: () => 'the-logger'
            });

            assert.equal(root.resolve('logger'), 'the-logger');
        });
    });

    describe('eager registrations', function () {
        it('constructs eager registrations on init, in registration order', function () {
            const root = createContainer();
            const constructed: string[] = [];
            root.register('second', {
                lifetime: 'SCOPED',
                eager: true,
                factory: () => constructed.push('second')
            });
            root.register('lazy', {
                lifetime: 'SCOPED',
                factory: () => constructed.push('lazy')
            });
            root.register('first', {
                lifetime: 'SCOPED',
                eager: true,
                factory: () => constructed.push('first')
            });

            const scope = root.createScope();
            scope.init();

            assert.deepEqual(constructed, ['second', 'first']);
        });
    });

    describe('dispose', function () {
        it('runs disposers in reverse instantiation order', async function () {
            const root = createContainer();
            const disposed: string[] = [];
            root.register('serviceA', {
                lifetime: 'SCOPED',
                factory: () => 'a',
                dispose: () => {
                    disposed.push('a');
                }
            });
            root.register('serviceB', {
                lifetime: 'SCOPED',
                factory: ({serviceA}) => `b after ${serviceA}`,
                dispose: () => {
                    disposed.push('b');
                }
            });

            const scope = root.createScope();
            scope.resolve('serviceB');
            await scope.dispose();

            assert.deepEqual(disposed, ['b', 'a']);
        });

        it('only disposes instances the scope constructed', async function () {
            const root = createContainer();
            const disposed: string[] = [];
            root.register('used', {
                lifetime: 'SCOPED',
                factory: () => 'used',
                dispose: () => {
                    disposed.push('used');
                }
            });
            root.register('untouched', {
                lifetime: 'SCOPED',
                factory: () => 'untouched',
                dispose: () => {
                    disposed.push('untouched');
                }
            });

            const scope = root.createScope();
            scope.resolve('used');
            await scope.dispose();

            assert.deepEqual(disposed, ['used']);
        });

        it('leaves singletons alive when a scope is disposed', async function () {
            const root = createContainer();
            let disposals = 0;
            root.register('logger', {
                lifetime: 'SINGLETON',
                factory: () => ({}),
                dispose: () => {
                    disposals += 1;
                }
            });

            const scopeA = root.createScope();
            const scopeB = root.createScope();
            const instance = scopeA.resolve('logger');
            await scopeA.dispose();

            assert.equal(disposals, 0);
            assert.equal(scopeB.resolve('logger'), instance);
        });

        it('disposes singletons when the root is disposed', async function () {
            const root = createContainer();
            const disposed: string[] = [];
            root.register('logger', {
                lifetime: 'SINGLETON',
                factory: () => 'logger',
                dispose: () => {
                    disposed.push('logger');
                }
            });

            root.resolve('logger');
            await root.dispose();

            assert.deepEqual(disposed, ['logger']);
        });

        it('awaits async disposers', async function () {
            const root = createContainer();
            let finished = false;
            root.register('pool', {
                lifetime: 'SCOPED',
                factory: () => ({}),
                dispose: async () => {
                    await new Promise((resolve) => {
                        setTimeout(resolve, 5);
                    });
                    finished = true;
                }
            });

            const scope = root.createScope();
            scope.resolve('pool');
            await scope.dispose();

            assert.equal(finished, true);
        });

        it('rejects resolution from a disposed scope', async function () {
            const root = createContainer();
            root.register('service', {
                lifetime: 'SCOPED',
                factory: () => ({})
            });

            const scope = root.createScope();
            await scope.dispose();

            assert.throws(() => scope.resolve('service'), ContainerResolutionError);
        });
    });

    describe('register', function () {
        it('rejects duplicate registration names', function () {
            const root = createContainer();
            root.register('service', {
                lifetime: 'SCOPED',
                factory: () => ({})
            });

            assert.throws(() => root.register('service', {
                lifetime: 'SCOPED',
                factory: () => ({})
            }), ContainerResolutionError);
        });
    });
});
