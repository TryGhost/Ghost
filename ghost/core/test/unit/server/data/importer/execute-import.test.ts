import assert from 'node:assert/strict';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, describe, it } from 'vitest';

const ImportManager = require('../../../../../core/server/data/importer/import-manager');

function subject(env = 'production') {
  const deps = {
    handlers: [],
    importers: [],
    jobManager: { addJob: sinon.stub().resolves() },
    mailer: { send: sinon.stub().resolves() },
    config: { get: sinon.stub().returns(env) },
    urlUtils: {
      urlFor: sinon
        .stub()
        .callsFake((type: string) =>
          type === 'admin' ? 'https://example.com/ghost/' : 'https://example.com/',
        ),
    },
    logging: { info: sinon.stub(), error: sinon.stub() },
  };
  return { manager: new ImportManager(deps), deps };
}
const options = {
  user: { email: 'owner@example.com' },
  importTag: '#import',
  returnImportedData: true,
  importPersistUser: true,
};

describe('Site import execution', function () {
  afterEach(() => sinon.restore());

  it('preprocesses and imports in order, reports, cleans up, then awaits email', async function () {
    const { manager, deps } = subject();
    const data = { images: [], data: { posts: [] } };
    const events: string[] = [];
    manager.importers = ['images', 'data'].map((type) => ({
      type,
      preProcess: sinon.spy((input: unknown) => {
        events.push(`pre:${type}`);
        return input;
      }),
      doImport: sinon.spy(async (_input: unknown, passedOptions: unknown) => {
        assert.equal(passedOptions, options);
        events.push(`import:${type}`);
        return {};
      }),
    }));
    sinon.stub(manager, 'generateReport').callsFake(async (result: unknown) => {
      events.push('report');
      return result;
    });
    const cleanup = sinon.stub(manager, 'cleanUp').callsFake(async () => {
      events.push('cleanup');
    });
    deps.mailer.send.callsFake(async () => {
      events.push('email');
    });
    assert.deepEqual(await manager.processImport(data, options), { images: {}, data: {} });
    assert.deepEqual(events, [
      'pre:images',
      'pre:data',
      'import:images',
      'import:data',
      'report',
      'cleanup',
      'email',
    ]);
    sinon.assert.calledOnce(cleanup);
    sinon.assert.calledWith(
      deps.mailer.send,
      sinon.match({ to: options.user.email, subject: 'Your content import has finished' }),
    );
  });

  it('logs and swallows import failures after sending an error email', async function () {
    const { manager, deps } = subject();
    const error = new Error('import failed');
    sinon.stub(manager, 'preProcess').rejects(error);
    assert.equal(await manager.processImport({}, options), undefined);
    sinon.assert.calledWith(
      deps.logging.error,
      error,
      '[Background Job] site-content-import error',
    );
    sinon.assert.calledWith(
      deps.mailer.send,
      sinon.match({ subject: 'Your content import was unsuccessful' }),
    );
  });

  for (const stage of ['send', 'generateCompletionEmail']) {
    it(`rejects ${stage} failures after cleanup`, async function () {
      const { manager, deps } = subject();
      const error = new Error('email failed');
      const cleanup = sinon.stub(manager, 'cleanUp').resolves();
      if (stage === 'send') {
        deps.mailer.send.rejects(error);
      } else {
        sinon.stub(manager, stage).throws(error);
      }
      await assert.rejects(manager.processImport({}, options), error);
      sinon.assert.calledOnce(cleanup);
    });
  }

  it('logs cleanup failures without replacing the import outcome', async function () {
    const { manager, deps } = subject();
    manager.fileToDelete = '/tmp/owned';
    sinon.stub(fs, 'remove').rejects(new Error('cleanup failed'));
    assert.deepEqual(await manager.processImport({}, options), {});
    sinon.assert.calledOnce(deps.logging.error);
    sinon.assert.calledOnce(deps.mailer.send);
  });

  it('logs when a queued import starts and how it ends', async function () {
    const started = '[Background Job] site-content-import started';
    const completed = /^\[Background Job\] site-content-import completed in \d+ms$/;
    const failed = /^\[Background Job\] site-content-import failed after \d+ms$/;

    const succeeds = subject();
    sinon.stub(succeeds.manager, 'processImport').resolves({});
    assert.deepEqual(await succeeds.manager.executeImport({}, options), {});
    sinon.assert.calledWith(succeeds.deps.logging.info.firstCall, started);
    sinon.assert.calledWith(succeeds.deps.logging.info.secondCall, sinon.match(completed));

    // A failed import is swallowed by processImport, which resolves undefined
    const fails = subject();
    sinon.stub(fails.manager, 'processImport').resolves(undefined);
    assert.equal(await fails.manager.executeImport({}, options), undefined);
    sinon.assert.calledWith(fails.deps.logging.info.firstCall, started);
    sinon.assert.calledWith(fails.deps.logging.info.secondCall, sinon.match(failed));

    const throws = subject();
    const error = new Error('email failed');
    sinon.stub(throws.manager, 'processImport').rejects(error);
    await assert.rejects(throws.manager.executeImport({}, options), error);
    sinon.assert.calledWith(throws.deps.logging.error, error, sinon.match(failed));
  });

  it('queues the loaded import outside testing and runs it when the job executes', async function () {
    const { manager, deps } = subject();
    const data = { data: { posts: [] } };
    sinon.stub(manager, 'loadFile').resolves(data);
    const execute = sinon.stub(manager, 'executeImport').resolves({});

    await manager.importFromFile({ name: 'export.json' }, options);

    sinon.assert.calledWith(deps.logging.info, '[Background Job] site-content-import queued');
    sinon.assert.calledOnceWithMatch(deps.jobManager.addJob, { offloaded: false });
    sinon.assert.notCalled(execute);
    await deps.jobManager.addJob.firstCall.args[0].job();
    sinon.assert.calledOnceWithExactly(execute, data, options);
  });

  it('keeps testing calls inline without email and explicit direct calls inline with email', async function () {
    for (const env of ['testing', 'testing-mysql', 'production']) {
      const { manager, deps } = subject(env);
      const direct = env === 'production' ? { runningInJob: true } : {};
      await manager.importFromFile(null, { ...options, ...direct, data: {} });
      sinon.assert.notCalled(deps.jobManager.addJob);
      assert.equal(deps.mailer.send.callCount, env === 'production' ? 1 : 0);
    }
  });

  it('preserves parse errors as request failures', async function () {
    const { manager, deps } = subject();
    const error = new Error('invalid upload');
    sinon.stub(manager, 'loadFile').rejects(error);
    await assert.rejects(manager.importFromFile({ name: 'bad.json' }, options), error);
    sinon.assert.notCalled(deps.jobManager.addJob);
    sinon.assert.notCalled(deps.mailer.send);
  });
});
