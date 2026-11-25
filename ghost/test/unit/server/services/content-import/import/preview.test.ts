import { importFiles } from '../../../../../utils/csv-import-files';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readCSVPreview } from '../../../../../../core/server/services/content-import/import/preview';

describe('CSV inspection preview', function () {
  let directory: string;
  let file: string;

  beforeEach(async function () {
    directory = await mkdtemp(path.join(os.tmpdir(), 'csv-preview-'));
    file = path.join(directory, 'posts.csv');
  });

  afterEach(async function () {
    await rm(directory, { recursive: true, force: true });
  });

  it('counts all records while retaining only the first 20 samples', async function () {
    await writeFile(
      file,
      'title\n' + Array.from({ length: 1133 }, (_, i) => `Post ${i + 1}`).join('\n'),
    );

    const preview = await readCSVPreview(importFiles.readSource(file));

    assert.deepEqual(preview.columns, ['title']);
    assert.equal(preview.total, 1133);
    assert.equal(preview.rows.length, 20);
    assert.equal(preview.rows[0].title, 'Post 1');
    assert.equal(preview.rows[19].title, 'Post 20');
  });

  it('counts multiline and ragged records once and ignores empty records', async function () {
    await writeFile(
      file,
      '\ufefftitle,html\r\nFirst,"<p>One\r\nTwo</p>"\r\n\r\n,\r\n , \r\nSecond\r\nThird,,extra\r\n',
    );

    const preview = await readCSVPreview(importFiles.readSource(file));

    assert.equal(preview.total, 3);
    assert.equal(preview.rows.length, 3);
    assert.equal(preview.rows[0].html, '<p>One\r\nTwo</p>');
    assert.deepEqual(
      preview.rows.map((row) => ({ ...row })),
      [{ title: 'First', html: '<p>One\r\nTwo</p>' }, { title: 'Second' }, { title: 'Third' }],
    );
  });

  it('keeps counting after the sample byte budget is exhausted', async function () {
    // Each é is two UTF-8 bytes: exceed 256 KiB and check truncation preserves whole characters.
    await writeFile(
      file,
      'title\n' +
        'é'.repeat(150000) +
        '\n' +
        Array.from({ length: 24 }, (_, i) => `Post ${i}`).join('\n'),
    );

    const preview = await readCSVPreview(importFiles.readSource(file));

    assert.equal(preview.total, 25);
    assert.equal(preview.rows.length, 20);
    assert.ok(Buffer.byteLength(preview.rows[0].title) <= 256 * 1024 - 'title'.length);
    assert.doesNotMatch(preview.rows[0].title, /�/);
    assert.deepEqual(Object.keys(preview.rows[19]), []);
  });

  it('skips sample keys that exceed the remaining display budget', async function () {
    await writeFile(file, `${'h'.repeat(256 * 1024)},title,empty\nvalue,Hello,\n`);

    const preview = await readCSVPreview(importFiles.readSource(file));

    assert.equal(preview.total, 1);
    assert.deepEqual({ ...preview.rows[0] }, { title: 'Hello' });
  });

  it.each(['title\n', 'title\n\n   \n'])(
    'rejects files with no non-empty records: %j',
    async function (contents) {
      await writeFile(file, contents);
      await assert.rejects(
        readCSVPreview(importFiles.readSource(file)),
        /File is empty, nothing to import/,
      );
    },
  );

  it('rejects malformed records beyond the sample instead of returning a partial count', async function () {
    await writeFile(
      file,
      'title\n' + Array.from({ length: 20 }, (_, i) => `Post ${i}`).join('\n') + '\n"Unclosed',
    );

    await assert.rejects(
      readCSVPreview(importFiles.readSource(file)),
      /The CSV could not be parsed/,
    );
  });
});
