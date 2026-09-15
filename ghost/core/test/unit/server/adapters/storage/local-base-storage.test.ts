import assert from 'assert/strict';
import path from 'path';
import os from 'os';
import http from 'http';
import express from 'express';
import sinon from 'sinon';
import fs from 'fs-extra';
import request from 'supertest';
import LocalStorageBase from '../../../../../core/server/adapters/storage/LocalStorageBase';

describe('Local Storage Base', function () {
  describe('fileMode', function () {
    let storagePath: string;
    let sourcePath: string;

    const modeOf = async (filePath: string) => (await fs.stat(filePath)).mode & 0o777;
    const createStorage = (fileMode?: number) =>
      new LocalStorageBase({
        storagePath,
        staticFileURLPrefix: 'content/imports',
        fileMode,
      });

    beforeEach(async function () {
      storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-local-base-mode-'));
      sourcePath = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-upload-')), 'upload');
      await fs.writeFile(sourcePath, 'title\nA post\n');
      await fs.chmod(sourcePath, 0o644);
    });

    afterEach(async function () {
      sinon.restore();
      await fs.remove(storagePath);
      await fs.remove(path.dirname(sourcePath));
    });

    it('creates raw files with the configured mode', async function () {
      const storage = createStorage(0o600);

      await storage.saveRaw(Buffer.from('[]'), 'members-import-1.json');

      assert.equal(await modeOf(path.join(storagePath, 'members-import-1.json')), 0o600);
    });

    it('gives saved copies the configured mode and leaves the upload alone', async function () {
      const storage = createStorage(0o600);

      const url = await storage.save(
        { name: 'content-csv-import-1', path: sourcePath },
        storagePath,
      );

      assert.equal(storage.urlToPath(url), 'content-csv-import-1');
      assert.equal(await modeOf(path.join(storagePath, 'content-csv-import-1')), 0o600);
      assert.equal(await modeOf(sourcePath), 0o644);
    });

    it('removes a saved copy when the copy fails', async function () {
      const storage = createStorage(0o600);
      sinon.stub(fs, 'copy').callsFake(async (_src: string, dest: string) => {
        await fs.writeFile(dest, 'partial');
        throw new Error('ENOSPC: no space left on device');
      });

      await assert.rejects(
        storage.save({ name: 'content-csv-import-2', path: sourcePath }, storagePath),
        /ENOSPC/,
      );

      assert.equal(await fs.pathExists(path.join(storagePath, 'content-csv-import-2')), false);
    });

    it('leaves file modes alone when no mode is configured, as the images, media and files stores do', async function () {
      const storage = createStorage();
      const chmod = sinon.spy(fs, 'chmod');

      await storage.saveRaw(Buffer.from('[]'), 'raw.json');
      await storage.save({ name: 'copy', path: sourcePath }, storagePath);

      sinon.assert.notCalled(chmod);
      assert.equal(await modeOf(path.join(storagePath, 'raw.json')), 0o666 & ~process.umask());
      assert.equal(await modeOf(path.join(storagePath, 'copy')), 0o644);
    });

    it('leaves a failed copy alone when no mode is configured, as before', async function () {
      const storage = createStorage();
      sinon.stub(fs, 'copy').callsFake(async (_src: string, dest: string) => {
        await fs.writeFile(dest, 'partial');
        throw new Error('ENOSPC: no space left on device');
      });

      await assert.rejects(storage.save({ name: 'copy', path: sourcePath }, storagePath), /ENOSPC/);

      assert.equal(await fs.pathExists(path.join(storagePath, 'copy')), true);
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
