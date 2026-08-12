import {describe, it} from 'vitest';
import assert from 'node:assert/strict';

import {JobEnvelope, JobsBackendBase, JobsStartOptions, RecurringSchedule} from '../src/base.ts';

describe('JobsBackendBase', function () {
    class TestBackend extends JobsBackendBase {
        public started: JobsStartOptions | null = null;
        public enqueued: JobEnvelope[] = [];
        public recurring: [JobEnvelope, RecurringSchedule][] = [];

        start(options: JobsStartOptions) {
            this.started = options;
        }

        enqueue(envelope: JobEnvelope) {
            this.enqueued.push(envelope);
        }

        scheduleRecurring(envelope: JobEnvelope, schedule: RecurringSchedule) {
            this.recurring.push([envelope, schedule]);
        }

        async shutdown() {}
    }

    it('declares start, enqueue, scheduleRecurring and shutdown as required functions', function () {
        const base = new TestBackend();
        assert.deepEqual(base.requiredFns, ['start', 'enqueue', 'scheduleRecurring', 'shutdown']);
    });

    it('freezes requiredFns so adapters cannot mutate the contract', function () {
        const base = new TestBackend();
        assert.ok(Object.isFrozen(base.requiredFns));
        assert.throws(() => {
            // @ts-expect-error deliberate contract-violation attempt
            base.requiredFns = ['start'];
        });
    });

    it('passes envelopes through the abstract surface unchanged', async function () {
        const base = new TestBackend();
        const processor = async () => {};
        const envelope = {type: 'test-job', payload: '{"a":1}'};

        await base.start({processor});
        await base.enqueue(envelope);
        await base.scheduleRecurring(envelope, {cron: '0 0 0 * * *'});
        await base.shutdown();

        assert.deepEqual(base.started, {processor});
        assert.deepEqual(base.enqueued, [envelope]);
        assert.deepEqual(base.recurring, [[envelope, {cron: '0 0 0 * * *'}]]);
    });
});
