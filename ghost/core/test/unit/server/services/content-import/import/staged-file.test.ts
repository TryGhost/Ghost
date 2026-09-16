import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import LocalStorageBase from '../../../../../../core/server/adapters/storage/LocalStorageBase';
import { createImportFileStager } from '../../../../../../core/server/services/content-import/import/staged-file';

describe('content import staged file', function () {
  let sourceDirectory: string;
  let sourcePath: string;
  let storagePath: string;
  // Configured the way storage:imports is by default.
  const importsStore = () =>
    new LocalStorageBase({ storagePath, staticFileURLPrefix: 'content/imports' });

  beforeEach(async function () {
    sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'content-import-stager-test-'));
    sourcePath = path.join(sourceDirectory, 'upload');
    await fs.writeFile(sourcePath, 'title\nA staged post\n');
    storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'content-import-store-test-'));
  });

  afterEach(async function () {
    sinon.restore();
    await fs.remove(sourceDirectory);
    await fs.remove(storagePath);
  });

  it('copies uploads to unique files and removes them idempotently', async function () {
    const stager = createImportFileStager(importsStore);
    const first = await stager.stage({ filePath: sourcePath, fileName: 'posts.csv' });
    const second = await stager.stage({ filePath: sourcePath, fileName: 'posts.csv' });

    assert.notEqual(first.path, second.path);
    assert.equal(path.dirname(first.path), storagePath);
    assert.match(path.basename(first.path), /^content-csv-import-[0-9a-f-]{36}$/);
    assert.equal(first.name, 'posts.csv');
    assert.equal(await fs.readFile(first.path, 'utf8'), 'title\nA staged post\n');

    await stager.remove(first);
    await stager.remove(first);
    assert.equal(await fs.pathExists(first.path), false);
    assert.equal(await fs.pathExists(second.path), true);
  });

  it('removes a partial staged file when the copy fails', async function () {
    const stager = createImportFileStager(importsStore);
    sinon.stub(fs, 'copy').callsFake(async (_src: unknown, dest: unknown) => {
      await fs.writeFile(dest as string, 'partial');
      throw new Error('copy failed');
    });

    await assert.rejects(
      stager.stage({ filePath: sourcePath, fileName: 'posts.csv' }),
      /copy failed/,
    );

    assert.deepEqual(await fs.readdir(storagePath), []);
  });
});
