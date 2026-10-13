import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { Minifier } from '../../../../../core/frontend/services/assets-minification/minifier';

const expectedFixturePath = (file: string): string =>
  path.join(__dirname, 'fixtures', 'basic-cards', 'css', file);

describe('Minifier', function () {
  let minifier: Minifier;
  let testDir: string;

  beforeAll(async function () {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minifier-tests-'));

    minifier = new Minifier({
      src: path.join(__dirname, 'fixtures', 'basic-cards'),
      dest: testDir,
    });
  });

  afterAll(async function () {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('getMatchingFiles expands globs correctly', function () {
    it('star glob e.g. css/*.css', async function () {
      const result = await minifier.getMatchingFiles('css/*.css');

      assert.deepEqual(result, [
        expectedFixturePath('bookmark.css'),
        expectedFixturePath('empty.css'),
        expectedFixturePath('gallery.css'),
      ]);
    });

    it('match glob range e.g. css/bookmark.css and css/empty.css (css/@(bookmark|empty).css)', async function () {
      const result = await minifier.getMatchingFiles('css/@(bookmark|empty).css');

      assert.deepEqual(result, [
        expectedFixturePath('bookmark.css'),
        expectedFixturePath('empty.css'),
      ]);
    });

    it('reverse match glob e.g. css/!(bookmark).css', async function () {
      const result = await minifier.getMatchingFiles('css/!(bookmark).css');

      assert.deepEqual(result, [
        expectedFixturePath('empty.css'),
        expectedFixturePath('gallery.css'),
      ]);
    });

    it('reverse match glob e.g. css/!(bookmark|gallery).css', async function () {
      const result = await minifier.getMatchingFiles('css/!(bookmark|gallery).css');

      assert.deepEqual(result, [expectedFixturePath('empty.css')]);
    });

    it('returns no files for a missing folder', async function () {
      const result = await minifier.getMatchingFiles('ts/*.ts');

      assert.deepEqual(result, []);
    });
  });

  describe('Minify', function () {
    it('single type, single file', async function () {
      const result = await minifier.minify({
        'card.min.js': 'js/*.js',
      });

      assert.deepEqual(result, ['card.min.js']);
    });

    it('single type, multi file', async function () {
      const result = await minifier.minify({
        'card.min.css': 'css/*.css',
      });

      assert.deepEqual(result, ['card.min.css']);
    });

    it('both css and js types + multiple files', async function () {
      const result = await minifier.minify({
        'card.min.js': 'js/*.js',
        'card.min.css': 'css/*.css',
      });

      assert.deepEqual(result, ['card.min.js', 'card.min.css']);
    });

    it('can replace the content', async function () {
      const result = await minifier.minify(
        {
          'card.min.js': 'js/*.js',
        },
        {
          replacements: {
            '.kg-gallery-image': 'randomword',
          },
        },
      );
      assert.deepEqual(result, ['card.min.js']);

      const outputPath = minifier.getFullDest(result[0]);
      const content = await fs.readFile(outputPath, { encoding: 'utf8' });
      assert.match(content, /randomword/);
    });
  });

  describe('Bad inputs', function () {
    it('cannot create a minifier without src and dest', function () {
      assert.throws(function noObject() {
        new Minifier();
      });

      assert.throws(function emptyObject() {
        new Minifier({});
      });

      assert.throws(function missingSrc() {
        new Minifier({ dest: 'a' });
      });

      assert.throws(function missingDest() {
        new Minifier({ src: 'a' });
      });
    });

    it('can only handle css and js files', async function () {
      await assert.rejects(
        minifier.minify({
          'card.min.ts': 'js/*.ts',
        }),
        { errorType: 'IncorrectUsageError', message: /Unexpected destination/ },
      );
    });

    it('errors on a missing folder', async function () {
      await assert.rejects(
        minifier.minify({
          'card.min.js': 'ts/*.ts',
        }),
        { errorType: 'IncorrectUsageError', message: /Unable to read/ },
      );
    });

    it('errors on a missing file', async function () {
      await assert.rejects(
        minifier.minify({
          'card.min.js': 'js/fake.js',
        }),
        { errorType: 'IncorrectUsageError', message: /Unable to read/ },
      );
    });

    it('can minify empty js correctly to no result', async function () {
      const result = await minifier.minify({
        'card.min.js': 'js/empty.js',
      });

      assert.deepEqual(result, []);
    });

    it('can minify empty css correctly to no result', async function () {
      const result = await minifier.minify({
        'card.min.css': 'css/empty.css',
      });

      assert.deepEqual(result, []);
    });
  });
});
