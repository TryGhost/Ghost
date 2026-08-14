import assert from 'node:assert/strict';
import {EDITOR_WORKER_FILENAME, resolveWorkerUrl, startRenderClient} from '../src/edit-mode/render-client.js';

const BOOT_OPTIONS = {
    siteUrl: 'https://site.example.com/',
    contentApiKey: 'abc123',
    config: {},
    theme: {'index.hbs': '<h1>{{title}}</h1>'}
};

/** Worker double implementing just the surface createWorkerRpc touches. */
class FakeWorker {
    constructor({onCall}) {
        this.onmessage = null;
        this.onerror = null;
        this.terminated = false;
        this.handleCall = onCall;
    }

    postMessage(message) {
        queueMicrotask(() => {
            const reply = this.handleCall(message, this);
            if (reply) {
                this.onmessage?.({data: {id: message.id, ...reply}});
            }
        });
    }

    terminate() {
        this.terminated = true;
    }
}

function fakeBackendFactory(log) {
    return (options) => {
        log.push({event: 'backend-created', options});
        return {
            async setTheme(theme) {
                log.push({event: 'set-theme', theme});
            },
            async render(url, renderOptions) {
                log.push({event: 'render', url, renderOptions});
                return {status: 200, html: '<html></html>', url};
            }
        };
    };
}

describe('edit-mode render-client', function () {
    it('resolves the worker artifact URL relative to the toolbar script URL', function () {
        assert.equal(
            resolveWorkerUrl('https://cdn.example.com/admin-toolbar/admin-toolbar.min.js'),
            `https://cdn.example.com/admin-toolbar/${EDITOR_WORKER_FILENAME}`
        );
    });

    it('uses the worker when init succeeds and routes calls through it', async function () {
        const calls = [];
        const worker = new FakeWorker({
            onCall(message) {
                calls.push(message);
                if (message.type === 'render') {
                    return {ok: true, result: {status: 200, html: '<html>from worker</html>', url: message.payload.url}};
                }
                return {ok: true, result: null};
            }
        });

        const client = await startRenderClient({
            ...BOOT_OPTIONS,
            workerUrl: 'https://cdn.example.com/worker.min.js',
            workerFactory: () => ({worker, blobUrl: null})
        });

        assert.equal(client.mode, 'worker');
        assert.deepEqual(calls[0].type, 'init');
        assert.deepEqual(calls[0].payload.theme, BOOT_OPTIONS.theme);

        const result = await client.render('https://site.example.com/', {markers: true});
        assert.equal(result.html, '<html>from worker</html>');
        assert.equal(calls.at(-1).type, 'render');
        assert.equal(calls.at(-1).payload.markers, true);

        await client.setTheme({'index.hbs': '<h1>edited</h1>'});
        assert.equal(calls.at(-1).type, 'set-theme');

        client.destroy();
        assert.equal(worker.terminated, true);
    });

    it('falls back to the main thread when worker construction throws', async function () {
        const log = [];

        const client = await startRenderClient({
            ...BOOT_OPTIONS,
            workerUrl: 'https://cdn.example.com/worker.min.js',
            workerFactory: () => {
                throw new Error('CSP: blob workers forbidden');
            },
            backendFactory: fakeBackendFactory(log)
        });

        assert.equal(client.mode, 'main');
        assert.equal(log[0].event, 'backend-created');
        assert.deepEqual(log[1], {event: 'set-theme', theme: BOOT_OPTIONS.theme});

        const result = await client.render('https://site.example.com/', {markers: true});
        assert.equal(result.status, 200);
        assert.deepEqual(log.at(-1), {
            event: 'render',
            url: 'https://site.example.com/',
            renderOptions: {markers: true}
        });
    });

    it('falls back to the main thread when the worker init call fails', async function () {
        const log = [];
        const worker = new FakeWorker({
            onCall(message, self) {
                // simulate a boot crash: worker-level error instead of a reply
                self.onerror?.({message: 'importScripts failed'});
                return null;
            }
        });

        const client = await startRenderClient({
            ...BOOT_OPTIONS,
            workerUrl: 'https://cdn.example.com/worker.min.js',
            workerFactory: () => ({worker, blobUrl: null}),
            backendFactory: fakeBackendFactory(log)
        });

        assert.equal(client.mode, 'main');
        assert.equal(worker.terminated, true, 'the failed worker must be terminated');
        assert.equal(log[0].event, 'backend-created');
    });

    it('skips the worker path entirely when no worker URL is available', async function () {
        const log = [];

        const client = await startRenderClient({
            ...BOOT_OPTIONS,
            workerUrl: '',
            workerFactory: () => {
                throw new Error('must not be called');
            },
            backendFactory: fakeBackendFactory(log)
        });

        assert.equal(client.mode, 'main');
        assert.equal(log[0].event, 'backend-created');
    });

    it('rejects when neither a worker URL nor a backend factory is available', async function () {
        await assert.rejects(
            startRenderClient({...BOOT_OPTIONS, workerUrl: ''}),
            /edit_mode_renderer_unavailable/
        );
    });

    describe('post-init failover', function () {
        it('switches to the main-thread backend and retries once when the worker crashes mid-session', async function () {
            const log = [];
            const worker = new FakeWorker({
                onCall(message, self) {
                    if (message.type === 'render') {
                        // post-init crash: worker-level error instead of a reply
                        self.onerror?.({message: 'worker exploded'});
                        return null;
                    }
                    return {ok: true, result: null};
                }
            });

            const client = await startRenderClient({
                ...BOOT_OPTIONS,
                workerUrl: 'https://cdn.example.com/worker.min.js',
                workerFactory: () => ({worker, blobUrl: null}),
                backendFactory: fakeBackendFactory(log)
            });
            assert.equal(client.mode, 'worker');
            assert.equal(log.length, 0, 'no fallback backend before the crash');

            // the crashed call itself succeeds via the fallback retry
            const result = await client.render('https://site.example.com/', {markers: true});
            assert.equal(result.status, 200);
            assert.equal(worker.terminated, true, 'the crashed worker is terminated');
            assert.equal(log[0].event, 'backend-created');
            assert.deepEqual(log[1], {event: 'set-theme', theme: BOOT_OPTIONS.theme}, 'the fallback boots with the current theme');
            assert.deepEqual(log[2], {
                event: 'render',
                url: 'https://site.example.com/',
                renderOptions: {markers: true}
            });

            // permanently on the main thread from here on
            await client.setTheme({'index.hbs': '<h1>edited</h1>'});
            assert.deepEqual(log.at(-1), {event: 'set-theme', theme: {'index.hbs': '<h1>edited</h1>'}});
        });

        it('switches to the main-thread backend when a call times out', async function () {
            const log = [];
            const worker = new FakeWorker({
                onCall(message) {
                    if (message.type === 'set-theme') {
                        return null; // never replies → per-call timeout fires
                    }
                    return {ok: true, result: null};
                }
            });

            const client = await startRenderClient({
                ...BOOT_OPTIONS,
                workerUrl: 'https://cdn.example.com/worker.min.js',
                workerFactory: () => ({worker, blobUrl: null}),
                backendFactory: fakeBackendFactory(log),
                callTimeoutMs: 20
            });

            const nextTheme = {'index.hbs': '<h1>edited</h1>'};
            await client.setTheme(nextTheme);

            assert.equal(worker.terminated, true);
            assert.equal(log[0].event, 'backend-created');
            assert.deepEqual(log[1], {event: 'set-theme', theme: BOOT_OPTIONS.theme}, 'fallback boots with the last-good theme');
            assert.deepEqual(log[2], {event: 'set-theme', theme: nextTheme}, 'the timed-out call is retried once');
        });

        it('does not fail over on renderer-level errors relayed by the worker', async function () {
            const log = [];
            const worker = new FakeWorker({
                onCall(message) {
                    if (message.type === 'render') {
                        return {ok: false, error: 'template_error:index.hbs'};
                    }
                    return {ok: true, result: null};
                }
            });

            const client = await startRenderClient({
                ...BOOT_OPTIONS,
                workerUrl: 'https://cdn.example.com/worker.min.js',
                workerFactory: () => ({worker, blobUrl: null}),
                backendFactory: fakeBackendFactory(log)
            });

            await assert.rejects(client.render('https://site.example.com/'), /template_error:index\.hbs/);
            assert.equal(worker.terminated, false, 'a renderer error must not kill the worker');
            assert.equal(log.length, 0, 'no fallback backend is created');
        });
    });
});
