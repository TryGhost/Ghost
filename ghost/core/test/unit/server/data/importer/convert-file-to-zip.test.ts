import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, it } from 'vitest';

const { extract } = require('@tryghost/zip');
const {
  convertFileToZip,
  STANDALONE_UPLOAD_DIRECTORY,
} = require('../../../../../core/server/data/importer/convert-file-to-zip');

describe('convertFileToZip', function () {
  let directory: string;

  beforeEach(async function () {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'convert-file-to-zip-test-'));
  });

  afterEach(async function () {
    await fs.remove(directory);
  });

  it('wraps the file in the marker directory, keeping its name and contents', async function () {
    const name = 'draft-2014-12-19-title.md';
    const source = path.join(directory, name);
    await fs.writeFile(source, 'body');
    const target = path.join(directory, 'upload.zip');

    await convertFileToZip({ name, path: source }, target);

    const extracted = path.join(directory, 'extracted');
    await extract(target, extracted);
    assert.deepEqual(await fs.readdir(extracted), [STANDALONE_UPLOAD_DIRECTORY]);
    const wrapped = path.join(extracted, STANDALONE_UPLOAD_DIRECTORY, name);
    assert.equal(await fs.readFile(wrapped, 'utf8'), 'body');
  });

  it('rejects when the file cannot be read instead of leaving the archive open', async function () {
    const target = path.join(directory, 'upload.zip');

    await assert.rejects(
      convertFileToZip(
        { name: 'missing.json', path: path.join(directory, 'missing.json') },
        target,
      ),
      /ENOENT/,
    );
  });
});
