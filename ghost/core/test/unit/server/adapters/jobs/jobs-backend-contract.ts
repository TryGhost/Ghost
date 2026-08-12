import assert from 'node:assert/strict';
import type {JobEnvelope, JobsBackendBase} from '@tryghost/adapter-base-jobs';

/**
 * Shared behaviour suite for jobs backends. The in-memory backend runs it
 * today; a future durable backend must pass it unchanged — the suite asserts
 * the contract documented on JobsBackendBase, not implementation details.
 * See packages/adapters/jobs-base/README.md for the full testing plan for
 * durable backends.
 */
export interface JobsBackendHarness {
    createBackend(): JobsBackendBase;
    /** Wait until every accepted job has been delivered and settled. */
    settle(backend: JobsBackendBase): Promise<void>;
}

function deferred<T = void>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
}

function envelope(n = 0): JobEnvelope {
    return {type: 'test-job', payload: JSON.stringify({n})};
}

export function itBehavesLikeAJobsBackend({createBackend, settle}: JobsBackendHarness) {
    describe('jobs backend contract', function () {
        it('resolves enqueue on acceptance, before the delivery has completed', async function () {
            const backend = createBackend();
            const gate = deferred();
            let delivered = 0;

            await backend.start({processor: async () => {
                await gate.promise;
                delivered += 1;
            }});

            // Must resolve while the delivery is still blocked — acceptance,
            // not completion.
            await backend.enqueue(envelope());
            assert.equal(delivered, 0);

            gate.resolve();
            await settle(backend);
            assert.equal(delivered, 1);

            await backend.shutdown();
        });

        it('delivers accepted envelopes verbatim and in acceptance order', async function () {
            const backend = createBackend();
            const deliveries: JobEnvelope[] = [];

            await backend.start({processor: async (env) => {
                deliveries.push(env);
            }});

            await backend.enqueue(envelope(1));
            await backend.enqueue(envelope(2));
            await backend.enqueue(envelope(3));
            await settle(backend);

            assert.deepEqual(deliveries, [envelope(1), envelope(2), envelope(3)]);

            await backend.shutdown();
        });

        it('waits for in-flight and queued deliveries before completing shutdown', async function () {
            const backend = createBackend();
            const deliveries: JobEnvelope[] = [];

            await backend.start({processor: async (env) => {
                // Force the delivery to span a macrotask so shutdown genuinely
                // has something in flight to wait for.
                await new Promise((resolve) => {
                    setTimeout(resolve, 10);
                });
                deliveries.push(env);
            }});

            await backend.enqueue(envelope(1));
            await backend.enqueue(envelope(2));
            await backend.shutdown({timeoutMs: 5000});

            assert.deepEqual(deliveries, [envelope(1), envelope(2)]);
        });

        it('keeps delivering after a processor call rejects', async function () {
            const backend = createBackend();
            const deliveries: JobEnvelope[] = [];

            await backend.start({processor: async (env) => {
                if (JSON.parse(env.payload).n === 1) {
                    throw new Error('the processor never rejects — the backend must survive it anyway');
                }
                deliveries.push(env);
            }});

            await backend.enqueue(envelope(1));
            await backend.enqueue(envelope(2));
            await settle(backend);

            assert.deepEqual(deliveries, [envelope(2)]);

            await backend.shutdown();
        });

        it('completes shutdown within the timeout when a delivery is stuck', async function () {
            const backend = createBackend();
            const stuck = deferred();

            await backend.start({processor: async () => {
                await stuck.promise;
            }});

            await backend.enqueue(envelope());
            // Give the stuck delivery a chance to start.
            await new Promise((resolve) => {
                setTimeout(resolve, 0);
            });

            // Must resolve despite the handler never settling.
            await backend.shutdown({timeoutMs: 50});

            stuck.resolve();
        });

        it('rejects work before start has wired the processor', async function () {
            const backend = createBackend();

            await assert.rejects(async () => {
                await backend.enqueue(envelope());
            }, /before the jobs backend is started/);
        });

        it('rejects work after shutdown', async function () {
            const backend = createBackend();
            await backend.start({processor: async () => {}});
            await backend.shutdown();

            await assert.rejects(async () => {
                await backend.enqueue(envelope());
            }, /after the jobs backend has been shut down/);
        });

        it('rejects an invalid cron expression at scheduling time', async function () {
            const backend = createBackend();
            await backend.start({processor: async () => {}});

            await assert.rejects(async () => {
                await backend.scheduleRecurring(envelope(), {cron: 'not a cron'});
            }, /Invalid cron expression/);

            await backend.shutdown();
        });

        it('accepts a valid recurring schedule', async function () {
            const backend = createBackend();
            await backend.start({processor: async () => {}});

            await backend.scheduleRecurring(envelope(), {cron: '0 30 2 * * *'});

            await backend.shutdown();
        });
    });
}
