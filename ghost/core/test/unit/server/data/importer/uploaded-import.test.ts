import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import LocalStorageBase from '../../../../../core/server/adapters/storage/LocalStorageBase';

const { ZipArchive } = require('archiver');
const ImportManager = require('../../../../../core/server/data/importer/import-manager');
const {
  createContentFileHandlers,
} = require('../../../../../core/server/data/importer/content-files');
const RevueHandler = require('../../../../../core/server/data/importer/handlers/revue');
const JSONHandler = require('../../../../../core/server/data/importer/handlers/json');
const MarkdownHandler = require('../../../../../core/server/data/importer/handlers/markdown');

const json = JSON.stringify({ meta: { version: '6.0.0' }, data: { posts: [] } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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
      importsStorage: storage,
      jobManager: { addJob: sinon.stub().resolves() },
      // The production handlers, with any asset they prepare kept inside the test directory
      handlers: [...createContentFileHandlers(), RevueHandler, JSONHandler, MarkdownHandler].map(
        (handler: any) =>
          Object.assign(Object.create(Object.getPrototypeOf(handler)), handler, {
            storage: new LocalStorageBase({
              storagePath: assets.storagePath,
              staticFileURLPrefix: handler.storage?.staticFileURLPrefix || '/content/images',
            }),
          }),
      ),
      importers: [],
      mailer: { send: sinon.stub().resolves() },
      config: { get: sinon.stub().returns('production') },
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

  // The job manager is handed a closure over the stored upload. Run it against a stubbed
  // executeImport to learn what it would execute, without executing it.
  async function queuedImport({ manager, deps }: any): Promise<[string, string, any]> {
    const execute = sinon.stub(manager, 'executeImport');
    await deps.jobManager.addJob.firstCall.args[0].job();
    execute.restore();
    return execute.firstCall.args as [string, string, any];
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
    const unique = sinon.spy(
      manager.handlers.find((handler: any) => handler.type === 'media').storage,
      'getUniqueFileName',
    );
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
      await assert.rejects(
        manager.importFromFile(file, { user: { email: 'owner@example.com' } }),
        (error: any) => {
          assert.equal(error.statusCode, name === 'malformed JSON' ? 400 : 415);
          assert.ok((error.message + error.help).includes(message));
          return true;
        },
      );
      assert.equal(await fs.pathExists(await extract.firstCall.returnValue), false);
      assert.deepEqual(await fs.readdir(storage.storagePath), []);
      sinon.assert.notCalled(deps.jobManager.addJob);
      sinon.assert.notCalled(deps.mailer.send);
    });
  }
  for (const name of ['empty.zip', 'malformed-comments.zip']) {
    it(`preserves the HTTP error for ${name}`, async function () {
      const { manager } = subject();
      const source = path.resolve(__dirname, '../../../../utils/fixtures/import/zips', name);
      await assert.rejects(
        manager.importFromFile({ name, path: source }, { user: { email: 'owner@example.com' } }),
        {
          statusCode: 415,
          code: 'INVALID_ZIP_FILE',
          message: 'The uploaded zip could not be read',
        },
      );
    });
  }
  it('stores one opaque archive for long asset and upload names, then reloads after request files disappear', async function () {
    const name = `${'a'.repeat(220)}.png`;
    const file = await archive(
      { 'data.json': json, [`content/images/${name}`]: 'image bytes' },
      `${'u'.repeat(220)}.zip`,
    );
    const first = subject();
    const save = sinon.spy(storage, 'save');
    const raw = sinon.spy(storage, 'saveRaw');
    const read = sinon.spy(storage, 'read');
    const options = {
      user: { email: 'owner@example.com' },
      returnImportedData: true,
      importPersistUser: false,
    };
    await first.manager.importFromFile(file, options);
    sinon.assert.calledWith(first.deps.logging.info, '[Background Job] site-content-import queued');
    sinon.assert.calledOnceWithMatch(first.deps.jobManager.addJob, { offloaded: false });
    sinon.assert.calledOnce(save);
    sinon.assert.notCalled(raw);
    const [uploadKey, fileName, importOptions] = await queuedImport(first);
    assert.match(uploadKey, uuid);
    assert.equal(fileName, file.name);
    assert.equal(importOptions, options);
    assert.deepEqual(await fs.readdir(storage.storagePath), [uploadKey]);
    await fs.remove(file.path);
    const later = subject();
    const imported = sinon
      .stub(later.manager, 'doImport')
      .callsFake(async (data: any, passed: unknown) => {
        assert.equal(data.images[0].name, name);
        assert.equal((await fs.readFile(data.images[0].path)).toString(), 'image bytes');
        assert.equal(passed, options);
        return {};
      });
    await later.manager.executeImport(uploadKey, fileName, importOptions);
    sinon.assert.calledOnce(imported);
    sinon.assert.calledOnce(later.deps.mailer.send);
    sinon.assert.notCalled(read);
    assert.deepEqual(await fs.readdir(storage.storagePath), []);
  });

  for (const [name, content] of [
    ['data.json', json],
    ['empty.json', '{}'],
    ['draft-2014-12-19-title.md', 'body'],
    ['issues.csv', 'id,title\n1,test'],
    ['photo.png', 'uninterpreted bytes'],
    ['unknown.txt', 'junk'],
  ]) {
    it(`stores standalone ${name} as uploaded, under a key of its own, and reads it back by name`, async function () {
      const first = subject();
      const source = { name, path: path.join(directory, name) };
      await fs.writeFile(source.path, content);
      const { data: expected } = await first.manager.loadFile(source);
      await first.manager.importFromFile(source, { user: { email: 'owner@example.com' } });
      const [uploadKey, fileName, importOptions] = await queuedImport(first);
      assert.match(uploadKey, uuid);
      assert.equal(fileName, name);
      assert.equal(await fs.readFile(path.join(storage.storagePath, uploadKey), 'utf8'), content);
      await fs.remove(source.path);
      const later = subject();
      const imported = sinon.stub(later.manager, 'doImport').callsFake(async (data: unknown) => {
        assert.deepEqual(data, expected);
        return {};
      });
      assert.deepEqual(
        await later.manager.executeImport(uploadKey, fileName, importOptions),
        {},
        later.deps.logging.error.firstCall?.args[0]?.stack,
      );
      sinon.assert.calledOnce(imported);
      sinon.assert.calledOnceWithMatch(later.deps.mailer.send, {
        subject: 'Your content import has finished',
      });
      assert.deepEqual(await fs.readdir(storage.storagePath), []);
    });
  }

  it('queues the key the adapter stored the upload under, not the one attempted', async function () {
    const first = subject();
    const save = storage.save.bind(storage);
    sinon
      .stub(storage, 'save')
      .callsFake(async (file, targetDir) =>
        save({ ...file, name: `renamed-${file.name}` }, targetDir),
      );

    await first.manager.importFromFile(await archive({ 'data.json': json }), {
      user: { email: 'owner@example.com' },
    });

    const [uploadKey, fileName, importOptions] = await queuedImport(first);
    assert.match(uploadKey, /^renamed-/);
    assert.deepEqual(await fs.readdir(storage.storagePath), [uploadKey]);

    const later = subject();
    const imported = sinon.stub(later.manager, 'doImport').resolves({});
    assert.deepEqual(await later.manager.executeImport(uploadKey, fileName, importOptions), {});
    sinon.assert.calledOnce(imported);
    assert.deepEqual(await fs.readdir(storage.storagePath), []);
  });

  it('fails the import request, not the site, when the adapter cannot stream reads', async function () {
    // A third-party adapter only has to implement the storage base contract, which
    // has no readStream, so such an adapter must still boot and serve the site.
    const { manager, deps } = subject();
    manager.importsStorage = Object.assign(Object.create(null), {
      save: sinon.stub().resolves(),
      delete: sinon.stub().resolves(),
      urlToPath: sinon.stub().returns('key'),
      storagePath: storage.storagePath,
    });

    await assert.rejects(
      manager.importFromFile(await archive({ 'data.json': json }), {
        user: { email: 'owner@example.com' },
      }),
      /streaming reads/,
    );

    sinon.assert.notCalled(manager.importsStorage.save);
    sinon.assert.notCalled(deps.jobManager.addJob);
    sinon.assert.notCalled(deps.mailer.send);
    assert.deepEqual(await fs.readdir(storage.storagePath), []);
  });

  for (const stage of ['save', 'enqueue']) {
    it(`rolls back the archive when ${stage} fails after bytes are saved`, async function () {
      const { manager, deps } = subject();
      const failure = new Error(`${stage} failed`);
      const file = await archive({ 'data.json': json });
      const save = storage.save.bind(storage);
      const saved = sinon.stub(storage, 'save').callsFake(async (...args) => {
        const url = await save(...args);
        if (stage === 'save') {
          throw failure;
        }
        return url;
      });
      if (stage === 'enqueue') {
        deps.jobManager.addJob.rejects(failure);
      }
      await assert.rejects(
        manager.importFromFile(file, { user: { email: 'owner@example.com' } }),
        failure,
      );
      sinon.assert.calledOnce(saved);
      sinon.assert.notCalled(deps.mailer.send);
      assert.deepEqual(await fs.readdir(storage.storagePath), []);
    });
  }
  it('preserves enqueue errors when deleting the saved upload also fails', async function () {
    const { manager, deps } = subject();
    const failure = new Error('enqueue failed');
    deps.jobManager.addJob.rejects(failure);
    sinon.stub(storage, 'delete').rejects(new Error('delete failed'));
    await assert.rejects(
      manager.importFromFile(await archive({ 'data.json': json }), {
        user: { email: 'owner@example.com' },
      }),
      failure,
    );
    sinon.assert.calledOnce(deps.logging.error);
    sinon.assert.notCalled(deps.mailer.send);
  });
  it('waits for the adapter save to complete before queueing', async function () {
    const first = subject();
    const save = storage.save.bind(storage);
    let entered!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    sinon.stub(storage, 'save').callsFake(async (...args) => {
      const url = await save(...args);
      entered();
      await gate;
      return url;
    });
    const pending = first.manager.importFromFile(await archive({ 'data.json': json }), {
      user: { email: 'owner@example.com' },
    });
    await started;
    sinon.assert.notCalled(first.deps.jobManager.addJob);
    release();
    await pending;
    sinon.assert.calledOnce(first.deps.jobManager.addJob);
    await first.manager.executeImport(...(await queuedImport(first)));
    assert.deepEqual(await fs.readdir(storage.storagePath), []);
  });
  for (const stage of ['missing object', 'read', 'write', 'extraction', 'parsing', 'import']) {
    it(`reports ${stage} failure once and cleans downloaded, extracted and stored files`, async function () {
      const first = subject();
      const { manager, deps } = first;
      await manager.importFromFile(await archive({ 'data.json': json }), {
        user: { email: 'owner@example.com' },
      });
      const [uploadKey, fileName, importOptions] = await queuedImport(first);
      const local = sinon.spy(fs, 'mkdtemp');
      const extract = sinon.spy(manager, 'extractZip');
      const failure = new Error(`${stage} failed`);
      if (stage === 'missing object') {
        await storage.delete(uploadKey);
      }
      if (stage === 'read') {
        const read = storage.readStream.bind(storage);
        sinon.stub(storage, 'readStream').callsFake(async (options) => {
          const source = await read(options);
          return Readable.from(
            (async function* () {
              for await (const chunk of source) {
                yield chunk;
                throw failure;
              }
            })(),
          );
        });
      }
      if (stage === 'write') {
        const write = fs.createWriteStream.bind(fs);
        sinon
          .stub(fs, 'createWriteStream')
          .callsFake(() => write(path.join(directory, 'absent', 'destination')));
      }
      if (stage === 'extraction') {
        await fs.writeFile(path.join(storage.storagePath, uploadKey), 'junk');
      }
      if (stage === 'parsing') {
        const corrupt = await archive({ 'data.json': '{' }, 'corrupt.zip');
        await fs.copy(corrupt.path, path.join(storage.storagePath, uploadKey));
      }
      if (stage === 'import') {
        sinon.stub(manager, 'doImport').rejects(failure);
      }
      assert.equal(await manager.executeImport(uploadKey, fileName, importOptions), undefined);
      sinon.assert.calledOnceWithMatch(deps.mailer.send, {
        subject: 'Your content import was unsuccessful',
      });
      assert.deepEqual(await fs.readdir(storage.storagePath), []);
      for (const call of [...local.getCalls(), ...extract.getCalls()]) {
        const owned = await Promise.resolve(call.returnValue).catch(() => undefined);
        if (owned) {
          assert.equal(await fs.pathExists(owned), false);
        }
      }
    });
  }
  for (const failedCleanup of ['stored', 'extracted']) {
    it(`continues other cleanup and sends one email when ${failedCleanup} deletion fails`, async function () {
      const first = subject();
      const { manager, deps } = first;
      await manager.importFromFile(await archive({ 'data.json': json }), {
        user: { email: 'owner@example.com' },
      });
      const [uploadKey, fileName, importOptions] = await queuedImport(first);
      const extract = sinon.spy(manager, 'extractZip');
      const downloads = sinon.spy(fs, 'mkdtemp');
      const remove = fs.remove.bind(fs);
      const failed: string[] = [];
      if (failedCleanup === 'stored') {
        sinon.stub(storage, 'delete').rejects(new Error('storage offline'));
      } else {
        sinon.stub(fs, 'remove').callsFake(async (target: string) => {
          if (target === (await extract.firstCall?.returnValue)) {
            failed.push(target);
            throw new Error('busy directory');
          }
          await remove(target);
        });
      }
      assert.deepEqual(await manager.executeImport(uploadKey, fileName, importOptions), {});
      sinon.assert.calledOnce(deps.mailer.send);
      sinon.assert.calledOnce(deps.logging.error);
      assert.equal(
        await fs.pathExists(await (downloads.firstCall.returnValue as unknown as Promise<string>)),
        false,
      );
      if (failedCleanup === 'stored') {
        assert.equal(await fs.pathExists(await extract.firstCall.returnValue), false);
      } else {
        assert.deepEqual(await fs.readdir(storage.storagePath), []);
      }
      for (const target of failed) {
        await remove(target);
      }
    });
  }
  it('rejects email failure without retrying, after deleting the upload and local files', async function () {
    const first = subject();
    const { manager, deps } = first;
    await manager.importFromFile(await archive({ 'data.json': json }), {
      user: { email: 'owner@example.com' },
    });
    const [uploadKey, fileName, importOptions] = await queuedImport(first);
    const downloads = sinon.spy(fs, 'mkdtemp');
    const failure = new Error('email failed');
    deps.mailer.send.rejects(failure);
    await assert.rejects(manager.executeImport(uploadKey, fileName, importOptions), failure);
    sinon.assert.calledOnce(deps.mailer.send);
    assert.deepEqual(await fs.readdir(storage.storagePath), []);
    assert.equal(
      await fs.pathExists(await (downloads.firstCall.returnValue as unknown as Promise<string>)),
      false,
    );
  });
});
