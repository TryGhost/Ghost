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
      pollIntervalMs: 1000,
      submissionTimeoutMs: 10000,
      retryDelayMs: 30000,
    });
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
        pollIntervalMs: 250,
        submissionTimeoutMs: 5000,
        retryDelayMs: 15000,
      },
    );
  });

  it('keeps the defaults for any timing the config omits', function () {
    assert.deepEqual(getOutboxConfig(configWith({ enabled: true })), {
      enabled: true,
      pollIntervalMs: 1000,
      submissionTimeoutMs: 10000,
      retryDelayMs: 30000,
    });
  });

  it('rejects a non-positive or non-integer timing', function () {
    assert.throws(() => getOutboxConfig(configWith({ pollIntervalMs: 0 })));
    assert.throws(() => getOutboxConfig(configWith({ submissionTimeoutMs: -1 })));
    assert.throws(() => getOutboxConfig(configWith({ retryDelayMs: 1.5 })));
  });
});
