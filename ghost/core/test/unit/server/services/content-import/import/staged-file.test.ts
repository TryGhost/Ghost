import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { createImportFileStager } from '../../../../../../core/server/services/content-import/import/staged-file';

describe('content import staged file', function () {
  let sourceDirectory: string;
  let sourcePath: string;
  const stagedPaths: string[] = [];

  beforeEach(async function () {
    sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'content-import-stager-test-'));
    sourcePath = path.join(sourceDirectory, 'upload');
    await fs.writeFile(sourcePath, 'title\nA staged post\n');
  });

  afterEach(async function () {
    sinon.restore();
    await Promise.all(stagedPaths.map((stagedPath) => fs.remove(stagedPath)));
    stagedPaths.length = 0;
    await fs.remove(sourceDirectory);
  });

  it('copies uploads to unique private files and removes them idempotently', async function () {
    const stager = createImportFileStager();
    const first = await stager.stage({ filePath: sourcePath, fileName: 'posts.csv' });
    const second = await stager.stage({ filePath: sourcePath, fileName: 'posts.csv' });
    stagedPaths.push(first.path, second.path);

    assert.notEqual(first.path, second.path);
    assert.equal(first.name, 'posts.csv');
    assert.equal(await fs.readFile(first.path, 'utf8'), 'title\nA staged post\n');
    assert.equal((await fs.stat(first.path)).mode & 0o777, 0o600);

    await stager.remove(first);
    await stager.remove(first);
    assert.equal(await fs.pathExists(first.path), false);
  });

  it('removes a partial staged file when securing it fails', async function () {
    const stager = createImportFileStager();
    const remove = sinon.spy(fs, 'remove');
    sinon.stub(fs, 'chmod').rejects(new Error('chmod failed'));

    await assert.rejects(
      stager.stage({ filePath: sourcePath, fileName: 'posts.csv' }),
      /chmod failed/,
    );

    sinon.assert.calledOnce(remove);
    assert.equal(await fs.pathExists(remove.firstCall.args[0]), false);
  });
});
