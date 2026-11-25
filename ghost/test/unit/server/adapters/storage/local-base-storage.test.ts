import assert from 'assert/strict';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import path from 'path';
import os from 'os';
import http from 'http';
import express from 'express';
import sinon from 'sinon';
import fs from 'fs-extra';
import request from 'supertest';
import LocalStorageBase from '../../../../../core/server/adapters/storage/LocalStorageBase';

describe('Local Storage Base', function () {
  describe('private import storage', function () {
    let root: string;
    let storage: LocalStorageBase;

    beforeEach(async function () {
      root = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-private-imports-'));
      storage = new LocalStorageBase({ storagePath: root });
    });

    afterEach(async function () {
      await fs.remove(root);
    });

    it('streams private files and atomically replaces metadata', async function () {
      await storage.writeStream('site/run/source', Readable.from(['one', ' two']));
      assert.equal(await fs.readFile(path.join(root, 'site/run/source'), 'utf8'), 'one two');
      assert.equal((await fs.stat(path.join(root, 'site/run/source'))).mode & 0o777, 0o600);

      await storage.replaceMetadata('site/run/checkpoint.txt', Buffer.from('12'));
      await storage.replaceMetadata('site/run/checkpoint.txt', Buffer.from('3'));
      assert.equal(await fs.readFile(path.join(root, 'site/run/checkpoint.txt'), 'utf8'), '3');
    });

    it('conditionally creates and updates metadata across adapters sharing a directory', async function () {
      const other = new LocalStorageBase({ storagePath: root });
      const key = 'site/run/manifest.json';
      const initial = Buffer.from('ready');
      assert.equal(await storage.readVersionedMetadata(key), undefined);
      const creates = await Promise.all([
        storage.writeVersionedMetadata(key, initial, null),
        other.writeVersionedMetadata(key, initial, null),
      ]);
      assert.deepEqual(creates.sort(), [false, true]);
      const snapshot = await other.readVersionedMetadata(key);
      assert.ok(snapshot);
      assert.deepEqual(snapshot.bytes, initial);

      const updates = await Promise.all([
        storage.writeVersionedMetadata(key, Buffer.from('submitting'), snapshot.version),
        other.writeVersionedMetadata(key, Buffer.from('deleting'), snapshot.version),
      ]);
      assert.deepEqual(updates.sort(), [false, true]);
      assert.deepEqual(await storage.listPrefix('site'), { keys: [key] });
      assert.notEqual((await other.readVersionedMetadata(key))?.version, snapshot.version);
      assert.equal(await storage.writeVersionedMetadata(key, initial, snapshot.version), false);
    });

    it('rejects a writer that was in flight when metadata was removed', async function () {
      const key = 'site/manifest.json';
      const initial = Buffer.from('ready');
      await storage.writeVersionedMetadata(key, initial, null);
      const snapshot = await storage.readVersionedMetadata(key);
      assert.ok(snapshot);
      const started = Promise.withResolvers<void>();
      const resume = Promise.withResolvers<void>();
      const link = fs.link;
      const publish = sinon.stub(fs, 'link').callsFake(async (source, target) => {
        started.resolve();
        await resume.promise;
        return link(source, target);
      });
      try {
        const write = storage.writeVersionedMetadata(
          key,
          Buffer.from('accepted'),
          snapshot.version,
        );
        await started.promise;
        await storage.deleteVersionedMetadata(key);
        resume.resolve();
        assert.equal(await write, false);
      } finally {
        resume.resolve();
        publish.restore();
      }
      await storage.deleteVersionedMetadata(key);
      assert.equal(await storage.readVersionedMetadata(key), undefined);
      assert.deepEqual(await storage.listPrefix('site'), { keys: [] });
    });

    it('can discover and retry metadata removal interrupted after detaching its revisions', async function () {
      const key = 'site/manifest.json';
      await storage.writeVersionedMetadata(key, Buffer.from('deleting'), null);
      const manifest = path.join(root, key);
      await fs.rename(manifest + '.ghost-import-versions', manifest + '.ghost-import-deleted');
      assert.equal(await storage.readVersionedMetadata(key), undefined);
      assert.deepEqual(await storage.listPrefix('site'), { keys: [key] });
      await storage.deleteVersionedMetadata(key);
      assert.deepEqual(await storage.listPrefix('site'), { keys: [] });
    });

    it('removes incomplete writes without replacing existing contents', async function () {
      await storage.replaceMetadata('site/run/checkpoint.txt', Buffer.from('12'));
      const failure = new Error('stream failed');
      const source = Readable.from(
        (async function* () {
          yield 'partial';
          throw failure;
        })(),
      );
      await assert.rejects(
        storage.writeStream('site/run/checkpoint.txt', source),
        (thrown) => thrown === failure,
      );
      assert.equal(await fs.readFile(path.join(root, 'site/run/checkpoint.txt'), 'utf8'), '12');
      assert.deepEqual(await fs.readdir(path.join(root, 'site/run')), ['checkpoint.txt']);
    });

    it('pages through one prefix without returning neighbouring tenants or symlinks', async function () {
      for (const key of ['site/a.csv', 'site/a/report.csv', 'site/z/source', 'site-2/source']) {
        await storage.replaceMetadata(key, Buffer.from(''));
      }
      await fs.symlink(path.join(root, 'site-2'), path.join(root, 'site/symlink'));
      const first = await storage.listPrefix('site', { limit: 2 });
      assert.deepEqual(first, {
        keys: ['site/a.csv', 'site/a/report.csv'],
        cursor: 'site/a/report.csv',
      });
      assert.deepEqual(await storage.listPrefix('site', { limit: 2, cursor: first.cursor }), {
        keys: ['site/z/source'],
      });
      assert.deepEqual(await storage.listPrefix('missing'), { keys: [] });
      await assert.rejects(storage.listPrefix('site/a.csv'), { code: 'ENOTDIR' });
    });

    it('rejects invalid paths and page sizes', async function () {
      await assert.rejects(storage.replaceMetadata('../outside', Buffer.alloc(0)), /not valid/);
      await assert.rejects(storage.listPrefix('../outside'), /not valid/);
      await assert.rejects(storage.listPrefix('site', { limit: 0 }), /page size/);
    });

    it('handles a file stream that fails before its destination exists', async function () {
      await assert.rejects(
        storage.writeStream('site/run/source', fs.createReadStream(path.join(root, 'missing'))),
        { code: 'ENOENT' },
      );
      assert.deepEqual(await storage.listPrefix('site'), { keys: [] });
    });
  });

  describe('serve', function () {
    it('sets nosniff and keeps the extension-based Content-Type', async function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: path.resolve(__dirname, 'media-storage'),
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      const app = express();
      app.use(localStorageBase.serve());

      await request(app)
        .get('/content/media/image.jpg')
        .expect(200)
        .expect('Content-Type', 'image/jpeg')
        .expect('X-Content-Type-Options', 'nosniff');
    });

    it('returns a 416 RangeNotSatisfiableError if given an invalid range', async function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: path.resolve(__dirname, 'media-storage'),
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      const req = new http.IncomingMessage(null as never);
      const res = new http.ServerResponse(req);

      Object.setPrototypeOf(req, express.request);
      Object.setPrototypeOf(res, express.response);

      req.method = 'GET';
      req.url = '/content/media/image.jpg';
      req.headers = {
        range: 'bytes=1000-999',
      };

      const err = await new Promise<{ errorType: string }>((resolve) => {
        localStorageBase.serve()(
          req as express.Request,
          res as express.Response,
          resolve as express.NextFunction,
        );
      });

      assert.equal(err.errorType, 'RangeNotSatisfiableError');
    });
  });

  describe('urlToPath', function () {
    it('returns relative path from full url', function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      assert.equal(
        localStorageBase.urlToPath('http://example.com/blog/content/media/2021/11/media.mp4'),
        '2021/11/media.mp4',
      );
    });

    it('returns relative path from prefix url', function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/',
      });

      assert.equal(
        localStorageBase.urlToPath('/content/media/2021/11/media.mp4'),
        '2021/11/media.mp4',
      );
    });

    it('throws if the url resolves outside the storage root', function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      assert.throws(
        () => {
          localStorageBase.urlToPath(
            'http://example.com/blog/content/media/2021/11/../../../../../../etc/passwd',
          );
        },
        {
          message:
            'The URL "http://example.com/blog/content/media/2021/11/../../../../../../etc/passwd" is not a valid URL for this site.',
        },
      );
    });

    it('throws if the prefix url resolves outside the storage root', function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/',
      });

      assert.throws(
        () => {
          localStorageBase.urlToPath('/content/media/../../etc/passwd');
        },
        { message: 'The URL "/content/media/../../etc/passwd" is not a valid URL for this site.' },
      );
    });

    it('throws if the url does not match current site', function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      assert.throws(
        () => {
          localStorageBase.urlToPath('http://anothersite.com/blog/content/media/2021/11/media.mp4');
        },
        {
          message:
            'The URL "http://anothersite.com/blog/content/media/2021/11/media.mp4" is not a valid URL for this site.',
        },
      );
    });
  });

  describe('path validation', function () {
    it('save allows an explicit storage-root target while keeping the file inside it', async function () {
      const storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-local-storage-'));
      const sourcePath = path.join(storagePath, '..', `ghost-local-storage-source-${Date.now()}`);
      await fs.writeFile(sourcePath, 'stored at root');

      try {
        const localStorageBase = new LocalStorageBase({
          storagePath,
          staticFileURLPrefix: 'content/files',
          siteUrl: 'http://example.com/',
        });

        const url = await localStorageBase.save(
          { name: 'root-file.txt', path: sourcePath },
          storagePath,
        );

        assert.equal(url, '/content/files/root-file.txt');
        assert.equal(
          await fs.readFile(path.join(storagePath, 'root-file.txt'), 'utf8'),
          'stored at root',
        );
      } finally {
        await fs.remove(storagePath);
        await fs.remove(sourcePath);
      }
    });

    it('save still rejects target directories outside the storage root', async function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      await assert.rejects(
        localStorageBase.save({ name: 'file.txt', path: '/tmp/file.txt' }, '../../outside-root'),
        { message: 'The path "../../outside-root" is not valid for this storage.' },
      );
    });

    it('read rejects if the path resolves outside the storage root', async function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      await assert.rejects(localStorageBase.read({ path: '../../outside-root.txt' }), {
        message: 'The path "../../outside-root.txt" is not valid for this storage.',
      });
    });

    it('exists returns false if the path resolves outside the storage root', async function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      await assert.doesNotReject(async function () {
        const exists = await localStorageBase.exists('../../outside-root.txt');
        assert.equal(exists, false);
      });
    });

    it('read rejects dot-equivalent paths', async function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      await assert.rejects(localStorageBase.read({ path: 'foo/..' }), {
        message: 'The path "foo/.." is not valid for this storage.',
      });
    });

    it('exists returns false for dot-equivalent paths', async function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      const exists = await localStorageBase.exists('.');
      assert.equal(exists, false);
    });

    it('delete rejects dot-equivalent paths', async function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      await assert.rejects(localStorageBase.delete(''), {
        message: 'The path "" is not valid for this storage.',
      });
    });

    it('exists rejects when targetDir resolves outside storage root via traversal', async function () {
      // Stub fs.stat to always succeed so we can detect traversal
      // rather than having it masked by file-not-found
      const statStub = sinon.stub(fs, 'stat').resolves({} as never);

      try {
        const localStorageBase = new LocalStorageBase({
          storagePath: '/media-storage/path/',
          staticFileURLPrefix: 'content/media',
          siteUrl: 'http://example.com/blog/',
        });

        // targetDir traverses out of storage root — should return false, not attempt access
        const exists = await localStorageBase.exists('file.txt', '../../etc');
        assert.equal(exists, false, 'should be false because the path escapes the storage root');
      } finally {
        statStub.restore();
      }
    });

    it('exists rejects when targetDir prefix-matches but is not inside storage root', async function () {
      const statStub = sinon.stub(fs, 'stat').resolves({} as never);

      try {
        const localStorageBase = new LocalStorageBase({
          storagePath: '/media-storage/path',
          staticFileURLPrefix: 'content/media',
          siteUrl: 'http://example.com/blog/',
        });

        // targetDir starts with storagePath string but is a sibling directory
        // naive startsWith would treat this as already absolute + inside root
        const exists = await localStorageBase.exists('file.txt', '/media-storage/path-evil');
        assert.equal(exists, false, 'should be false because path-evil is not inside path/');
      } finally {
        statStub.restore();
      }
    });

    it('delete rejects when targetDir resolves outside storage root', async function () {
      const localStorageBase = new LocalStorageBase({
        storagePath: '/media-storage/path/',
        staticFileURLPrefix: 'content/media',
        siteUrl: 'http://example.com/blog/',
      });

      await assert.rejects(localStorageBase.delete('file.txt', '../../etc'), {
        message: 'The path "file.txt" is not valid for this storage.',
      });
    });
  });
});

describe('Local Storage Base streaming reads', function () {
  let root: string;
  let storage: LocalStorageBase;
  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-stream-'));
    storage = new LocalStorageBase({ storagePath: path.join(root, 'objects') });
  });
  afterEach(async function () {
    await fs.remove(root);
  });
  for (const size of [0, 1024 * 1024 + 1]) {
    it(`streams ${size} bytes from a saved file without buffered reads`, async function () {
      const source = path.join(root, 'source');
      const bytes = Buffer.alloc(size, 0x89);
      await fs.writeFile(source, bytes);
      const key = storage.urlToPath(
        await storage.save({ name: 'opaque', path: source }, storage.storagePath),
      );
      const buffered = sinon.spy(storage, 'read');
      const stream = await storage.readStream({ path: key });
      const target = path.join(root, 'target');
      await pipeline(stream, fs.createWriteStream(target));
      assert.equal((await fs.stat(target)).size, size);
      assert.equal(
        createHash('sha256')
          .update(await fs.readFile(target))
          .digest('hex'),
        createHash('sha256').update(bytes).digest('hex'),
      );
      assert.equal(stream.destroyed, true);
      sinon.assert.notCalled(buffered);
    });
  }
  it('rejects missing files with the buffered read error convention', async function () {
    await assert.rejects(storage.readStream({ path: 'missing' }), { errorType: 'NotFoundError' });
  });
  for (const invalid of ['', '../outside', '..\\outside']) {
    it(`rejects invalid path ${JSON.stringify(invalid)}`, async function () {
      await assert.rejects(storage.readStream({ path: invalid }), {
        errorType: 'IncorrectUsageError',
      });
    });
  }
  it('closes the source when the destination fails', async function () {
    await fs.outputFile(path.join(storage.storagePath, 'source'), 'data');
    const stream = await storage.readStream({ path: 'source' });
    await assert.rejects(
      pipeline(stream, fs.createWriteStream(path.join(root, 'absent', 'target'))),
      { code: 'ENOENT' },
    );
    assert.equal(stream.destroyed, true);
  });
});
