import assert from 'node:assert/strict';
import {JobsBackendBase, JobEnvelope} from './base.ts';

export type BackendFactory = () => JobsBackendBase;

export interface JobsContractTestFramework {
    describe(name: string, fn: () => void): void;
    it(name: string, fn: () => void | Promise<void>): void;
}

interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T) => void;
}

function deferred<T = void>(): Deferred<T> {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
        resolve = res;
    });
    return {promise, resolve};
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function runJobsBackendContractTests(
    makeBackend: BackendFactory,
    {describe, it}: JobsContractTestFramework
): void {
    const envelope: JobEnvelope = {type: 'test-job', payload: '{"value":1}'};

    describe('jobs backend contract', function () {
        it('delivers an enqueued envelope to the processor', async function () {
            const received: JobEnvelope[] = [];
            const backend = makeBackend();
            await backend.start({processor: async (env) => {
                received.push(env);
            }});

            await backend.enqueue(envelope);
            await backend.shutdown({timeoutMs: 1000});

            assert.deepEqual(received, [envelope]);
        });

        it('resolves enqueue on acceptance, not on completion', async function () {
            let completed = false;
            const release = deferred();
            const started = deferred();

            const backend = makeBackend();
            await backend.start({processor: async () => {
                started.resolve();
                await release.promise;
                completed = true;
            }});

            await backend.enqueue(envelope);

            await started.promise;
            assert.equal(completed, false);

            release.resolve();
            await backend.shutdown({timeoutMs: 1000});
            assert.equal(completed, true);
        });

        it('drains in-flight work on shutdown', async function () {
            let completed = false;
            const backend = makeBackend();
            await backend.start({processor: async () => {
                await delay(30);
                completed = true;
            }});

            await backend.enqueue(envelope);
            await backend.shutdown({timeoutMs: 1000});

            assert.equal(completed, true);
        });

        it('bounds shutdown when a handler hangs', async function () {
            const backend = makeBackend();
            const started = deferred();
            await backend.start({processor: () => new Promise<void>(() => {
                started.resolve();
            })});

            await backend.enqueue(envelope);
            await started.promise;

            const raced = await Promise.race([
                Promise.resolve(backend.shutdown({timeoutMs: 30})).then(() => 'shutdown'),
                delay(2000).then(() => 'hung')
            ]);

            assert.equal(raced, 'shutdown');
        });

        it('tolerates start after a prior shutdown', async function () {
            const received: JobEnvelope[] = [];
            const backend = makeBackend();

            await backend.start({processor: async () => {}});
            await backend.shutdown({timeoutMs: 1000});

            await backend.start({processor: async (env) => {
                received.push(env);
            }});
            await backend.enqueue(envelope);
            await backend.shutdown({timeoutMs: 1000});

            assert.deepEqual(received, [envelope]);
        });
    });
}
