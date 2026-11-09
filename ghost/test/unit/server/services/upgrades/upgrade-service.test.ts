import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import sinon from 'sinon';
import { UpgradeAdapterError, type UpgradeBase } from '@tryghost/adapter-base-upgrade';
import { UpgradeService } from '../../../../../core/server/services/upgrades/upgrade-service';

const jobId = '4f1b0c5e-8d3a-4b6e-9c2d-1a2b3c4d5e6f';
const intentKey = 'f76543a0-c052-45e8-b020-03c86a809b93';
const timestamp = '2026-10-14T10:00:00.000Z';
const job = {
  id: jobId,
  state: 'pending' as const,
  component: 'ghost',
  toVersion: '6.71.0',
  createdAt: timestamp,
  updatedAt: timestamp,
};
const input = { component: 'ghost', toVersion: '6.71.0', idempotencyKey: intentKey };

function setup(adapter: Partial<Record<keyof UpgradeBase, sinon.SinonStub>>) {
  const logError = sinon.stub();
  const service = new UpgradeService({
    getAdapter: () => adapter as unknown as UpgradeBase,
    logError,
  });
  return { service, logError };
}

describe('UpgradeService', function () {
  describe('getStatus', function () {
    it('returns validated status, stripping fields the contract does not define', async function () {
      const { service } = setup({
        getStatus: sinon.stub().resolves({
          supported: true,
          availability: 'ready',
          backupRequired: true,
          oneClick: [{ component: 'ghost', fromVersion: '6.70.0', toVersion: '6.71.0' }],
          image: 'ghost@sha256:abc',
        }),
      });

      assert.deepEqual(await service.getStatus(), {
        supported: true,
        availability: 'ready',
        backupRequired: true,
        oneClick: [{ component: 'ghost', fromVersion: '6.70.0', toVersion: '6.71.0' }],
        manual: [],
      });
    });

    const unavailable = { supported: true, availability: 'unavailable', oneClick: [], manual: [] };

    it('logs invalid adapter output and reports the host unavailable', async function () {
      const { service, logError } = setup({
        getStatus: sinon.stub().resolves({ supported: 'yes' }),
      });

      assert.deepEqual(await service.getStatus(), unavailable);
      sinon.assert.calledOnce(logError);
    });

    it('logs unexpected adapter errors without exposing them', async function () {
      const { service, logError } = setup({
        getStatus: sinon.stub().rejects(new Error('EACCES /srv/secret/status.json')),
      });

      assert.deepEqual(await service.getStatus(), unavailable);
      assert.match(logError.firstCall.args[0].stack, /secret/);
    });

    it('reports an expected unavailable rejection without logging it', async function () {
      const { service, logError } = setup({
        getStatus: sinon.stub().rejects(new UpgradeAdapterError({ code: 'unavailable' })),
      });

      assert.deepEqual(await service.getStatus(), unavailable);
      sinon.assert.notCalled(logError);
    });
  });

  describe('createRequest', function () {
    it('scopes the idempotency key to the staff user', async function () {
      const createRequest = sinon.stub().resolves(job);
      const { service } = setup({ createRequest });

      assert.deepEqual(await service.createRequest(input, 'user-1'), job);
      await service.createRequest(input, 'user-2');

      const [first, second] = createRequest.getCalls().map((call) => call.args[0]);
      assert.deepEqual(first, {
        component: 'ghost',
        toVersion: '6.71.0',
        idempotencyKey: createHash('sha256')
          .update(JSON.stringify(['user-1', intentKey]))
          .digest('hex'),
      });
      assert.notEqual(first.idempotencyKey, second.idempotencyKey);
    });

    it('rejects an accepted job for a different update', async function () {
      const { service, logError } = setup({
        createRequest: sinon.stub().resolves({ ...job, toVersion: '6.72.0' }),
      });

      await assert.rejects(service.createRequest(input, 'user-1'), {
        code: 'UPGRADE_UNAVAILABLE',
      });
      sinon.assert.calledOnce(logError);
    });

    const rejections = [
      ['unsupported', 'DisabledFeatureError', 'UPGRADE_UNSUPPORTED'],
      ['unavailable', 'InternalServerError', 'UPGRADE_UNAVAILABLE'],
      ['busy', 'ConflictError', 'UPGRADE_BUSY'],
      ['target-unapproved', 'ValidationError', 'UPGRADE_TARGET_UNAPPROVED'],
      ['idempotency-conflict', 'ConflictError', 'UPGRADE_IDEMPOTENCY_CONFLICT'],
      ['request-expired', 'ConflictError', 'UPGRADE_REQUEST_EXPIRED'],
    ] as const;

    for (const [adapterCode, errorType, code] of rejections) {
      it(`maps the adapter's ${adapterCode} rejection without logging it`, async function () {
        const { service, logError } = setup({
          createRequest: sinon.stub().rejects(new UpgradeAdapterError({ code: adapterCode })),
        });

        await assert.rejects(service.createRequest(input, 'user-1'), { errorType, code });
        sinon.assert.notCalled(logError);
      });
    }

    it('passes validated diagnostics through as error details', async function () {
      const diagnostics = [
        {
          source: 'host',
          code: 'policy',
          severity: 'error' as const,
          message: 'Major updates need the CLI.',
        },
      ];
      const { service } = setup({
        createRequest: sinon
          .stub()
          .rejects(new UpgradeAdapterError({ code: 'target-unapproved', diagnostics })),
      });

      await assert.rejects(service.createRequest(input, 'user-1'), {
        errorDetails: { diagnostics },
      });
    });

    it('treats a rejection with invalid diagnostics as an adapter failure', async function () {
      const { service, logError } = setup({
        createRequest: sinon.stub().rejects(
          new UpgradeAdapterError({
            code: 'busy',
            diagnostics: [{ source: 'host' } as never],
          }),
        ),
      });

      await assert.rejects(service.createRequest(input, 'user-1'), {
        code: 'UPGRADE_UNAVAILABLE',
      });
      sinon.assert.calledOnce(logError);
    });
  });

  describe('getJob', function () {
    it('returns jobs and explicit unknown or expired lookups', async function () {
      const getJob = sinon.stub();
      getJob.onFirstCall().resolves({ ...job, state: 'needs-operator' });
      getJob.onSecondCall().resolves({ id: jobId, state: 'expired' });
      const { service } = setup({ getJob });

      assert.equal((await service.getJob(jobId)).state, 'needs-operator');
      assert.deepEqual(await service.getJob(jobId), { id: jobId, state: 'expired' });
    });

    it('rejects a lookup that returns a different job', async function () {
      const { service } = setup({
        getJob: sinon
          .stub()
          .resolves({ id: 'd76543a0-c052-45e8-b020-03c86a809b93', state: 'unknown' }),
      });

      await assert.rejects(service.getJob(jobId), { code: 'UPGRADE_UNAVAILABLE' });
    });
  });
});
