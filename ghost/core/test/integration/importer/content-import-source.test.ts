import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { prepareAssetBatch } from '../../../core/server/services/content-import/import/assets';
import {
  isDataFile,
  prepareImportSource,
} from '../../../core/server/services/content-import/import/source';

const { compress } = require('@tryghost/zip');

describe('content import source', function () {
  let directory: string;

  beforeEach(async function () {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'content-import-source-'));
  });

  afterEach(async function () {
    await fs.remove(directory);
  });

  async function archive(files: Record<string, string>, name = 'posts.zip'): Promise<string> {
    const contents = path.join(directory, 'contents');
    await fs.ensureDir(contents);
    for (const [fileName, value] of Object.entries(files)) {
      const filePath = path.join(contents, fileName);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, value);
    }
    const zipPath = path.join(directory, name);
    await compress(contents, zipPath);
    return zipPath;
  }

  it('leaves a raw CSV path unchanged', async function () {
    const filePath = path.join(directory, 'posts.csv');
    await fs.writeFile(filePath, 'title\nRaw');

    const source = await prepareImportSource({ filePath, fileName: 'posts.csv' });

    assert.equal(source.filePath, filePath);
    await source.cleanup();
    assert.equal(await fs.pathExists(filePath), true);
  });

  it('classifies only root and single-wrapper import data files', function () {
    assert.equal(isDataFile('posts.csv'), true);
    assert.equal(isDataFile('export/posts.JSON'), true);
    assert.equal(isDataFile('export/posts.markdown'), true);
    assert.equal(isDataFile(''), false);
    assert.equal(isDataFile('readme.txt'), false);
    assert.equal(isDataFile('__MACOSX/posts.csv'), false);
    assert.equal(isDataFile('export/._posts.csv'), false);
    assert.equal(isDataFile('export/data/posts.csv'), false);
    assert.equal(isDataFile('content/files/attachment.csv'), false);
  });

  it('ignores a supported asset group when no importer owns it', async function () {
    let loadCalls = 0;
    const batch = await prepareAssetBatch(
      {
        getFiles: () => [
          { name: 'content/images/photo.jpg', path: '/tmp/content/images/photo.jpg' },
        ],
      },
      '/tmp',
      undefined,
      {
        handlers: [
          {
            type: 'images',
            extensions: ['.jpg'],
            loadFile: async () => {
              loadCalls += 1;
              return [];
            },
          },
        ],
        importers: [],
      },
    );

    assert.equal(batch, undefined);
    assert.equal(loadCalls, 0);
  });

  it('extracts one case-insensitive root CSV and cleans up its directory', async function () {
    const zipPath = await archive({ 'posts.CSV': 'title\nRoot' });

    const source = await prepareImportSource({ filePath: zipPath, fileName: 'posts.ZIP' });

    assert.equal(await fs.readFile(source.filePath, 'utf8'), 'title\nRoot');
    const extractedDirectory = path.dirname(source.filePath);
    await source.cleanup();
    await source.cleanup();
    assert.equal(await fs.pathExists(extractedDirectory), false, 'cleanup is idempotent');
  });

  it('extracts a wrapped CSV and prepares wrapped image, media, and file assets', async function () {
    const zipPath = await archive({
      'export/posts.csv': 'title\nWrapped',
      'export/content/images/photo.jpg': 'image',
      'export/content/media/movie.mp4': 'media',
      'export/content/files/attachment.csv': 'download,only',
      'export/content/files/attachment.json': '{"download":true}',
      'export/content/files/attachment.md': '# Download',
      '.DS_Store': 'metadata',
    });

    const source = await prepareImportSource({ filePath: zipPath, fileName: 'posts.zip' });

    assert.equal(await fs.readFile(source.filePath, 'utf8'), 'title\nWrapped');
    assert.deepEqual(source.assets?.files.map((file) => file.originalPath).sort(), [
      'content/files/attachment.csv',
      'content/files/attachment.json',
      'content/files/attachment.md',
      'content/images/photo.jpg',
      'content/media/movie.mp4',
    ]);
    assert.deepEqual(source.assets?.files.map((file) => file.newPath).sort(), [
      '/content/files/attachment.csv',
      '/content/files/attachment.json',
      '/content/files/attachment.md',
      '/content/images/photo.jpg',
      '/content/media/movie.mp4',
    ]);
    await source.cleanup();
  });

  it('prepares assets from the existing top-level directory form', async function () {
    const zipPath = await archive({
      'posts.csv': 'title\nTop level',
      'images/photo.jpg': 'image',
      'media/movie.mp4': 'media',
      'files/guide.pdf': 'file',
    });

    const source = await prepareImportSource({ filePath: zipPath, fileName: 'posts.zip' });

    assert.deepEqual(source.assets?.files.map((file) => file.originalPath).sort(), [
      'files/guide.pdf',
      'images/photo.jpg',
      'media/movie.mp4',
    ]);
    assert.deepEqual(source.assets?.files.map((file) => file.newPath).sort(), [
      '/content/files/guide.pdf',
      '/content/images/photo.jpg',
      '/content/media/movie.mp4',
    ]);
    await source.cleanup();
  });

  it('allows an import-data directory name as the wrapper directory', async function () {
    const zipPath = await archive({ 'content/posts.csv': 'title\nWrapped' });

    const source = await prepareImportSource({ filePath: zipPath, fileName: 'posts.zip' });

    assert.equal(await fs.readFile(source.filePath, 'utf8'), 'title\nWrapped');
    await source.cleanup();
  });

  it('ignores macOS metadata CSV entries', async function () {
    const zipPath = await archive({
      'posts.csv': 'title\nPost',
      '__MACOSX/._posts.csv': 'metadata',
    });

    const source = await prepareImportSource({ filePath: zipPath, fileName: 'posts.zip' });

    assert.equal(await fs.readFile(source.filePath, 'utf8'), 'title\nPost');
    await source.cleanup();
  });

  it('rejects ZIPs without a data CSV and removes extracted files', async function () {
    const zipPath = await archive({
      'ghost-import.json': '{}',
      'content/files/attachment.csv': 'download,only',
    });

    await assert.rejects(
      prepareImportSource({ filePath: zipPath, fileName: 'posts.zip' }),
      /must contain one CSV file/,
    );
  });

  it('rejects multiple data CSVs', async function () {
    const zipPath = await archive({
      'one.csv': 'title\nOne',
      'two.csv': 'title\nTwo',
    });

    await assert.rejects(
      prepareImportSource({ filePath: zipPath, fileName: 'posts.zip' }),
      /only one CSV file/,
    );
  });

  it('rejects a CSV nested more deeply than one wrapper directory', async function () {
    const zipPath = await archive({ 'export/data/posts.csv': 'title\nNested' });

    await assert.rejects(
      prepareImportSource({ filePath: zipPath, fileName: 'posts.zip' }),
      /Invalid zip file structure/i,
    );
  });

  it('rejects content split between the root and a wrapper directory', async function () {
    const zipPath = await archive({
      'export/posts.csv': 'title\nWrapped',
      'content/files/attachment.csv': 'download,only',
    });

    await assert.rejects(
      prepareImportSource({ filePath: zipPath, fileName: 'posts.zip' }),
      /Invalid ZIP file structure/,
    );
  });

  it('rejects a data CSV mixed with JSON or Markdown data', async function () {
    for (const competingName of [
      'posts.json',
      'posts.md',
      'posts.markdown',
      'export/2024/ghost.json',
      'export/2024/posts.md',
    ]) {
      const archiveName = `${competingName.replaceAll('/', '-')}.zip`;
      const zipPath = await archive(
        {
          'posts.csv': 'title\nPost',
          [competingName]: 'competing import',
        },
        archiveName,
      );

      await assert.rejects(
        prepareImportSource({ filePath: zipPath, fileName: archiveName }),
        /cannot contain CSV, JSON, or Markdown import files together/,
      );
      await fs.remove(path.join(directory, 'contents'));
    }
  });

  it('rejects unsupported source extensions', async function () {
    await assert.rejects(
      prepareImportSource({ filePath: '/tmp/posts.json', fileName: 'posts.json' }),
      /valid CSV or ZIP file/,
    );
  });
});
