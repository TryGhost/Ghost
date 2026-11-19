import assert from 'node:assert/strict';
import fsPromises from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import errors from '@tryghost/errors';
import sinon from 'sinon';
import fs from 'fs-extra';
import moment from 'moment';
import os from 'node:os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import type { StorageFile } from 'ghost-storage-base';
import type LocalImagesStorageClass from '../../../../../core/server/adapters/storage/LocalImagesStorage';

// Vitest resolves `import` through Vite's SSR module runner and `require`
// through Node's CJS cache, so the same first-party module loaded both ways
// yields two instances with independent state. config-utils is untyped JS and
// has to be required, so the storage adapter reading the config singleton it
// mutates must come from the same `require` graph.
const LocalImagesStorage: typeof LocalImagesStorageClass =
  require('../../../../../core/server/adapters/storage/LocalImagesStorage').default;
const configUtils = require('../../../../utils/config-utils');
const { assertExists } = require('../../../../utils/assertions');

// Resolve content paths from the ghost package root so assertions do not
// assume process.cwd() === ghost (the unified `pnpm test:watch` runs from
// the repo root).
const ghostCoreRoot = path.join(__dirname, '../../../../..');

describe('Local Images Storage', function () {
  let image: StorageFile;
  let momentStub: sinon.SinonStub;
  let localFileStore: LocalImagesStorageClass;
  let fsMkdirsStub: sinon.SinonStub;
  let fsCopyStub: sinon.SinonStub;
  let fsStatStub: sinon.SinonStub;

  function fakeDate(month: number, year: number) {
    momentStub.withArgs('YYYY').returns(year.toString());
    momentStub.withArgs('MM').returns(month < 10 ? '0' + month.toString() : month.toString());
  }

  beforeEach(function () {
    // Fake a date, do this once for all tests in this file
    momentStub = sinon.stub(moment.fn, 'format');
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
  });

  beforeEach(function () {
    fsMkdirsStub = sinon.stub(fs, 'mkdirs').resolves();
    fsCopyStub = sinon.stub(fs, 'copy').resolves();
    fsStatStub = sinon.stub(fs, 'stat').rejects();
    sinon.stub(fs, 'unlink').resolves();

    image = {
      path: 'tmp/123456.jpg',
      name: 'IMAGE.jpg',
      type: 'image/jpeg',
    };

    localFileStore = new LocalImagesStorage();

    fakeDate(9, 2013);
  });

  it('should send correct path to image when date is in Sep 2013', async function () {
    const url = await localFileStore.save(image);
    assert.equal(url, '/content/images/2013/09/IMAGE.jpg');
  });

  it('should send correct path to image when original file has spaces', async function () {
    image.name = 'AN IMAGE.jpg';
    const url = await localFileStore.save(image);
    assert.equal(url, '/content/images/2013/09/AN-IMAGE.jpg');
  });

  it('should allow "@" symbol to image for Apple hi-res (retina) modifier', async function () {
    image.name = 'photo@2x.jpg';
    const url = await localFileStore.save(image);
    assert.equal(url, '/content/images/2013/09/photo@2x.jpg');
  });

  it('should send correct path to image when date is in Jan 2014', async function () {
    fakeDate(1, 2014);

    const url = await localFileStore.save(image);
    assert.equal(url, '/content/images/2014/01/IMAGE.jpg');
  });

  it('should create month and year directory', async function () {
    await localFileStore.save(image);
    sinon.assert.calledOnce(fsMkdirsStub);
    assert.equal(fsMkdirsStub.args[0][0], path.resolve(ghostCoreRoot, './content/images/2013/09'));
  });

  it('should copy temp file to new location', async function () {
    await localFileStore.save(image);
    sinon.assert.calledOnce(fsCopyStub);
    assert.equal(fsCopyStub.args[0][0], 'tmp/123456.jpg');
    assert.equal(
      fsCopyStub.args[0][1],
      path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE.jpg'),
    );
  });

  it('can upload two different images with the same name without overwriting the first', async function () {
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-1.jpg'))
      .rejects();

    // if on windows need to setup with back slashes
    // doesn't hurt for the test to cope with both
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-1.jpg'))
      .rejects();

    const url = await localFileStore.save(image);
    assert.equal(url, '/content/images/2013/09/IMAGE-1.jpg');
  });

  it('can upload five different images with the same name without overwriting the first', async function () {
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-1.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-2.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-3.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, './content/images/2013/09/IMAGE-4.jpg'))
      .rejects();

    // windows setup
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-1.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-2.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-3.jpg'))
      .resolves();
    fsStatStub
      .withArgs(path.resolve(ghostCoreRoot, '.\\content\\images\\2013\\Sep\\IMAGE-4.jpg'))
      .rejects();

    const url = await localFileStore.save(image);
    assert.equal(url, '/content/images/2013/09/IMAGE-4.jpg');
  });

  describe('read image', function () {
    beforeEach(function () {
      // we have some example images in our test utils folder
      localFileStore.storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
    });

    it('success', async function () {
      const bytes = await localFileStore.read({ path: 'ghost-logo.png' });
      assert.equal(bytes.length, 8638);
    });

    it('success (leading and trailing slashes)', async function () {
      const bytes = await localFileStore.read({ path: '/ghost-logo.png/' });
      assert.equal(bytes.length, 8638);
    });

    it('image does not exist', async function () {
      await assert.rejects(
        localFileStore.read({ path: 'does-not-exist.png' }),
        (err: errors.NotFoundError & { code?: string }) => {
          assert.equal(err instanceof errors.NotFoundError, true);
          assert.equal(err.code, 'ENOENT');
          return true;
        },
      );
    });
  });

  describe('validate extentions', function () {
    it('name contains a .\d as extension', async function () {
      const url = await localFileStore.save({
        name: 'test-1.1.1',
      } as StorageFile);
      assertExists(url.match(/test-1.1.1/));
    });

    it('name contains a .zip as extension', async function () {
      const url = await localFileStore.save({
        name: 'test-1.1.1.zip',
      } as StorageFile);
      assertExists(url.match(/test-1.1.1.zip/));
    });

    it('name contains a .jpeg as extension', async function () {
      const url = await localFileStore.save({
        name: 'test-1.1.1.jpeg',
      } as StorageFile);
      assertExists(url.match(/test-1.1.1.jpeg/));
    });
  });

  describe('serving content types', function () {
    // The adapter reads real files here, so these get a directory of their own
    let serveDir: string;
    let store: LocalImagesStorageClass;

    const fixture = (name: string) =>
      fs.readFileSync(path.join(__dirname, '../../../../utils/fixtures/images', name));

    const writeImage = (relativePath: string, fixtureName: string) =>
      fs.outputFileSync(path.join(serveDir, relativePath), fixture(fixtureName));

    beforeEach(function () {
      sinon.restore();
      serveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-images-'));
      sinon.stub(configUtils.config, 'getContentPath').returns(serveDir);
      store = new LocalImagesStorage();
    });

    afterEach(function () {
      fs.removeSync(serveDir);
    });

    it('takes the type from the contents, not from the name', async function () {
      // A name is chosen by whoever uploads, so a .png can hold a JPEG
      writeImage('2024/06/photo.png', 'ghosticon.jpg');

      assert.equal(await store._getServeContentType('/2024/06/photo.png'), 'image/jpeg');
    });

    it('reads the other renderable image formats', async function () {
      writeImage('2024/06/a.jpg', 'ghost-logo.png');
      writeImage('2024/06/b.jpg', 'loadingcat.gif');
      writeImage('2024/06/c.jpg', 'ghosticon.webp');

      assert.equal(await store._getServeContentType('/2024/06/a.jpg'), 'image/png');
      assert.equal(await store._getServeContentType('/2024/06/b.jpg'), 'image/gif');
      assert.equal(await store._getServeContentType('/2024/06/c.jpg'), 'image/webp');
    });

    it('claims nothing for an SVG, whose bytes say nothing', async function () {
      // SVG is text, so express.static types it from the extension and sends
      // image/svg+xml. The end-to-end assertion lives in images.test.js
      writeImage('2024/06/logo.svg', 'ghost-logo.svg');

      assert.equal(await store._getServeContentType('/2024/06/logo.svg'), undefined);
    });

    it('decodes the request path', async function () {
      writeImage('2024/06/a photo.png', 'ghosticon.jpg');

      assert.equal(await store._getServeContentType('/2024/06/a%20photo.png'), 'image/jpeg');
    });

    it('serves the new type after a file is replaced', async function () {
      writeImage('2024/06/photo.png', 'ghosticon.jpg');
      assert.equal(await store._getServeContentType('/2024/06/photo.png'), 'image/jpeg');

      // The cache key has to move with the contents, or the old type sticks
      writeImage('2024/06/photo.png', 'loadingcat.gif');
      const later = new Date(Date.now() + 5000);
      fs.utimesSync(path.join(serveDir, '2024/06/photo.png'), later, later);

      assert.equal(await store._getServeContentType('/2024/06/photo.png'), 'image/gif');
    });

    it('keeps serving an uploaded favicon as an image', async function () {
      // .ico is an allowed image upload and is not on the renderable list, so
      // it must not fall through to a download
      writeImage('2024/06/favicon.ico', 'favicon.ico');

      assert.equal(await store._getServeContentType('/2024/06/favicon.ico'), 'image/x-icon');
    });

    it('claims nothing for a compressed SVG either', async function () {
      // A .svgz is a gzip wrapper, which identifies itself but says nothing
      // about the image inside, so detection has to stay out of the way and
      // let express.static type it from the extension
      fs.outputFileSync(
        path.join(serveDir, '2024/06/logo.svgz'),
        require('node:zlib').gzipSync(fixture('ghost-logo.svg')),
      );

      assert.equal(await store._getServeContentType('/2024/06/logo.svgz'), undefined);
    });

    describe('HTTP responses', function () {
      let app: express.Express;

      beforeEach(function () {
        app = express();
        app.use('/content/images', store.serve());
      });

      it('shares detection between concurrent requests for the same file', async function () {
        writeImage('photo.png', 'ghosticon.jpg');
        const stats = fs.statSync(path.join(serveDir, 'photo.png'));
        let releaseLookup!: () => void;
        const lookupGate = new Promise<void>((resolve) => {
          releaseLookup = resolve;
        });
        let allRequestsReady!: () => void;
        const requestsReady = new Promise<void>((resolve) => {
          allRequestsReady = resolve;
        });
        let lookupStarted!: () => void;
        const lookupReady = new Promise<void>((resolve) => {
          lookupStarted = resolve;
        });
        let statCount = 0;
        sinon.stub(fsPromises, 'stat').callsFake(async () => {
          statCount += 1;
          if (statCount === 3) {
            allRequestsReady();
          }
          return stats;
        });
        const originalOpen = fsPromises.open;
        const openStub = sinon.stub(fsPromises, 'open').callsFake(async (file, flags, mode) => {
          lookupStarted();
          await lookupGate;
          return originalOpen(file, flags, mode);
        });
        const responses = Promise.all(
          Array.from({ length: 3 }, () =>
            request(app)
              .get('/content/images/photo.png')
              .expect(200)
              .expect('Content-Type', 'image/jpeg')
              .then((response) => response),
          ),
        );

        try {
          await Promise.all([requestsReady, lookupReady]);
          // Let all stat continuations reach detection while the file open is held.
          await setImmediate();
          sinon.assert.calledOnce(openStub);
        } finally {
          releaseLookup();
          await responses;
        }

        await request(app).get('/content/images/photo.png').expect(200);
        sinon.assert.calledOnce(openStub);
      });

      it('serves mismatched image names with the detected type and original bytes', async function () {
        writeImage('2024/06/photo.png', 'ghosticon.jpg');

        const response = await request(app)
          .get('/content/images/2024/06/photo.png')
          .expect(200)
          .expect('Content-Type', 'image/jpeg')
          .expect('X-Content-Type-Options', 'nosniff');

        assert.deepEqual(response.body, fixture('ghosticon.jpg'));
      });

      it('keeps SVGs renderable after caching an inconclusive lookup', async function () {
        writeImage('2024/06/logo.svg', 'ghost-logo.svg');

        for (let i = 0; i < 2; i++) {
          await request(app)
            .get('/content/images/2024/06/logo.svg')
            .expect(200)
            .expect('Content-Type', 'image/svg+xml')
            .expect('X-Content-Type-Options', 'nosniff');
        }
      });

      it('serves markup as inert text', async function () {
        const markup = '<h1>Example</h1>';
        fs.outputFileSync(path.join(serveDir, 'page.html'), markup);

        await request(app)
          .get('/content/images/page.html')
          .expect(200, markup)
          .expect('Content-Type', 'text/plain')
          .expect('X-Content-Type-Options', 'nosniff');
      });

      it('preserves the detected type and requested bytes in range responses', async function () {
        writeImage('photo.png', 'ghosticon.jpg');
        const contents = fixture('ghosticon.jpg');

        const response = await request(app)
          .get('/content/images/photo.png')
          .set('Range', 'bytes=0-10')
          .expect(206)
          .expect('Content-Type', 'image/jpeg')
          .expect('Content-Range', `bytes 0-10/${contents.length}`)
          .expect('X-Content-Type-Options', 'nosniff');

        assert.deepEqual(response.body, contents.subarray(0, 11));
      });

      it('returns a bodyless 304 for an unchanged image', async function () {
        writeImage('photo.png', 'ghosticon.jpg');
        const first = await request(app).get('/content/images/photo.png').expect(200);
        assert.ok(first.headers.etag);

        const response = await request(app)
          .get('/content/images/photo.png')
          .set('If-None-Match', first.headers.etag)
          .expect(304)
          .expect('X-Content-Type-Options', 'nosniff');

        assert.equal(response.text, '');
        assert.equal(response.headers['content-type'], undefined);
      });
    });

    describe('caching', function () {
      // The cache key is path, mtime and size, so contents swapped for a same
      // sized payload under the same timestamp look unchanged. That is what
      // makes a cache hit observable: a fresh read would report the new type.
      // A filesystem timestamp can carry sub-millisecond precision that
      // utimes cannot restore, so both writes are pinned to the same whole
      // millisecond instead of trying to put the original one back
      const PINNED_TIME = new Date('2026-01-01T00:00:00.000Z');

      const writePinned = (relativePath: string, contents: Buffer) => {
        const filePath = path.join(serveDir, relativePath);
        fs.outputFileSync(filePath, contents);
        fs.utimesSync(filePath, PINNED_TIME, PINNED_TIME);
      };

      const swapKeepingStat = (relativePath: string, contents: Buffer) => {
        const filePath = path.join(serveDir, relativePath);
        const before = fs.statSync(filePath);

        assert.equal(
          contents.length,
          before.size,
          'test payload must match the original size for the stat to look unchanged',
        );

        writePinned(relativePath, contents);

        const after = fs.statSync(filePath);
        assert.equal(after.mtimeMs, before.mtimeMs, 'swap must leave the timestamp untouched');
        assert.equal(after.size, before.size, 'swap must leave the size untouched');
      };

      // Detected from the magic bytes alone, padded to whatever size is needed
      const gifOfSize = (size: number) =>
        Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(size - 6)]);

      it('caches an inconclusive result until the file changes', async function () {
        const relativePath = '2024/06/cached.svg';
        const svg = fixture('ghost-logo.svg');
        writePinned(relativePath, svg);
        assert.equal(await store._getServeContentType(`/${relativePath}`), undefined);

        swapKeepingStat(relativePath, gifOfSize(svg.length));
        assert.equal(await store._getServeContentType(`/${relativePath}`), undefined);

        const changedTime = new Date(PINNED_TIME.getTime() + 1000);
        fs.utimesSync(path.join(serveDir, relativePath), changedTime, changedTime);
        assert.equal(await store._getServeContentType(`/${relativePath}`), 'image/gif');
      });

      it('does not read the file again while it looks unchanged', async function () {
        writePinned('2024/06/cached.png', fixture('ghosticon.jpg'));
        assert.equal(await store._getServeContentType('/2024/06/cached.png'), 'image/jpeg');

        swapKeepingStat('2024/06/cached.png', gifOfSize(fixture('ghosticon.jpg').length));

        // Still the cached answer, because nothing about the file's stat moved
        assert.equal(await store._getServeContentType('/2024/06/cached.png'), 'image/jpeg');
      });

      it('reads the file again once the entry has been evicted', async function () {
        writePinned('2024/06/evicted.png', fixture('ghosticon.jpg'));
        assert.equal(await store._getServeContentType('/2024/06/evicted.png'), 'image/jpeg');

        swapKeepingStat('2024/06/evicted.png', gifOfSize(fixture('ghosticon.jpg').length));

        // Push the entry out of a cache bounded at 1000
        for (let i = 0; i < 1001; i++) {
          writeImage(`2024/06/evict-filler-${i}.png`, 'ghost-logo.png');
          await store._getServeContentType(`/2024/06/evict-filler-${i}.png`);
        }

        // The stale answer is gone, so the contents are read afresh
        assert.equal(await store._getServeContentType('/2024/06/evicted.png'), 'image/gif');
      });
    });

    describe('security', function () {
      it('does not upgrade disguised contents to an executable type', async function () {
        // Markup under an image name is served as the image its name claims,
        // never as something a browser will parse as a document
        fs.outputFileSync(
          path.join(serveDir, '2024/06/disguised.png'),
          '<!DOCTYPE html><script>alert(document.domain)</script>',
        );

        // Nothing is claimed, so express.static serves it as the image its
        // name says — never as the markup it holds
        assert.equal(await store._getServeContentType('/2024/06/disguised.png'), undefined);
      });

      it('serves markup in the image directory inert', async function () {
        // Upload validation rejects these extensions, so nothing should put
        // them here — but the serving layer must not hand out an executable
        // type if one ever arrives
        fs.outputFileSync(path.join(serveDir, '2024/06/page.html'), '<script>alert(1)</script>');
        fs.outputFileSync(path.join(serveDir, '2024/06/app.js'), 'alert(1)');
        fs.outputFileSync(path.join(serveDir, '2024/06/styles.css'), 'body{color:red}');

        assert.equal(await store._getServeContentType('/2024/06/page.html'), 'text/plain');
        assert.equal(await store._getServeContentType('/2024/06/app.js'), 'text/plain');
        assert.equal(await store._getServeContentType('/2024/06/styles.css'), 'text/plain');
      });

      it('leaves a harmless name alone', async function () {
        // Only names a browser would execute are forced. Ghost ships
        // content/images/README.md, which stays readable
        fs.outputFileSync(path.join(serveDir, 'README.md'), '# Images');
        fs.outputFileSync(path.join(serveDir, '2024/06/thing.randomjunk'), 'whatever');

        assert.equal(await store._getServeContentType('/README.md'), undefined);
        assert.equal(await store._getServeContentType('/2024/06/thing.randomjunk'), undefined);
      });

      it('serves an image with a script appended as that image', async function () {
        fs.outputFileSync(
          path.join(serveDir, '2024/06/polyglot.gif'),
          Buffer.concat([
            fixture('loadingcat.gif'),
            Buffer.from('<script>alert(document.domain)</script>'),
          ]),
        );

        assert.equal(await store._getServeContentType('/2024/06/polyglot.gif'), 'image/gif');
      });

      it('rejects an encoded path that escapes the image directory', async function () {
        assert.equal(await store._getServeContentType('/%2e%2e%2f%2e%2e%2fetc/passwd'), undefined);
      });

      it('rejects an absolute path', async function () {
        assert.equal(await store._getServeContentType('//etc/passwd'), undefined);
      });

      it('rejects a path with a null byte', async function () {
        assert.equal(await store._getServeContentType('/2024/06/photo.png%00.html'), undefined);
      });

      it('survives a malformed percent escape', async function () {
        // decodeURIComponent throws on this, and serving must continue
        assert.equal(await store._getServeContentType('/2024/06/%E0%A4%A'), undefined);
      });

      it('claims nothing for a symlink to a text file outside the directory', async function () {
        const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-images-outside-'));
        try {
          const target = path.join(outsideDir, 'notes.txt');
          fs.outputFileSync(target, 'plain text');
          const linkPath = path.join(serveDir, '2024/06/link.png');
          fs.ensureDirSync(path.dirname(linkPath));
          fs.symlinkSync(target, linkPath);

          assert.equal(await store._getServeContentType('/2024/06/link.png'), undefined);
        } finally {
          fs.removeSync(outsideDir);
        }
      });
    });

    it('ignores a path that escapes the image directory', async function () {
      assert.equal(await store._getServeContentType('/../../../etc/passwd'), undefined);
    });

    it('ignores a directory', async function () {
      writeImage('2024/06/photo.png', 'ghosticon.jpg');

      assert.equal(await store._getServeContentType('/2024/06'), undefined);
    });

    it('ignores a file that is not there', async function () {
      assert.equal(await store._getServeContentType('/2024/06/missing.jpg'), undefined);
    });
  });

  describe('when a custom content path is used', function () {
    beforeEach(function () {
      const configPaths = configUtils.defaultConfig.paths;
      configUtils.set('paths:contentPath', configPaths.appRoot + '/var/ghostcms');
    });

    it('should send the correct path to image', async function () {
      const url = await localFileStore.save(image);
      assert.equal(url, '/content/images/2013/09/IMAGE.jpg');
    });
  });

  describe('on Windows', function () {
    const truePathSep = path.sep;

    beforeEach(function () {
      sinon.stub(configUtils.config, 'getContentPath').returns('content\\images\\');
    });

    afterEach(function () {
      (path as { sep: string }).sep = truePathSep;
    });

    it('should return url in proper format for windows', async function () {
      // @ts-expect-error - path.sep is read-only, but we can override it for testing purposes
      path.sep = '\\';

      const url = await localFileStore.save(image);
      if (truePathSep === '\\') {
        assert.equal(url, '/content/images/2013/09/IMAGE.jpg');
      } else {
        // if this unit test is run on an OS that uses forward slash separators,
        // localfilesystem.save() will use a path.relative() call on
        // one path with backslash separators and one path with forward
        // slashes and it returns a path that needs to be normalized
        assert.equal(path.normalize(url), '/content/images/2013/09/IMAGE.jpg');
      }
    });
  });
});
