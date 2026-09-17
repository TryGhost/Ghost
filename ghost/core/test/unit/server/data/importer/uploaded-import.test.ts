import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import LocalStorageBase from '../../../../../core/server/adapters/storage/LocalStorageBase';
import { dependencies } from './create-import-manager';

const { ZipArchive } = require('archiver');
const ImportManager = require('../../../../../core/server/data/importer/import-manager');
const json = JSON.stringify({ meta: { version: '6.0.0' }, data: { posts: [] } });

describe('Uploaded site imports', function () {
  let directory: string;
  let storage: LocalStorageBase;
  let assets: LocalStorageBase;
  beforeEach(async function () {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'uploaded-import-test-'));
    storage = new LocalStorageBase({
      storagePath: path.join(directory, 'imports'),
      staticFileURLPrefix: '/content/imports',
    });
    assets = new LocalStorageBase({
      storagePath: path.join(directory, 'assets'),
      staticFileURLPrefix: '/content/images',
    });
    await fs.ensureDir(storage.storagePath);
  });
  afterEach(async function () {
    sinon.restore();
    await fs.remove(directory);
  });
  function subject() {
    const deps = {
      ...dependencies(),
      importsStorage: storage,
      jobManager: { addJob: sinon.stub().resolves() },
      jobsService: { dispatch: sinon.stub().resolves() },
      importers: [],
      mailer: { send: sinon.stub().resolves() },
      config: { get: sinon.stub().returns('production') },
      logging: { info: sinon.stub(), error: sinon.stub() },
    };
    deps.handlers = deps.handlers.map((handler: object) =>
      Object.assign(Object.create(Object.getPrototypeOf(handler)), handler, { storage: assets }),
    );
    return { manager: new ImportManager(deps), deps };
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
  it('validates layout and JSON without preparing asset destinations or retaining extracted files', async function () {
    const { manager, deps } = subject();
    const file = await archive({ 'data.json': json, 'content/media/clip.mp4': 'video' });
    const unique = sinon.spy(assets, 'getUniqueFileName');
    const extract = sinon.spy(manager, 'extractZip');
    assert.equal(await manager.validateFile(file), undefined);
    sinon.assert.notCalled(unique);
    sinon.assert.notCalled(deps.jobManager.addJob);
    sinon.assert.notCalled(deps.mailer.send);
    const extracted = await extract.firstCall.returnValue;
    assert.equal(await fs.pathExists(extracted), false);
  });
  for (const [name, entries, message] of [
    ['malformed JSON', { 'data.json': '{' }, 'JSON'],
    ['mixed data formats', { 'data.json': json, 'post.md': 'text' }, 'multiple data formats'],
    ['invalid layout', { 'a/b/data.json': json }, 'Invalid zip file structure'],
    ['no content', { 'unknown.xyz': 'text' }, 'Zip did not include any content'],
  ] as const) {
    it(`keeps mainline rejection for ${name} and releases validation files`, async function () {
      const { manager, deps } = subject();
      const file = await archive(entries);
      const extract = sinon.spy(manager, 'extractZip');
      await assert.rejects(manager.validateFile(file), (error: any) => {
        assert.equal(error.statusCode, name === 'malformed JSON' ? 400 : 415);
        assert.ok((error.message + error.help).includes(message));
        return true;
      });
      assert.equal(await fs.pathExists(await extract.firstCall.returnValue), false);
      sinon.assert.notCalled(deps.jobManager.addJob);
      sinon.assert.notCalled(deps.mailer.send);
    });
  }
  for (const name of ['empty.zip', 'malformed-comments.zip']) {
    it(`preserves the HTTP error for ${name}`, async function () {
      const { manager } = subject();
      const source = path.resolve(__dirname, '../../../../utils/fixtures/import/zips', name);
      await assert.rejects(manager.validateFile({ name, path: source }), {
        statusCode: 415,
        code: 'INVALID_ZIP_FILE',
        message: 'The uploaded zip could not be read',
      });
    });
  }
});
