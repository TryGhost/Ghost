import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { queryParameterPolicy } from '../../../../core/server/web/query-parameter-policy';
import { validateQueryParameterPolicy } from '../../../../core/server/web/query-parameter-policy/schema';

const execFileAsync = promisify(execFile);

const validPolicy = () => ({
  schemaVersion: 1,
  public: [{ name: 'gift', reason: 'Gift-link unlock token' }],
  contentApi: [{ name: 'filter', reason: 'Filters resources using NQL' }],
});

describe('Query parameter policy', function () {
  it('loads the canonical policy', function () {
    assert.equal(queryParameterPolicy.schemaVersion, 1);
    assert.ok(queryParameterPolicy.public.length > 0);
    assert.ok(queryParameterPolicy.contentApi.length > 0);
  });

  it('returns a normalized policy', function () {
    const policy = validateQueryParameterPolicy({
      ...validPolicy(),
      ignored: true,
      public: [{ name: 'gift', reason: 'Gift-link unlock token', ignored: true }],
    });

    assert.deepEqual(policy, validPolicy());
  });

  it.each([
    ['a non-object policy', null, /expected object/],
    [
      'an unsupported schema version',
      { ...validPolicy(), schemaVersion: 2 },
      /Unsupported schema version/,
    ],
    ['a non-array public list', { ...validPolicy(), public: {} }, /expected array/],
    ['a non-array Content API list', { ...validPolicy(), contentApi: {} }, /expected array/],
    [
      'an empty parameter name',
      { ...validPolicy(), public: [{ name: '', reason: 'Empty' }] },
      /Parameter names must be nonempty/,
    ],
    [
      'an invalid parameter name',
      { ...validPolicy(), public: [{ name: 'not valid&', reason: 'Invalid' }] },
      /must only contain letters, underscores, and hyphens/,
    ],
    [
      'an empty reason',
      { ...validPolicy(), public: [{ name: 'gift', reason: '   ' }] },
      /Parameter reasons must be nonempty/,
    ],
    [
      'a duplicate public name',
      { ...validPolicy(), public: Array(2).fill({ name: 'gift', reason: 'Gift link' }) },
      /Duplicate parameter name.*gift/,
    ],
    [
      'a duplicate Content API name',
      { ...validPolicy(), contentApi: Array(2).fill({ name: 'filter', reason: 'Filtering' }) },
      /Duplicate parameter name.*filter/,
    ],
  ])('rejects %s', function (_description, policy, error) {
    assert.throws(() => validateQueryParameterPolicy(policy), error);
  });

  it('allows the same name in both lists', function () {
    const sharedEntry = { name: 'filter', reason: 'Filters resources' };
    const policy = validateQueryParameterPolicy({
      schemaVersion: 1,
      public: [sharedEntry],
      contentApi: [sharedEntry],
    });

    assert.equal(policy.public[0].name, 'filter');
    assert.equal(policy.contentApi[0].name, 'filter');
  });

  it('exports the validated canonical policy deterministically', async function () {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'ghost-query-parameter-policy-'));
    const scriptPath = path.resolve(
      __dirname,
      '../../../../scripts/export-query-parameter-policy.ts',
    );
    const manifestPath = path.resolve(
      __dirname,
      '../../../../core/server/web/query-parameter-policy/policy.json',
    );
    const outputPath = path.join(outputDirectory, 'query-parameter-policy.json');

    try {
      const { stderr } = await execFileAsync(process.execPath, [
        '--import=tsx',
        scriptPath,
        '--output',
        outputPath,
      ]);

      assert.equal(stderr, '');
      assert.deepEqual(
        JSON.parse(await readFile(outputPath, 'utf8')),
        JSON.parse(await readFile(manifestPath, 'utf8')),
      );
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });
});
