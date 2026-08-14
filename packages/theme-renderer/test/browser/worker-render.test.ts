/**
 * Slice-2 worker-parity capstone: the SAME `createRenderer(...).render(Request)
 * → Response` flow, executed inside a REAL Web Worker under Vitest browser
 * mode (Chromium), must reproduce the committed Node-rendered HTML byte for
 * byte for the same recorded fixtures.
 *
 * The committed expected-*.html files are what Node produced at record time,
 * and test/integration/fixture-parity.test.ts keeps them honest on the Node
 * side — so green here means worker output ≡ Node output, and that no Node
 * built-ins survived into the browser bundle.
 *
 * Fixtures are recorded (and re-recordable) via:
 *     node test/integration/record-browser-fixtures.ts
 */
import errors from '@tryghost/errors';
import {describe, expect, it} from 'vitest';
import {expectBytesEqual} from './expect-bytes-equal.ts';
import type {WorkerRenderRequest, WorkerRenderResult} from './render-worker.ts';
import type {ApiFixtures} from './replay-fetch.ts';
import instanceRaw from './fixtures/instance.json?raw';
import themeRaw from './fixtures/casper-theme.json?raw';
import apiFixturesRaw from './fixtures/content-api.json?raw';
import expectedHome from './fixtures/expected-home.html?raw';
import expectedPost from './fixtures/expected-post.html?raw';

interface InstanceFixture {
    siteUrl: string;
    contentApiKey: string;
    config: Record<string, unknown>;
    routes: {home: string; post: string};
}

const instance = JSON.parse(instanceRaw) as InstanceFixture;
const theme = JSON.parse(themeRaw) as Record<string, string>;
const apiFixtures = JSON.parse(apiFixturesRaw) as ApiFixtures;

function renderInWorker(path: string, markers = false): Promise<WorkerRenderResult> {
    const worker = new Worker(new URL('./render-worker.ts', import.meta.url), {type: 'module'});
    const request: WorkerRenderRequest = {
        siteUrl: instance.siteUrl,
        contentApiKey: instance.contentApiKey,
        theme,
        config: instance.config,
        apiFixtures,
        path,
        markers
    };
    return new Promise<WorkerRenderResult>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<WorkerRenderResult>) => resolve(event.data);
        // A bundling/import failure (e.g. a smuggled Node built-in) surfaces
        // here as a worker-level error rather than a posted message.
        worker.onerror = event => reject(new errors.InternalServerError({message: `worker failed to start or crashed: ${event.message}`}));
        worker.postMessage(request);
    }).finally(() => worker.terminate());
}

/** Byte-equality with first-divergence context (shared runtime-neutral helper). */
function expectWorkerBytesEqual(rendered: string, expected: string, route: string): void {
    expectBytesEqual(rendered, expected, route, {actual: 'worker', expected: 'node-recorded'});
}

describe('worker render parity (real Web Worker, Chromium)', function () {
    it('renders the home route byte-identical to the Node render', async function () {
        const result = await renderInWorker(instance.routes.home);
        if (!result.ok) {
            expect.fail(`worker render failed:\n${result.error}`);
        }
        expect(result.status).toBe(200);
        expectWorkerBytesEqual(result.html, expectedHome, instance.routes.home);
    });

    it('renders the post route byte-identical to the Node render', async function () {
        const result = await renderInWorker(instance.routes.post);
        if (!result.ok) {
            expect.fail(`worker render failed:\n${result.error}`);
        }
        expect(result.status).toBe(200);
        expectWorkerBytesEqual(result.html, expectedPost, instance.routes.post);
    });

    // Slice 3 (editor spike): the editor runs marker renders in this exact
    // worker lane — data-edit source markers must work here too, and stripping
    // them must recover the parity bytes exactly.
    it('renders the home route with source markers in the worker (editor lane)', async function () {
        const result = await renderInWorker(instance.routes.home, true);
        if (!result.ok) {
            expect.fail(`worker markers render failed:\n${result.error}`);
        }
        expect(result.status).toBe(200);
        expect(result.html).toContain(' data-edit="');
        expect(result.html).toContain('data-edit="partials/post-card.hbs:');
        expectWorkerBytesEqual(result.html.replace(/ data-edit="[^"]*"/g, ''), expectedHome, instance.routes.home);
    });
});
