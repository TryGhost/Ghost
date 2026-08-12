import assert from 'node:assert/strict';
import sinon from 'sinon';
import type {JobEnvelope, JobsBackendBase} from '@tryghost/adapter-base-jobs';
import InMemoryJobsBackend from '../../../../../core/server/adapters/jobs/InMemoryJobsBackend';
import {itBehavesLikeAJobsBackend} from './jobs-backend-contract';

describe('InMemoryJobsBackend adapter', function () {
    itBehavesLikeAJobsBackend({
        createBackend: () => new InMemoryJobsBackend(),
        settle: backend => (backend as InMemoryJobsBackend).allSettled()
    });

    describe('recurring schedules', function () {
        let clock: sinon.SinonFakeTimers;
        let backend: InMemoryJobsBackend;
        let deliveries: JobEnvelope[];

        const envelope: JobEnvelope = {type: 'test-recurring', payload: '{}'};

        beforeEach(async function () {
            clock = sinon.useFakeTimers({now: new Date('2026-01-01T00:00:00Z')});
            backend = new InMemoryJobsBackend();
            deliveries = [];
            await backend.start({processor: async (env) => {
                deliveries.push(env);
            }});
        });

        afterEach(function () {
            clock.restore();
        });

        it('delivers on the cron cadence, once per tick', async function () {
            await backend.scheduleRecurring(envelope, {cron: '*/5 * * * * *'});

            assert.equal(deliveries.length, 0);

            await clock.tickAsync(5 * 1000);
            assert.deepEqual(deliveries, [envelope]);

            await clock.tickAsync(5 * 1000);
            assert.deepEqual(deliveries, [envelope, envelope]);
        });

        it('supports five-field cron expressions', async function () {
            await backend.scheduleRecurring(envelope, {cron: '*/5 * * * *'});

            await clock.tickAsync(5 * 60 * 1000);
            assert.deepEqual(deliveries, [envelope]);
        });

        it('replaces the previous schedule when a type is re-scheduled', async function () {
            await backend.scheduleRecurring(envelope, {cron: '*/5 * * * * *'});
            await backend.scheduleRecurring(envelope, {cron: '*/30 * * * * *'});

            // The original 5s cadence must not fire — only the replacement.
            await clock.tickAsync(29 * 1000);
            assert.equal(deliveries.length, 0);

            await clock.tickAsync(1000);
            assert.deepEqual(deliveries, [envelope]);
        });

        it('stops ticking after shutdown', async function () {
            await backend.scheduleRecurring(envelope, {cron: '*/5 * * * * *'});

            await clock.tickAsync(5 * 1000);
            assert.equal(deliveries.length, 1);

            await backend.shutdown();

            await clock.tickAsync(60 * 1000);
            assert.equal(deliveries.length, 1);
        });
    });

    it('accepts work again when restarted after shutdown', async function () {
        const backend = new InMemoryJobsBackend();
        const deliveries: JobEnvelope[] = [];
        const processor = async (env: JobEnvelope) => {
            deliveries.push(env);
        };

        await backend.start({processor});
        await backend.shutdown();

        await backend.start({processor});
        await backend.enqueue({type: 'test-job', payload: '{}'});
        await backend.allSettled();

        assert.equal(deliveries.length, 1);
        await backend.shutdown();
    });

    describe('allSettled', function () {
        it('resolves immediately when idle', async function () {
            const backend = new InMemoryJobsBackend();
            await backend.allSettled();
        });
    });

    it('extends the JobsBackendBase contract with the expected requiredFns', function () {
        const backend: JobsBackendBase = new InMemoryJobsBackend();
        assert.deepEqual([...backend.requiredFns], ['start', 'enqueue', 'scheduleRecurring', 'shutdown']);
    });
});
