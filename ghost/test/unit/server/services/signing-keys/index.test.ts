import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import type { Knex } from 'knex';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import type { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';

// Use the same CommonJS modules as boot. Restore the original root after each
// test so previously loaded consumers keep sharing it with later requires.
const ROOT_PATH = require.resolve('../../../../../core/server/services/signing-keys');
const { SigningKeyService } =
  require('../../../../../core/server/services/signing-keys/signing-key-service') as typeof import('../../../../../core/server/services/signing-keys/signing-key-service');
const { default: CheckSigningKeysJob } =
  require('../../../../../core/server/services/signing-keys/check-signing-keys-job') as typeof import('../../../../../core/server/services/signing-keys/check-signing-keys-job');
type Dependencies = ConstructorParameters<typeof SigningKeyService>[0];
const settingsCache =
  require('../../../../../core/shared/settings-cache') as Dependencies['settingsCache'];
const models = require('../../../../../core/server/models') as {
  Settings: Dependencies['Settings'];
  Base: { transaction: Dependencies['transaction'] };
};
const logging = require('@tryghost/logging');
const { IncorrectUsageError } = require('@tryghost/errors');

type SigningKeysModule = typeof import('../../../../../core/server/services/signing-keys');
type Entry = { value: string | null; created_at: Date };

describe('signing-keys root', function () {
  const sandbox = sinon.createSandbox();
  let originalModule: NodeJS.Module | undefined;
  let root: SigningKeysModule['default'];
  let scheduleCheckJob: SigningKeysModule['scheduleCheckJob'];
  let check: sinon.SinonStub;
  let entries: Record<string, Entry>;
  let scheduleRecurring: sinon.SinonStub;
  let jobs: JobsService;

  beforeEach(function () {
    originalModule = require.cache[ROOT_PATH];
    delete require.cache[ROOT_PATH];
    entries = {};
    sandbox.stub(settingsCache, 'get').callsFake((key: string) => entries[key]);
    sandbox.stub(logging, 'info');
    check = sandbox.stub(SigningKeyService.prototype, 'check').resolves();
    scheduleRecurring = sandbox.stub().resolves();
    jobs = { scheduleRecurring } as unknown as JobsService;
    ({ default: root, scheduleCheckJob } = require(ROOT_PATH));
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(function () {
    sandbox.restore();
    vi.unstubAllEnvs();
    if (originalModule) {
      require.cache[ROOT_PATH] = originalModule;
    } else {
      delete require.cache[ROOT_PATH];
    }
  });

  function markRotating() {
    entries.members_next_private_key = {
      value: 'pending-key',
      created_at: new Date(),
    };
  }

  it('does not check keys on import and rejects access before init', function () {
    sinon.assert.notCalled(check);
    assert.throws(() => root.service, IncorrectUsageError);
  });

  it('publishes the instance only after the initial key check and reuses it on repeated init', async function () {
    const ready = Promise.withResolvers<void>();
    check.returns(ready.promise);
    let finished = false;
    const startup = root.init().then(() => {
      finished = true;
    });

    try {
      await setImmediate();
      sinon.assert.calledOnce(check);
      assert.equal(finished, false, 'init completed before the initial key check');
      assert.throws(() => root.service, IncorrectUsageError);
    } finally {
      ready.resolve();
      // Do not let a cleanup error replace an assertion failure.
      await Promise.allSettled([startup]);
    }
    await startup;

    const service = root.service;
    assert.equal(service, check.firstCall.thisValue);
    await root.init();
    assert.equal(root.service, service);
    sinon.assert.calledOnce(check);
  });

  it('shares one pending key check between concurrent initialization calls', async function () {
    const ready = Promise.withResolvers<void>();
    check.returns(ready.promise);
    const first = root.init();
    const second = root.init();

    try {
      await setImmediate();
      sinon.assert.calledOnce(check);
      assert.equal(first, second);
      assert.throws(() => root.service, IncorrectUsageError);
    } finally {
      ready.resolve();
      await Promise.allSettled([first, second]);
    }
    await Promise.all([first, second]);
    assert.equal(root.service, check.firstCall.thisValue);
  });

  it('propagates the initial check error without publication and permits a later retry', async function () {
    const failure = new Error('Key check failed');
    check.onFirstCall().rejects(failure);

    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root.service, IncorrectUsageError);

    await root.init();
    sinon.assert.calledTwice(check);
    assert.equal(root.service, check.secondCall.thisValue);
  });

  it('does not schedule a recurring check when no rotation is pending', async function () {
    await root.init();
    await scheduleCheckJob(jobs);

    sinon.assert.notCalled(scheduleRecurring);
  });

  it('waits for registration of the hourly check and does not register again after success', async function () {
    markRotating();
    await root.init();
    sandbox.stub(Math, 'random').onFirstCall().returns(0.25).onSecondCall().returns(0.75);
    const registered = Promise.withResolvers<void>();
    scheduleRecurring.returns(registered.promise);
    let finished = false;
    const scheduling = scheduleCheckJob(jobs).then(() => {
      finished = true;
    });

    try {
      await setImmediate();
      assert.equal(finished, false, 'scheduling completed before the backend registered the job');
      sinon.assert.calledOnce(scheduleRecurring);
      const [job, schedule] = scheduleRecurring.firstCall.args;
      assert.ok(job instanceof CheckSigningKeysJob);
      assert.deepEqual(schedule, { cron: '15 45 * * * *' });
    } finally {
      registered.resolve();
      await Promise.allSettled([scheduling]);
    }
    await scheduling;

    await scheduleCheckJob(jobs);
    sinon.assert.calledOnce(scheduleRecurring);
  });

  it('propagates a registration failure and allows scheduling to be retried', async function () {
    markRotating();
    await root.init();
    const failure = new Error('Jobs backend unavailable');
    scheduleRecurring.onFirstCall().rejects(failure);

    await assert.rejects(scheduleCheckJob(jobs), (error) => error === failure);
    await scheduleCheckJob(jobs);
    await scheduleCheckJob(jobs);

    sinon.assert.calledTwice(scheduleRecurring);
  });

  for (const environment of ['test', 'testing', 'testing-mysql']) {
    it(`does not register recurring checks in ${environment}`, async function () {
      vi.stubEnv('NODE_ENV', environment);
      markRotating();
      await root.init();
      await scheduleCheckJob(jobs);

      sinon.assert.notCalled(scheduleRecurring);
    });
  }

  // Keep the real rotate() and its callback into the root. These doubles stand
  // in for the database; transaction semantics have separate integration tests.
  function stubRotationStorage() {
    const transacting = {} as Knex.Transaction;
    sandbox.stub(models.Base, 'transaction').callsFake((fn) => fn(transacting));
    sandbox
      .stub(models.Settings, 'findOne')
      .callsFake(async ({ key }: { key: string }) =>
        entries[key] ? { toJSON: () => entries[key] } : null,
      );
    return sandbox
      .stub(models.Settings, 'edit')
      .callsFake(async (changes: { key: string; value: string | null }[]) => {
        for (const { key, value } of changes) {
          entries[key] = { value, created_at: new Date() };
        }
      });
  }

  it('defers scheduling a rotation started before jobs arrive until background registration', async function () {
    stubRotationStorage();
    await root.init();
    const service = root.service;

    assert.equal(await service.rotate('members'), true);
    sinon.assert.notCalled(scheduleRecurring);

    await scheduleCheckJob(jobs);
    sinon.assert.calledOnce(scheduleRecurring);
    assert.ok(scheduleRecurring.firstCall.args[0] instanceof CheckSigningKeysJob);
  });

  it('schedules through the supplied jobs service when a later rotation starts and awaits registration', async function () {
    stubRotationStorage();
    await root.init();
    await scheduleCheckJob(jobs);
    sinon.assert.notCalled(scheduleRecurring);
    const registered = Promise.withResolvers<void>();
    const entered = Promise.withResolvers<void>();
    scheduleRecurring.callsFake(() => {
      entered.resolve();
      return registered.promise;
    });
    let finished = false;
    const rotation = root.service.rotate('members').then((result) => {
      finished = true;
      return result;
    });
    // Race completion too, so a missing callback fails immediately rather than
    // leaving the test waiting for a scheduling call that will never happen.
    const observed = Promise.race([entered.promise, rotation]);

    try {
      await observed;
      await setImmediate();
      sinon.assert.calledOnce(scheduleRecurring);
      assert.ok(scheduleRecurring.firstCall.args[0] instanceof CheckSigningKeysJob);
      assert.equal(finished, false, 'rotation completed before job registration');
    } finally {
      registered.resolve();
      await Promise.allSettled([rotation]);
    }
    assert.equal(await rotation, true);
  });
});
