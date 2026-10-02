import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import sinon from 'sinon';
import { UpgradeAdapterError } from '@tryghost/adapter-base-upgrade';
import { UpgradeService } from '../../../../../core/server/services/upgrades/upgrade-service';
import NoopUpgradeAdapter from '../../../../../core/server/adapters/upgrade/NoopUpgradeAdapter';

const id = 'f76543a0-c052-45e8-b020-03c86a809b93';
const input = { targetVersion: '7.0.0', idempotencyKey: id };
const job = {
  id,
  targetVersion: '7.0.0',
  state: 'queued',
  createdAt: '2026-09-29T12:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z',
};
const diagnostic = {
  source: 'gscan',
  code: 'GS001',
  severity: 'error',
  message: 'The active theme uses a removed helper.',
  details: 'Replace the helper before updating to Ghost 7.',
  locations: [{ file: 'post.hbs', line: 12 }],
};
// Simulate data from an external CommonJS adapter at the runtime boundary.
function respondWith(stub: sinon.SinonStub, value: unknown) {
  stub.resolves(value);
}
function setup() {
  const adapter = new NoopUpgradeAdapter();
  const logError = sinon.spy();
  const service = new UpgradeService(() => adapter, logError);
  return { adapter, service, logError };
}

describe('Upgrade service', () => {
  afterEach(() => sinon.restore());
  it('uses the default without a host connection', async () => {
    const { adapter, service } = setup();
    assert.deepEqual(await service.getStatus(), { supported: false, reason: 'not-configured' });
    assert.deepEqual(await service.getJob(id), { id, state: 'unknown' });
    await assert.rejects(service.createRequest(input, 'owner'), { code: 'UPGRADE_UNSUPPORTED' });
    await assert.rejects(adapter.createRequest({ ...input, idempotencyKey: 'a'.repeat(64) }), {
      code: 'unsupported',
    });
  });
  it('scopes the key to staff identity and forwards only the validated request', async () => {
    const { adapter, service } = setup();
    const create = sinon.stub(adapter, 'createRequest');
    respondWith(create, { ...job, image: 'private', error: '/private/password' });
    assert.deepEqual(await service.createRequest(input, 'owner'), job);
    await service.createRequest(input, 'administrator');
    const ownerKey = createHash('sha256')
      .update(JSON.stringify(['owner', id]))
      .digest('hex');
    sinon.assert.calledWithExactly(create.firstCall, {
      targetVersion: '7.0.0',
      idempotencyKey: ownerKey,
    });
    assert.notEqual(
      create.firstCall.args[0].idempotencyKey,
      create.secondCall.args[0].idempotencyKey,
    );
  });
  it('delegates replay before policy/availability checks, even if the approved target disappeared', async () => {
    const { adapter, service } = setup();
    const status = sinon.stub(adapter, 'getStatus').rejects(new Error('Host is restarting'));
    const create = sinon.stub(adapter, 'createRequest');
    respondWith(create, { ...job, state: 'done' });
    assert.equal((await service.createRequest(input, 'owner')).state, 'done');
    sinon.assert.notCalled(status);
  });
  it('maps expected host rejections without exposing exception messages', async () => {
    const { adapter, service, logError } = setup();
    const create = sinon.stub(adapter, 'createRequest');
    for (const [code, apiCode, errorType] of [
      ['busy', 'UPGRADE_BUSY', 'ConflictError'],
      ['target-unapproved', 'UPGRADE_TARGET_UNAPPROVED', 'ValidationError'],
      ['idempotency-conflict', 'UPGRADE_IDEMPOTENCY_CONFLICT', 'ConflictError'],
      ['request-expired', 'UPGRADE_REQUEST_EXPIRED', 'ConflictError'],
      ['unavailable', 'UPGRADE_UNAVAILABLE', 'MaintenanceError'],
    ] as const) {
      const error = new UpgradeAdapterError({ code });
      error.message = '/private/password';
      create.rejects(error);
      await assert.rejects(service.createRequest(input, 'owner'), (err) => {
        assert.equal((err as { code: string }).code, apiCode);
        assert.equal((err as { errorType: string }).errorType, errorType);
        assert.ok(!(err as Error).message.includes('/private'));
        return true;
      });
    }
    sinon.assert.notCalled(logError);
  });
  it('returns structured gscan errors and warnings on jobs and rejected checks', async () => {
    const { adapter, service } = setup();
    const diagnostics = [
      diagnostic,
      {
        ...diagnostic,
        severity: 'warning',
        code: 'GS002',
        message: 'A helper is deprecated.',
        stack: 'private',
      },
    ];
    respondWith(sinon.stub(adapter, 'getJob'), {
      ...job,
      state: 'blocked',
      diagnostics,
      error: 'private',
    });
    const result = await service.getJob(id);
    assert.equal(result.state, 'blocked');
    assert.deepEqual('diagnostics' in result && result.diagnostics, [
      diagnostic,
      { ...diagnostic, severity: 'warning', code: 'GS002', message: 'A helper is deprecated.' },
    ]);
    // Deliberately simulate untyped adapter diagnostics.
    const error = new UpgradeAdapterError({ code: 'checks-failed' });
    Object.assign(error, { diagnostics });
    sinon.stub(adapter, 'createRequest').rejects(error);
    await assert.rejects(service.createRequest(input, 'owner'), (err) => {
      const typed = err as { code: string; errorDetails: { diagnostics: unknown[] } };
      assert.equal(typed.code, 'UPGRADE_CHECKS_FAILED');
      assert.equal(typed.errorDetails.diagnostics.length, 2);
      assert.ok(!JSON.stringify(typed.errorDetails).includes('private'));
      return true;
    });
  });
  it('logs malformed status and returns a retryable failure rather than unsupported', async () => {
    const { adapter, service, logError } = setup();
    respondWith(sinon.stub(adapter, 'getStatus'), { supported: true, availability: 'ready' });
    await assert.rejects(service.getStatus(), {
      code: 'UPGRADE_UNAVAILABLE',
      errorType: 'MaintenanceError',
    });
    sinon.assert.calledOnce(logError);
  });
  it('keeps transport details out of status and distinguishes busy from unsupported', async () => {
    const { adapter, service } = setup();
    respondWith(sinon.stub(adapter, 'getStatus'), {
      supported: true,
      availability: 'busy',
      backupRequired: true,
      activeJobId: id,
      pollAfterMs: 5000,
      image: 'secret',
      heartbeatAt: 'private',
    });
    assert.deepEqual(await service.getStatus(), {
      supported: true,
      availability: 'busy',
      backupRequired: true,
      activeJobId: id,
      pollAfterMs: 5000,
    });
  });
  it('logs malformed accepted jobs and strips unexpected exception data', async () => {
    const { adapter, service, logError } = setup();
    const create = sinon.stub(adapter, 'createRequest');
    for (const value of [
      { id, state: 'queued' },
      { ...job, targetVersion: '6.65.0' },
      { ...job, id: '../job' },
    ]) {
      respondWith(create, value);
      await assert.rejects(service.createRequest(input, 'owner'), { code: 'UPGRADE_UNAVAILABLE' });
    }
    create.rejects(new Error('/private/password'));
    await assert.rejects(service.createRequest(input, 'owner'), {
      message: 'The update service is temporarily unavailable.',
    });
    assert.equal(logError.callCount, 4);
  });
  it('preserves unknown and expired records and rejects mismatched IDs and unsafe diagnostics', async () => {
    const { adapter, service } = setup();
    const get = sinon.stub(adapter, 'getJob');
    for (const state of ['unknown', 'expired']) {
      respondWith(get, { id, state });
      assert.deepEqual(await service.getJob(id), { id, state });
    }
    for (const value of [
      { id: 'd76543a0-c052-45e8-b020-03c86a809b93', state: 'unknown' },
      { ...job, diagnostics: [{ ...diagnostic, locations: [{ file: '/private/theme.hbs' }] }] },
    ]) {
      respondWith(get, value);
      await assert.rejects(service.getJob(id), { code: 'UPGRADE_UNAVAILABLE' });
    }
  });
});
