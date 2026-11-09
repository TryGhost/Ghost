import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  UpgradeAdapterError,
  UpgradeBase,
  createUpgradeRequestSchema,
  upgradeJobResultSchema,
  upgradeJobSchema,
  upgradeStatusSchema,
} from '../src/index.ts';

const jobId = '4f1b0c5e-8d3a-4b6e-9c2d-1a2b3c4d5e6f';
const timestamp = '2026-10-14T10:00:00.000Z';

const job = {
  id: jobId,
  state: 'pending',
  component: 'ghost',
  toVersion: '6.71.0',
  createdAt: timestamp,
  updatedAt: timestamp,
};

class TestUpgrade extends UpgradeBase {
  async getStatus() {
    return { supported: false as const, reason: 'not-configured' as const };
  }

  async createRequest() {
    return upgradeJobSchema.parse(job);
  }

  async getJob(id: string) {
    return { id, state: 'unknown' as const };
  }
}

describe('UpgradeBase', function () {
  it('declares its required methods as a frozen, read-only list', function () {
    const adapter = new TestUpgrade();

    assert.deepEqual(adapter.requiredFns, ['getStatus', 'createRequest', 'getJob']);
    assert.ok(Object.isFrozen(adapter.requiredFns));
    assert.throws(() => {
      (adapter as { requiredFns: unknown }).requiredFns = [];
    }, TypeError);
  });
});

describe('UpgradeAdapterError', function () {
  it('carries only its code and diagnostics', function () {
    const diagnostics = [
      { source: 'host', code: 'busy', severity: 'info' as const, message: 'Another job runs.' },
    ];
    const error = new UpgradeAdapterError({ code: 'busy', diagnostics });

    assert.equal(error.name, 'UpgradeAdapterError');
    assert.equal(error.message, 'busy');
    assert.equal(error.code, 'busy');
    assert.deepEqual(error.diagnostics, diagnostics);
  });
});

describe('upgradeStatusSchema', function () {
  it('accepts an unsupported host', function () {
    const status = { supported: false, reason: 'not-configured' };

    assert.deepEqual(upgradeStatusSchema.parse(status), status);
  });

  it('accepts one-click and manual updates per component', function () {
    const status = upgradeStatusSchema.parse({
      supported: true,
      availability: 'ready',
      backupRequired: true,
      currentVersion: '6.70.0',
      oneClick: [{ component: 'ghost', fromVersion: '6.70.0', toVersion: '6.71.0' }],
      manual: [
        {
          component: 'stack',
          fromVersion: '1.2.0',
          toVersion: '1.3.0',
          reason: 'Stack updates replace the supervisor image.',
          steps: ['./ghost-docker self-update'],
        },
      ],
      activeJobId: null,
      pollAfterMs: 5000,
    });

    assert.equal(status.supported, true);
    assert.equal(status.oneClick.length, 1);
    assert.equal(status.manual[0]?.component, 'stack');
  });

  it('defaults both lists when a host is not ready', function () {
    const status = upgradeStatusSchema.parse({ supported: true, availability: 'stale' });

    assert.ok(status.supported);
    assert.deepEqual(status.oneClick, []);
    assert.deepEqual(status.manual, []);
  });

  it('requires a ready host to report its backup policy', function () {
    const result = upgradeStatusSchema.safeParse({ supported: true, availability: 'ready' });

    assert.equal(result.success, false);
  });

  it('strips unknown fields', function () {
    const status = upgradeStatusSchema.parse({
      supported: false,
      reason: 'not-supported',
      image: 'ghost:6',
    });

    assert.equal(Object.hasOwn(status, 'image'), false);
  });

  it('rejects unknown availability, unsafe help links and component names', function () {
    const base = { supported: true, availability: 'ready', backupRequired: false };

    assert.equal(upgradeStatusSchema.safeParse({ ...base, availability: 'queued' }).success, false);
    assert.equal(
      upgradeStatusSchema.safeParse({
        ...base,
        diagnostics: [
          { source: 'host', code: 'x', severity: 'info', message: 'm', help: 'http://x.test' },
        ],
      }).success,
      false,
    );
    assert.equal(
      upgradeStatusSchema.safeParse({
        ...base,
        oneClick: [{ component: 'Ghost', fromVersion: '1', toVersion: '2' }],
      }).success,
      false,
    );
  });
});

describe('createUpgradeRequestSchema', function () {
  const request = { component: 'ghost', toVersion: '6.71.0', idempotencyKey: 'a'.repeat(64) };

  it('accepts a scoped sha256 key', function () {
    assert.deepEqual(createUpgradeRequestSchema.parse(request), request);
  });

  it('rejects unknown fields and unscoped keys', function () {
    assert.equal(createUpgradeRequestSchema.safeParse({ ...request, image: 'x' }).success, false);
    assert.equal(
      createUpgradeRequestSchema.safeParse({ ...request, idempotencyKey: jobId }).success,
      false,
    );
  });
});

describe('upgradeJobResultSchema', function () {
  it('accepts jobs, including prerelease targets', function () {
    const result = upgradeJobResultSchema.parse({ ...job, toVersion: '7.0.0-alpha.1' });

    assert.equal(result.state, 'pending');
  });

  it('accepts unknown and expired lookups', function () {
    assert.deepEqual(upgradeJobResultSchema.parse({ id: jobId, state: 'expired' }), {
      id: jobId,
      state: 'expired',
    });
  });

  it('accepts opaque job IDs such as the idempotency key', function () {
    const id = 'a'.repeat(64);

    assert.deepEqual(upgradeJobResultSchema.parse({ id, state: 'unknown' }), {
      id,
      state: 'unknown',
    });
    assert.equal(upgradeJobResultSchema.safeParse({ id: '../x', state: 'expired' }).success, false);
  });

  it('reports any ID, even a malformed one, as unknown', function () {
    assert.deepEqual(upgradeJobResultSchema.parse({ id: '../x', state: 'unknown' }), {
      id: '../x',
      state: 'unknown',
    });
  });

  it('rejects states outside the protocol and uppercase IDs', function () {
    assert.equal(upgradeJobResultSchema.safeParse({ ...job, state: 'queued' }).success, false);
    assert.equal(
      upgradeJobResultSchema.safeParse({ ...job, id: jobId.toUpperCase() }).success,
      false,
    );
  });
});
