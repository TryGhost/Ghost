import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import { afterEach, describe, it } from 'vitest';

const ImportManager = require('../../../../../core/server/data/importer/import-manager');

function subject(env = 'production') {
  const deps = {
    handlers: [],
    importers: [],
    jobsService: {},
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
    assert.deepEqual(
      await manager.executeImport({ data, cleanupDirectory: '/tmp/owned' }, options),
      { images: {}, data: {} },
    );
    assert.deepEqual(events, [
      'pre:images',
      'pre:data',
      'import:images',
      'import:data',
      'report',
      'cleanup',
      'email',
    ]);
    sinon.assert.calledOnceWithExactly(cleanup, '/tmp/owned');
    sinon.assert.calledWith(
      deps.mailer.send,
      sinon.match({ to: options.user.email, subject: 'Your content import has finished' }),
    );
  });

  it('logs and swallows import failures after sending an error email', async function () {
    const { manager, deps } = subject();
    const error = new Error('import failed');
    sinon.stub(manager, 'preProcess').rejects(error);
    assert.equal(await manager.executeImport({ data: {} }, options), undefined);
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
      await assert.rejects(manager.executeImport({ data: {} }, options), error);
      sinon.assert.calledOnce(cleanup);
    });
  }

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

  it('cleans only each overlapping import’s own directory before its email', async function () {
    const { manager, deps } = subject();
    const dirs = await Promise.all(
      [1, 2].map(() => fs.mkdtemp(path.join(os.tmpdir(), 'site-import-test-'))),
    );
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    sinon
      .stub(manager, 'doImport')
      .onFirstCall()
      .callsFake(async () => {
        await pending;
        return {};
      })
      .onSecondCall()
      .resolves({});
    try {
      const first = manager.executeImport({ data: {}, cleanupDirectory: dirs[0] }, options);
      await manager.executeImport({ data: {}, cleanupDirectory: dirs[1] }, options);
      assert.equal(await fs.pathExists(dirs[0]), true);
      assert.equal(await fs.pathExists(dirs[1]), false);
      assert.equal(deps.mailer.send.callCount, 1);
      release();
      await first;
      assert.equal(await fs.pathExists(dirs[0]), false);
      assert.equal(deps.mailer.send.callCount, 2);
    } finally {
      release();
      await Promise.all(dirs.map((dir) => fs.remove(dir)));
    }
  });

  it('logs cleanup failures without replacing the import outcome', async function () {
    const { manager, deps } = subject();
    sinon.stub(fs, 'remove').rejects(new Error('cleanup failed'));
    assert.deepEqual(
      await manager.executeImport({ data: {}, cleanupDirectory: '/tmp/owned' }, options),
      {},
    );
    sinon.assert.calledOnce(deps.logging.error);
    sinon.assert.calledOnce(deps.mailer.send);
  });
});
