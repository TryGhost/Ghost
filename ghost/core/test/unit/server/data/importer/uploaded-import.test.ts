import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { open } from 'node:fs/promises';
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
    deps.handlers = deps.handlers.map((handler) =>
      Object.assign(Object.create(Object.getPrototypeOf(handler)), handler, {
        storage: new LocalStorageBase({
          storagePath: assets.storagePath,
          staticFileURLPrefix: handler.storage?.staticFileURLPrefix || '/content/images',
        }),
      }),
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
    const unique = sinon.spy(
      deps.handlers.find((handler: any) => handler.type === 'media').storage,
      'getUniqueFileName',
    );
    const extract = sinon.spy(manager, 'extractZip');
    assert.equal(await manager.validateFile(file), undefined);
    sinon.assert.notCalled(unique);
    sinon.assert.notCalled(deps.jobsService.dispatch);
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
      sinon.assert.notCalled(deps.jobsService.dispatch);
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
    const { manager, deps } = subject();
    const save = sinon.spy(storage, 'save');
    const raw = sinon.spy(storage, 'saveRaw');
    const read = sinon.spy(storage, 'read');
    const options = {
      user: { email: 'owner@example.com' },
      returnImportedData: true,
      importPersistUser: false,
    };
    await manager.importFromFile(file, options);
    sinon.assert.calledOnce(deps.jobsService.dispatch);
    sinon.assert.notCalled(deps.jobManager.addJob);
    sinon.assert.calledOnce(save);
    sinon.assert.notCalled(raw);
    const job = JSON.parse(JSON.stringify(deps.jobsService.dispatch.firstCall.args[0]));
    assert.match(
      job.uploadKey,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    assert.deepEqual(await fs.readdir(storage.storagePath), [job.uploadKey]);
    await fs.remove(file.path);
    const later = subject();
    const imported = sinon
      .stub(later.manager, 'doImport')
      .callsFake(async (data: any, passed: unknown) => {
        assert.equal(data.images[0].name, name);
        assert.equal((await fs.readFile(data.images[0].path)).toString(), 'image bytes');
        assert.deepEqual(passed, { ...options, importTag: undefined, runningInJob: true });
        return {};
      });
    const handle = sinon.stub();
    const registerJobHandlers =
      require('../../../../../core/server/services/jobs-service/register-job-handlers').default;
    const ContentImportJob =
      require('../../../../../core/server/data/importer/jobs/content-import-job').default;
    registerJobHandlers({ jobsService: { handle }, siteImporter: later.manager });
    const registration = handle.getCalls().find((call) => call.args[0] === ContentImportJob);
    assert.ok(registration);
    assert.equal(registration.args[2], undefined);
    await registration.args[1](new ContentImportJob(job));
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
    it(`preserves standalone ${name} interpretation without carrying a filename in the job`, async function () {
      const { manager, deps } = subject();
      const source = { name, path: path.join(directory, name) };
      await fs.writeFile(source.path, content);
      const expected = await manager.loadFile(source);
      await manager.importFromFile(source, { user: { email: 'owner@example.com' } });
      const job = JSON.parse(JSON.stringify(deps.jobsService.dispatch.firstCall.args[0]));
      assert.deepEqual(Object.keys(job).sort(), ['emailRecipient', 'uploadKey']);
      await fs.remove(source.path);
      const later = subject();
      const imported = sinon.stub(later.manager, 'doImport').callsFake(async (data: unknown) => {
        assert.deepEqual(data, expected);
        return {};
      });
      assert.deepEqual(
        await later.manager.executeImport(job),
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

  // These failure cases retain the previous persistence tests at the request /
  // execution boundary, with real disk storage and injected operational faults.
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
        deps.jobsService.dispatch.rejects(failure);
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
    deps.jobsService.dispatch.rejects(failure);
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
  it('waits for the adapter save to complete before dispatch', async function () {
    const { manager, deps } = subject();
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
    const pending = manager.importFromFile(await archive({ 'data.json': json }), {
      user: { email: 'owner@example.com' },
    });
    await started;
    sinon.assert.notCalled(deps.jobsService.dispatch);
    release();
    await pending;
    sinon.assert.calledOnce(deps.jobsService.dispatch);
    await manager.executeImport(deps.jobsService.dispatch.firstCall.args[0]);
    assert.deepEqual(await fs.readdir(storage.storagePath), []);
  });
  for (const stage of ['missing object', 'read', 'write', 'extraction', 'parsing', 'import']) {
    it(`reports ${stage} failure once and cleans downloaded, extracted and stored files`, async function () {
      const { manager, deps } = subject();
      await manager.importFromFile(await archive({ 'data.json': json }), {
        user: { email: 'owner@example.com' },
      });
      const job = JSON.parse(JSON.stringify(deps.jobsService.dispatch.firstCall.args[0]));
      const local = sinon.spy(fs, 'mkdtemp');
      const extract = sinon.spy(manager, 'extractZip');
      const failure = new Error(`${stage} failed`);
      if (stage === 'missing object') {
        await storage.delete(job.uploadKey);
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
        await fs.writeFile(path.join(storage.storagePath, job.uploadKey), 'junk');
      }
      if (stage === 'parsing') {
        const corrupt = await archive({ 'data.json': '{' }, 'corrupt.zip');
        await fs.copy(corrupt.path, path.join(storage.storagePath, job.uploadKey));
      }
      if (stage === 'import') {
        sinon.stub(manager, 'doImport').rejects(failure);
      }
      assert.equal(await manager.executeImport(job), undefined);
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
      const { manager, deps } = subject();
      await manager.importFromFile(await archive({ 'data.json': json }), {
        user: { email: 'owner@example.com' },
      });
      const job = deps.jobsService.dispatch.firstCall.args[0];
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
      assert.deepEqual(await manager.executeImport(job), {});
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
    const { manager, deps } = subject();
    await manager.importFromFile(await archive({ 'data.json': json }), {
      user: { email: 'owner@example.com' },
    });
    const failure = new Error('email failed');
    deps.mailer.send.rejects(failure);
    await assert.rejects(
      manager.executeImport(deps.jobsService.dispatch.firstCall.args[0]),
      failure,
    );
    sinon.assert.calledOnce(deps.mailer.send);
    assert.deepEqual(await fs.readdir(storage.storagePath), []);
  });
  for (const size of [16 * 1024 * 1024 + 3, 2 ** 31 + 1]) {
    it(`transfers an archive containing a ${size}-byte asset and an empty asset under one UUID`, async function () {
      // The >2 GiB case uses a sparse source and compressed ZIP. Extraction needs
      // about 2.1 GiB disk per pass (passes are sequential); allow 180s for slow CI.
      const source = path.join(directory, 'large.mp4');
      const handle = await open(source, 'w');
      try {
        await handle.truncate(size);
        await handle.write(Buffer.from([1, 2, 3]), 0, 3, 0);
        await handle.write(Buffer.from([4, 5, 6]), 0, 3, size - 3);
      } finally {
        await handle.close();
      }
      const file = { name: 'large.zip', path: path.join(directory, 'large.zip') };
      const zip = new ZipArchive();
      const written = pipeline(zip, fs.createWriteStream(file.path));
      zip.append(json, { name: 'data.json' });
      zip.file(source, { name: 'content/media/large.mp4' });
      zip.append('', { name: 'content/media/empty.mp4' });
      await Promise.all([zip.finalize(), written]);
      const { manager, deps } = subject();
      const save = sinon.spy(storage, 'save');
      const raw = sinon.spy(storage, 'saveRaw');
      const buffered = sinon.spy(storage, 'read');
      await manager.importFromFile(file, { user: { email: 'owner@example.com' } });
      const job = JSON.parse(JSON.stringify(deps.jobsService.dispatch.firstCall.args[0]));
      assert.equal(job.uploadKey.length, 36);
      assert.deepEqual(await fs.readdir(storage.storagePath), [job.uploadKey]);
      sinon.assert.calledOnce(save);
      sinon.assert.notCalled(raw);
      await fs.remove(source);
      await fs.remove(file.path);
      const later = subject();
      const imported = sinon.stub(later.manager, 'doImport').callsFake(async (data: any) => {
        const large = data.media.find((asset: any) => asset.name === 'large.mp4');
        const empty = data.media.find((asset: any) => asset.name === 'empty.mp4');
        assert.equal((await fs.stat(large.path)).size, size);
        assert.equal((await fs.stat(empty.path)).size, 0);
        const restored = await open(large.path, 'r');
        try {
          for (const [offset, bytes] of [
            [0, [1, 2, 3]],
            [size - 3, [4, 5, 6]],
            [Math.floor(size / 2), [0, 0, 0]],
          ] as const) {
            const result = await restored.read(Buffer.alloc(3), 0, 3, offset);
            assert.deepEqual(result.buffer, Buffer.from(bytes));
          }
        } finally {
          await restored.close();
        }
        return {};
      });
      assert.deepEqual(
        await later.manager.executeImport(job),
        {},
        later.deps.logging.error.firstCall?.args[0]?.stack,
      );
      sinon.assert.calledOnce(imported);
      sinon.assert.calledOnceWithMatch(later.deps.mailer.send, {
        subject: 'Your content import has finished',
      });
      sinon.assert.notCalled(buffered);
      assert.deepEqual(await fs.readdir(storage.storagePath), []);
    }, 180000);
  }
  it('logs failed partial-extraction cleanup without replacing the primary failure', async function () {
    const { manager, deps } = subject();
    await manager.importFromFile(await archive({ 'data.json': json }), {
      user: { email: 'owner@example.com' },
    });
    const primary = new Error('extract interrupted');
    const cleanup = new Error('partial directory busy');
    const logged = sinon.spy(require('@tryghost/logging'), 'error');
    const remove = fs.remove.bind(fs);
    let partial = '';
    sinon
      .stub(manager.archive, 'extractArchive')
      .callsFake(async (_source: unknown, destination: unknown) => {
        partial = String(destination);
        await fs.outputFile(path.join(partial, 'partial.json'), '{}');
        throw primary;
      });
    sinon.stub(fs, 'remove').callsFake(async (target: string) => {
      if (target === partial) {
        throw cleanup;
      }
      await remove(target);
    });
    try {
      await manager.executeImport(deps.jobsService.dispatch.firstCall.args[0]);
      sinon.assert.calledWith(logged, cleanup, 'Import archive cleanup failed');
      sinon.assert.calledWith(
        deps.logging.error,
        primary,
        '[Background Job] site-content-import error',
      );
      sinon.assert.calledOnce(deps.mailer.send);
      assert.deepEqual(await fs.readdir(storage.storagePath), []);
    } finally {
      await remove(partial);
    }
  });
});
