import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const GHOST_ROOT = path.resolve(__dirname, '../../..');
const MANIFEST_PATH = path.join(GHOST_ROOT, 'core/server/web/query-parameter-policy/policy.json');

describe('Script: export-query-parameter-policy', function () {
  it('exports the validated canonical policy deterministically', async function () {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'ghost-query-parameter-policy-'));
    const outputPath = path.join(outputDirectory, 'query-parameter-policy.json');

    try {
      await execFileAsync('pnpm', ['query-parameter-policy:export', '--output', outputPath], {
        cwd: GHOST_ROOT,
      });

      assert.deepEqual(
        JSON.parse(await readFile(outputPath, 'utf8')),
        JSON.parse(await readFile(MANIFEST_PATH, 'utf8')),
      );
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });
});
