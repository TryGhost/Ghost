import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readPostRows from '../../../../../../core/server/services/content-import/import/reader';

describe('content import reader', function () {
  let directory: string;

  beforeEach(async function () {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'content-import-reader-'));
  });

  afterEach(async function () {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('maps arbitrary headers and drops explicitly ignored columns', async function () {
    const file = path.join(directory, 'posts.csv');
    await fs.writeFile(file, 'Headline,Body,Ignore me\nHello,<p>World</p>,unused\n');

    const result = await readPostRows(file, {
      Headline: 'title',
      Body: 'html',
      'Ignore me': '',
    });

    assert.deepEqual(result.columns, ['Headline', 'Body', 'Ignore me']);
    assert.deepEqual(result.rows[0].data, {
      title: 'Hello',
      html: '<p>World</p>',
      markdown: '',
    });
    assert.deepEqual(
      { ...result.rows[0].source },
      {
        Headline: 'Hello',
        Body: '<p>World</p>',
        'Ignore me': 'unused',
      },
    );
  });

  it('keeps the existing identity headers when no mapping is supplied', async function () {
    const file = path.join(directory, 'posts.csv');
    await fs.writeFile(file, 'title,html,published_at\nHello,<p>World</p>,2025-01-01\n');

    const result = await readPostRows(file);

    assert.deepEqual(
      result.rows.map(({ data }) => data),
      [{ title: 'Hello', html: '<p>World</p>', markdown: '', published_at: '2025-01-01' }],
    );
  });

  it('preserves spreadsheet line numbers after ignored empty rows', async function () {
    const file = path.join(directory, 'posts-with-empty-row.csv');
    await fs.writeFile(
      file,
      'title,html\nBefore blank,<p>First</p>\n\nAfter blank,<p>Second</p>\n',
    );

    const result = await readPostRows(file);

    assert.deepEqual(
      result.rows.map(({ line }) => line),
      [2, 4],
    );
  });

  it('keeps full editorial identity headers for direct API clients', async function () {
    const file = path.join(directory, 'full-post.csv');
    await fs.writeFile(
      file,
      'title,slug,featured,meta_title,comment_id,authors,author_emails,tags\nHello,custom,1,Search title,source-123,"Alice, Bob","alice@example.com, bob@example.com","News, Features"\n',
    );

    const result = await readPostRows(file);

    assert.deepEqual(
      result.rows.map(({ data }) => data),
      [
        {
          title: 'Hello',
          slug: 'custom',
          featured: '1',
          meta_title: 'Search title',
          comment_id: 'source-123',
          authors: 'Alice, Bob',
          author_emails: 'alice@example.com, bob@example.com',
          tags: 'News, Features',
          html: '',
          markdown: '',
        },
      ],
    );
  });
});
