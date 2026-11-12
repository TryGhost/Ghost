import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error This module lacks type definitions.
import JSONHandler from '../../../../../../core/server/data/importer/handlers/json';

describe('JSONHandler', function () {
  const exportData = { meta: { version: '6.76.0' }, data: { posts: [] } };
  let tmpDir: string;

  const file = (name: string, content: unknown) => {
    const filePath = path.join(tmpDir, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content));
    return { name, path: filePath };
  };

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-json-import-'));
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('unwraps a db export', async function () {
    const result = await JSONHandler.loadFile([file('export.json', { db: [exportData] })]);

    assert.deepEqual(result, exportData);
  });

  it('picks the Ghost export out of a site export zip', async function () {
    const result = await JSONHandler.loadFile([
      file('content/themes/source/package.json', { name: 'source', version: '1.0.0' }),
      file('content/themes/source/locales/en.json', { Hi: 'Hi' }),
      file('content/data/redirects.json', [{ from: '/a', to: '/b' }]),
      file('content/files/broken.json', '{'),
      file('export.json', { db: [exportData] }),
    ]);

    assert.deepEqual(result, exportData);
  });

  it('skips JSON with a meta key but no version', async function () {
    const result = await JSONHandler.loadFile([
      file('metadata.json', { meta: {}, exportId: 'abc' }),
      file('site/export.json', { db: [exportData] }),
    ]);

    assert.deepEqual(result, exportData);
  });

  it('prefers the shallowest Ghost export', async function () {
    const backup = { meta: { version: '5.0.0' }, data: {} };
    const result = await JSONHandler.loadFile([
      file('content/data/backup.json', { db: [backup] }),
      file('export.json', { db: [exportData] }),
    ]);

    assert.deepEqual(result, exportData);
  });

  it('falls back to the shallowest file when none is a Ghost export', async function () {
    const result = await JSONHandler.loadFile([
      file('content/themes/source/package.json', { name: 'source', version: '1.0.0' }),
      file('custom.json', { posts: [], tags: [] }),
    ]);

    assert.deepEqual(result, { posts: [], tags: [] });
  });

  it('rejects invalid JSON', async function () {
    await assert.rejects(JSONHandler.loadFile([file('export.json', 'nope')]), {
      errorType: 'BadRequestError',
    });
  });
});
