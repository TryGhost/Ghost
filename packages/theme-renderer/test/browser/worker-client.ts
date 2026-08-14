/**
 * Shared client for the browser-lane worker tests: boots a fresh module
 * Worker (test/browser/render-worker.ts), posts one WorkerRenderRequest, and
 * resolves with the result plus the round-trip duration.
 *
 * One worker per render on purpose — the worker builds a fresh renderer per
 * message anyway (the editor loop's supported path: new renderer per edit),
 * and a cold worker keeps every test hermetic. The measured duration is the
 * full round trip: worker boot + bundle compile + createRenderer + render.
 */
import errors from '@tryghost/errors';
import type {WorkerRenderRequest, WorkerRenderResult} from './render-worker.ts';

export type TimedWorkerRenderResult = WorkerRenderResult & {durationMs: number};

export function renderInWorker(request: WorkerRenderRequest): Promise<TimedWorkerRenderResult> {
    const worker = new Worker(new URL('./render-worker.ts', import.meta.url), {type: 'module'});
    const startedAt = performance.now();
    return new Promise<TimedWorkerRenderResult>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<WorkerRenderResult>) => {
            resolve({...event.data, durationMs: performance.now() - startedAt});
        };
        // A bundling/import failure (e.g. a smuggled Node built-in) surfaces
        // here as a worker-level error rather than a posted message.
        worker.onerror = event => reject(new errors.InternalServerError({message: `worker failed to start or crashed: ${event.message}`}));
        worker.postMessage(request);
    }).finally(() => worker.terminate());
}
