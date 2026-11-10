import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';
import {
  getContentFileOwner,
  routeContentFiles,
} from '../../../../../core/server/data/importer/content-file-routing';
// @ts-expect-error This module lacks type definitions.
import importer from '../../../../../core/server/data/importer';

const ALL = ['images', 'media', 'files'];

describe('Content file routing', function () {
  describe('getContentFileOwner', function () {
    it('gives a file under a type folder to that type', function () {
      assert.equal(getContentFileOwner('content/images/2026/11/a.png', undefined, ALL), 'images');
      assert.equal(
        getContentFileOwner('content/media/a.mp4', undefined, ['media', 'files']),
        'media',
      );
      assert.equal(getContentFileOwner('content/files/a.png', undefined, ALL), 'files');
      assert.equal(getContentFileOwner('images/a.png', undefined, ALL), 'images');
      assert.equal(getContentFileOwner('files/a.mp4', undefined, ['media', 'files']), 'files');
    });

    it('strips the base directory first', function () {
      assert.equal(getContentFileOwner('export/content/files/a.png', 'export', ALL), 'files');
      assert.equal(getContentFileOwner('export/files/a.png', 'export', ALL), 'files');
    });

    it('gives other files to the first claimant', function () {
      assert.equal(getContentFileOwner('a.png', undefined, ALL), 'images');
      assert.equal(getContentFileOwner('content/a.png', undefined, ALL), 'images');
      assert.equal(getContentFileOwner('other/a.mp4', undefined, ['media', 'files']), 'media');
      assert.equal(getContentFileOwner('content/a.pdf', undefined, ['files']), 'files');
    });

    it('falls back when the type folder does not claim the file', function () {
      assert.equal(getContentFileOwner('content/images/a.pdf', undefined, ['files']), 'files');
      assert.equal(
        getContentFileOwner('content/media/a.png', undefined, ['images', 'files']),
        'images',
      );
    });

    it('does not import theme files', function () {
      assert.equal(
        getContentFileOwner('content/themes/casper/assets/a.png', undefined, ALL),
        undefined,
      );
      assert.equal(
        getContentFileOwner('export/content/themes/casper/a.css', 'export', ['files']),
        undefined,
      );
    });

    it('does not treat a root file named like a folder as in that folder', function () {
      assert.equal(getContentFileOwner('files', undefined, ALL), 'images');
    });
  });

  describe('routeContentFiles', function () {
    it('leaves each file with one handler', function () {
      const image = { name: 'content/images/a.png' };
      const video = { name: 'content/media/a.mp4' };
      const pdf = { name: 'content/files/a.pdf' };
      const pngFile = { name: 'content/files/b.png' };
      const theme = { name: 'content/themes/casper/assets/c.png' };

      const routed = routeContentFiles(
        [
          { type: 'images', files: [image, pngFile, theme] },
          { type: 'media', files: [video] },
          { type: 'files', files: [image, video, pdf, pngFile, theme] },
        ],
        undefined,
      );

      assert.deepEqual(routed, [
        { type: 'images', files: [image] },
        { type: 'media', files: [video] },
        { type: 'files', files: [pdf, pngFile] },
      ]);
    });
  });

  describe('ImportManager zip routing', function () {
    let directory: string;

    beforeEach(async function () {
      directory = await fs.mkdtemp(path.join(os.tmpdir(), 'importer-routing-'));
    });

    afterEach(async function () {
      sinon.restore();
      await fs.remove(directory);
    });

    it('sends each content file in a site export to its own handler', async function () {
      const entries = [
        'content/images/2026/11/a.png',
        'content/media/2026/11/a.mp4',
        'content/files/2026/11/a.pdf',
        'content/themes/casper/assets/b.png',
      ];
      for (const entry of entries) {
        await fs.outputFile(path.join(directory, entry), '');
      }

      const manager = importer.init({ jobsService: { dispatch() {} } });
      const loaded: Record<string, string[]> = {};
      for (const handler of manager.handlers) {
        sinon.stub(handler, 'loadFile').callsFake(async (files: { name: string }[]) => {
          loaded[handler.type] = files.map((file) => file.name).sort();
          return files;
        });
      }

      await manager.readExtractedZip(directory);

      assert.deepEqual(loaded.images, ['content/images/2026/11/a.png']);
      assert.deepEqual(loaded.media, ['content/media/2026/11/a.mp4']);
      assert.deepEqual(loaded.files, ['content/files/2026/11/a.pdf']);
    });
  });
});
