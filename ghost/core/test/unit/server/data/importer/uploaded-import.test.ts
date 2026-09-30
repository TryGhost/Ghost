import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import LocalStorageBase from '../../../../../core/server/adapters/storage/LocalStorageBase';

const { ZipArchive } = require('archiver');
const createImportManager = require('../../../../../core/server/data/importer/create-import-manager');
const json = JSON.stringify({ meta: { version: '6.0.0' }, data: { posts: [] } });

describe('Uploaded site imports', function () {
  let directory: string;
  let assets: LocalStorageBase;

  beforeEach(async function () {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'uploaded-import-test-'));
    assets = new LocalStorageBase({
      storagePath: path.join(directory, 'assets'),
      staticFileURLPrefix: '/content/images',
    });
  });

  afterEach(async function () {
    sinon.restore();
    await fs.remove(directory);
  });

  function subject() {
    const deps = {
      importers: [],
      jobManager: { addJob: sinon.stub().resolves() },
      mailer: { send: sinon.stub().resolves() },
      config: { get: sinon.stub().returns('production') },
      logging: { info: sinon.stub(), error: sinon.stub() },
    };
    const manager = createImportManager(deps);
    // Keep any asset the handlers prepare inside the test directory
    manager.handlers = manager.handlers.map((handler: any) =>
      Object.assign(Object.create(Object.getPrototypeOf(handler)), handler, { storage: assets }),
    );
    return { manager, deps };
  }

  async function archive(entries: Record<string, string>, name = 'upload.zip') {
    const target = path.join(directory, name);
    const zip = new ZipArchive();
    const written = pipeline(zip, fs.createWriteStream(target));
    for (const [entry, value] of Object.entries(entries)) {
      zip.append(value, { name: entry });
    }
    await Promise.all([zip.finalize(), written]);
    return { name, path: target };
  }

  it('releases the extracted upload once the queued import has run', async function () {
    const { manager, deps } = subject();
    const file = await archive({ 'data.json': json });
    const extract = sinon.spy(manager, 'extractZip');
    const imported = sinon.stub(manager, 'doImport').resolves({});

    await manager.importFromFile(file, { user: { email: 'owner@example.com' } });

    const extracted = await extract.firstCall.returnValue;
    assert.equal(await fs.pathExists(extracted), true);
    sinon.assert.notCalled(deps.mailer.send);

    await deps.jobManager.addJob.firstCall.args[0].job();

    sinon.assert.calledOnce(imported);
    sinon.assert.calledOnce(deps.mailer.send);
    assert.equal(await fs.pathExists(extracted), false);
  });
});
