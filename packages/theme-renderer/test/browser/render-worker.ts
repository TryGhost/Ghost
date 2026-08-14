/**
 * Web Worker entry for the worker-parity test (spec, slice 2: "same render
 * passing in a real Web Worker — proving no Node built-ins smuggled in").
 *
 * This is the whole point of the exercise: `createRenderer(...).render(new
 * Request(...)) → Response` runs INSIDE a real module Worker, over exactly the
 * web-standard surface the package promises (fetch/Request/Response/URL). The
 * test posts the theme files, instance config and recorded Content API
 * fixtures in; the worker posts the rendered HTML back.
 */
import {createRenderer} from '../../src/index.ts';
import {createReplayFetch, type ApiFixtures} from './replay-fetch.ts';

export interface WorkerRenderRequest {
    siteUrl: string;
    contentApiKey: string;
    /** Theme files, path → content */
    theme: Record<string, string>;
    /** Instance config (asset hash, portal/sodo-search URLs) */
    config: Record<string, unknown>;
    /** Recorded Content API responses, replayed by URL */
    apiFixtures: ApiFixtures;
    /** Route path to render, e.g. '/' */
    path: string;
}

export type WorkerRenderResult =
    | {ok: true; status: number; html: string}
    | {ok: false; error: string};

function post(result: WorkerRenderResult): void {
    self.postMessage(result);
}

self.onmessage = async (event: MessageEvent<WorkerRenderRequest>): Promise<void> => {
    const {siteUrl, contentApiKey, theme, config, apiFixtures, path} = event.data;
    try {
        const renderer = await createRenderer({
            siteUrl,
            contentApiKey,
            theme,
            config,
            fetch: createReplayFetch(apiFixtures)
        });
        const response = await renderer.render(new Request(new URL(path, siteUrl).toString()));
        const html = await response.text();
        post({ok: true, status: response.status, html});
    } catch (error) {
        post({ok: false, error: error instanceof Error ? (error.stack ?? error.message) : String(error)});
    }
};
