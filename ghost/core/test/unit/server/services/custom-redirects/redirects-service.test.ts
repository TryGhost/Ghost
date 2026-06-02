import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';

import {RedirectsService} from '../../../../../core/server/services/custom-redirects/redirects-service';
import {InMemoryStore} from './helpers/in-memory-store';

describe('UNIT: RedirectsService', function () {
    let store: InMemoryStore;
    let redirectManager: {
        removeAllRedirects: sinon.SinonStub;
        addRedirect: sinon.SinonStub;
    };
    let dryRunManager: {addRedirect: sinon.SinonStub};
    let createDryRunManager: sinon.SinonStub;
    let validate: sinon.SinonStub;
    let service: RedirectsService;

    beforeEach(function () {
        store = new InMemoryStore();
        redirectManager = {
            removeAllRedirects: sinon.stub(),
            addRedirect: sinon.stub().returns('id')
        };
        dryRunManager = {
            addRedirect: sinon.stub().returns('id')
        };
        createDryRunManager = sinon.stub().returns(dryRunManager);
        validate = sinon.stub();
        service = new RedirectsService({
            store,
            redirectManager,
            validate,
            createDryRunManager
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('activate', function () {
        it('clears existing redirects, then loads each one from the store', async function () {
            await store.replaceAll([
                {from: '/a', to: '/b', permanent: true},
                {from: '/c', to: '/d', permanent: false}
            ]);

            await service.activate();

            sinon.assert.calledOnce(redirectManager.removeAllRedirects);
            sinon.assert.calledTwice(redirectManager.addRedirect);
            sinon.assert.calledWithExactly(
                redirectManager.addRedirect.firstCall,
                '/a',
                '/b',
                {permanent: true}
            );
            sinon.assert.calledWithExactly(
                redirectManager.addRedirect.secondCall,
                '/c',
                '/d',
                {permanent: false}
            );
            assert.ok(
                redirectManager.removeAllRedirects.calledBefore(redirectManager.addRedirect),
                'must clear before adding new redirects'
            );
        });

        it('runs validation against each redirect before loading it', async function () {
            await store.replaceAll([
                {from: '/a', to: '/b', permanent: true},
                {from: '/c', to: '/d', permanent: false}
            ]);

            await service.activate();

            sinon.assert.calledTwice(validate);
        });

        it('skips and logs invalid individual redirects without crashing', async function () {
            const loggingError = sinon.stub(logging, 'error');

            validate.callsFake((batch: Array<{from: string}>) => {
                if (batch[0].from === '/bad') {
                    throw new Error('bad regex');
                }
            });

            await store.replaceAll([
                {from: '/ok-1', to: '/x', permanent: true},
                {from: '/bad', to: '/y', permanent: true},
                {from: '/ok-2', to: '/z', permanent: false}
            ]);

            await service.activate();

            sinon.assert.calledTwice(redirectManager.addRedirect);
            sinon.assert.calledWithExactly(
                redirectManager.addRedirect.firstCall,
                '/ok-1',
                '/x',
                {permanent: true}
            );
            sinon.assert.calledWithExactly(
                redirectManager.addRedirect.secondCall,
                '/ok-2',
                '/z',
                {permanent: false}
            );
            sinon.assert.called(loggingError);
        });

        it('skips and logs when the redirect manager rejects an entry', async function () {
            const loggingError = sinon.stub(logging, 'error');

            redirectManager.addRedirect.onSecondCall().throws(new Error('manager rejected'));

            await store.replaceAll([
                {from: '/ok-1', to: '/x', permanent: true},
                {from: '/blows-up', to: '/y', permanent: true},
                {from: '/ok-2', to: '/z', permanent: false}
            ]);

            await service.activate();

            sinon.assert.calledThrice(redirectManager.addRedirect);
            sinon.assert.called(loggingError);
        });

        it('skips and logs when the redirect manager silently rejects an entry by returning null', async function () {
            const loggingError = sinon.stub(logging, 'error');

            redirectManager.addRedirect.onSecondCall().returns(null);

            await store.replaceAll([
                {from: '/ok-1', to: '/x', permanent: true},
                {from: '/silently-rejected', to: '/y', permanent: true},
                {from: '/ok-2', to: '/z', permanent: false}
            ]);

            await service.activate();

            sinon.assert.calledThrice(redirectManager.addRedirect);
            sinon.assert.called(loggingError);
        });

        it('logs a distinct warning when every redirect in the store was skipped', async function () {
            const loggingError = sinon.stub(logging, 'error');

            validate.throws(new Error('all bad'));

            await store.replaceAll([
                {from: '/a', to: '/b', permanent: true},
                {from: '/c', to: '/d', permanent: false}
            ]);

            await service.activate();

            sinon.assert.notCalled(redirectManager.addRedirect);
            const messages = loggingError.args.map(([arg]) => arg.message || arg);
            assert.ok(
                messages.some(m => /None of the 2 redirect/.test(m)),
                `expected a zero-survived warning, got: ${JSON.stringify(messages)}`
            );
        });

        it('is callable independently of replace and re-clears on each call', async function () {
            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

            await service.activate();
            await service.activate();

            sinon.assert.calledTwice(redirectManager.removeAllRedirects);
        });

        it('does not retain a reference to the same DynamicRedirectManager across calls', async function () {
            // site.js mounts redirectManager.handleRequest at boot;
            // swapping the manager would dangle that reference.
            const handlerBefore = redirectManager.removeAllRedirects;

            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);
            await service.activate();

            assert.equal(redirectManager.removeAllRedirects, handlerBefore);
        });
    });

    describe('replace', function () {
        it('validates the batch, persists it, and activates', async function () {
            const redirects = [{from: '/a', to: '/b', permanent: true}];

            await service.replace(redirects);

            sinon.assert.calledWith(validate, redirects);
            assert.deepEqual(await store.getAll(), redirects);
            sinon.assert.calledOnce(redirectManager.addRedirect);
        });

        it('does not re-read the store after a successful write', async function () {
            const storeGetAll = sinon.spy(store, 'getAll');

            await service.replace([{from: '/a', to: '/b', permanent: true}]);

            sinon.assert.notCalled(storeGetAll);
        });

        it('does not persist or activate when batch validation fails', async function () {
            validate.callsFake((batch: Array<{from: string}>) => {
                if (batch.length > 1) {
                    throw new Error('bad batch');
                }
            });

            await assert.rejects(
                () => service.replace([
                    {from: '/a', to: '/b'},
                    {from: '/c', to: '/d'}
                ]),
                {message: 'bad batch'}
            );

            assert.deepEqual(await store.getAll(), []);
            sinon.assert.notCalled(redirectManager.addRedirect);
        });

        it('rejects the upload before persisting if any entry would fail to load', async function () {
            dryRunManager.addRedirect.onSecondCall().returns(null);

            await assert.rejects(
                () => service.replace([
                    {from: '/a', to: '/b', permanent: true},
                    {from: '/bad-regex', to: '/y', permanent: true}
                ]),
                {errorType: 'ValidationError'}
            );

            assert.deepEqual(await store.getAll(), []);
            sinon.assert.notCalled(redirectManager.addRedirect);
        });

        it('rejects the upload as ValidationError when the dry-run manager throws', async function () {
            dryRunManager.addRedirect.onSecondCall().throws(new Error('manager exploded'));

            await assert.rejects(
                () => service.replace([
                    {from: '/a', to: '/b', permanent: true},
                    {from: '/explodes', to: '/y', permanent: true}
                ]),
                {errorType: 'ValidationError'}
            );

            assert.deepEqual(await store.getAll(), []);
            sinon.assert.notCalled(redirectManager.addRedirect);
        });

        it('throws if the live manager rejects an entry the dry-run accepted', async function () {
            // Structurally impossible today because dry-run and live
            // share a factory, but the throw guards the invariant
            // against any future DynamicRedirectManager change that
            // introduces instance-divergent state.
            redirectManager.addRedirect.onSecondCall().returns(null);

            await assert.rejects(
                () => service.replace([
                    {from: '/a', to: '/b', permanent: true},
                    {from: '/inconsistent', to: '/y', permanent: true}
                ]),
                {errorType: 'ValidationError'}
            );

            // The write committed before the live load tried to register.
            // Self-heals on the next boot via the skip-and-log path.
            assert.deepEqual(await store.getAll(), [
                {from: '/a', to: '/b', permanent: true},
                {from: '/inconsistent', to: '/y', permanent: true}
            ]);
        });
    });

    describe('getAll', function () {
        it('returns redirects from the store', async function () {
            const redirects = [{from: '/a', to: '/b', permanent: true}];
            await store.replaceAll(redirects);

            assert.deepEqual(await service.getAll(), redirects);
        });
    });

    describe('init', function () {
        it('runs activate', async function () {
            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

            await service.init();

            sinon.assert.calledOnce(redirectManager.addRedirect);
        });

        it('logs and swallows errors when the store fails', async function () {
            const loggingError = sinon.stub(logging, 'error');

            const failingStore = {
                getAll: sinon.stub().rejects(new Error('disk gone')),
                replaceAll: sinon.stub()
            };
            service = new RedirectsService({
                store: failingStore,
                redirectManager,
                validate
            });

            await service.init();

            sinon.assert.called(loggingError);
            sinon.assert.notCalled(redirectManager.addRedirect);
        });

        it('does not clear an already-active manager when the store fails', async function () {
            sinon.stub(logging, 'error');

            const failingStore = {
                getAll: sinon.stub().rejects(new Error('disk gone')),
                replaceAll: sinon.stub()
            };
            service = new RedirectsService({
                store: failingStore,
                redirectManager,
                validate
            });

            await service.init();

            sinon.assert.notCalled(redirectManager.removeAllRedirects);
        });
    });
});
