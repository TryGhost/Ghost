import assert from 'node:assert/strict';
import {describe, it} from 'vitest';

import {JobsBackendBase, JobEnvelope, RecurringSchedule, JobsStartOptions} from '../src/base.ts';

class TestBackend extends JobsBackendBase {
    start(_options: JobsStartOptions) {}
    enqueue(_envelope: JobEnvelope) {}
    scheduleRecurring(_envelope: JobEnvelope, _schedule: RecurringSchedule) {}
    shutdown() {}
}

describe('adapter-base-jobs', function () {
    it('exposes the frozen requiredFns contract', function () {
        const backend = new TestBackend();
        assert.deepEqual(backend.requiredFns, ['start', 'enqueue', 'scheduleRecurring', 'shutdown']);
        assert.ok(Object.isFrozen(backend.requiredFns), 'requiredFns should be frozen');
    });
});
