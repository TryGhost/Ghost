import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { getOutboxConfig } from '../../../../../core/server/services/jobs-service/outbox-config';

function configWith(value: unknown) {
  return {
    get(key: string): unknown {
      return key === 'services:jobs:outbox' ? value : undefined;
    },
  };
}

describe('getOutboxConfig', function () {
  it('defaults to disabled with the documented timings when the slice is absent', function () {
    assert.deepEqual(getOutboxConfig(configWith(undefined)), {
      enabled: false,
      keepUntilSettled: false,
      pollIntervalMs: 30000,
      submissionTimeoutMs: 10000,
      retryDelayMs: 30000,
      leaseMs: 120000,
    });
  });

  it('reads the flag that keeps rows until their job settles', function () {
    assert.equal(getOutboxConfig(configWith({ keepUntilSettled: true })).keepUntilSettled, true);
  });

  it('reads an enabled flag and overridden timings', function () {
    assert.deepEqual(
      getOutboxConfig(
        configWith({
          enabled: true,
          pollIntervalMs: 250,
          submissionTimeoutMs: 5000,
          retryDelayMs: 15000,
        }),
      ),
      {
        enabled: true,
        keepUntilSettled: false,
        pollIntervalMs: 250,
        submissionTimeoutMs: 5000,
        retryDelayMs: 15000,
        leaseMs: 120000,
      },
    );
  });

  it('keeps the defaults for any timing the config omits', function () {
    assert.deepEqual(getOutboxConfig(configWith({ enabled: true })), {
      enabled: true,
      keepUntilSettled: false,
      pollIntervalMs: 30000,
      submissionTimeoutMs: 10000,
      retryDelayMs: 30000,
      leaseMs: 120000,
    });
  });

  it('reads an overridden lease length', function () {
    assert.equal(getOutboxConfig(configWith({ leaseMs: 30000 })).leaseMs, 30000);
  });

  it('rejects a lease too short for the one-second precision of submitted_at', function () {
    assert.throws(() => getOutboxConfig(configWith({ leaseMs: 1999 })));
    assert.equal(getOutboxConfig(configWith({ leaseMs: 2000 })).leaseMs, 2000);
  });

  it('rejects a non-positive or non-integer timing', function () {
    assert.throws(() => getOutboxConfig(configWith({ pollIntervalMs: 0 })));
    assert.throws(() => getOutboxConfig(configWith({ submissionTimeoutMs: -1 })));
    assert.throws(() => getOutboxConfig(configWith({ retryDelayMs: 1.5 })));
  });
});
