import assert from 'node:assert/strict';
import defaults from '../../../../../core/shared/config/defaults.json';
import { jobsOutbox } from '../../../../../core/shared/config/schema/services';

const outboxDefaults = defaults.services.jobs.outbox;

describe('jobsOutbox', function () {
  it('accepts the shipped defaults', function () {
    assert.deepEqual(jobsOutbox.parse(outboxDefaults), outboxDefaults);
  });

  it('rejects a lease too short for the one-second precision of submitted_at', function () {
    assert.throws(() => jobsOutbox.parse({ ...outboxDefaults, leaseMs: 1999 }));
    assert.equal(jobsOutbox.parse({ ...outboxDefaults, leaseMs: 2000 }).leaseMs, 2000);
  });

  it('rejects a non-positive or non-integer timing', function () {
    assert.throws(() => jobsOutbox.parse({ ...outboxDefaults, pollIntervalMs: 0 }));
    assert.throws(() => jobsOutbox.parse({ ...outboxDefaults, submissionTimeoutMs: -1 }));
    assert.throws(() => jobsOutbox.parse({ ...outboxDefaults, retryDelayMs: 1.5 }));
  });
});
