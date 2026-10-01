import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('workspace package packing excludes generated credentials and Git metadata', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'ghost-pack-security-'));
  try {
    copyFileSync(
      new URL('../../.pnpmfile.mjs', import.meta.url),
      path.join(fixture, '.pnpmfile.mjs'),
    );
    writeFileSync(
      path.join(fixture, 'package.json'),
      JSON.stringify({
        name: 'security-fixture',
        version: '1.0.0',
        files: ['assets'],
        packageManager: 'pnpm@12.7.0',
      }),
    );
    mkdirSync(path.join(fixture, 'assets/.git'), { recursive: true });
    for (const name of [
      'gha-creds-dummy.json',
      'test-credentials.json',
      '.env',
      '.env.local',
      'private.pem',
      'private.key',
      '.git/config',
    ]) {
      writeFileSync(path.join(fixture, 'assets', name), 'DUMMY_ONLY');
    }
    writeFileSync(path.join(fixture, 'assets/public.js'), 'console.log("public");');
    execFileSync('pnpm', ['pack'], { cwd: fixture, stdio: 'pipe' });
    const entries = execFileSync('tar', ['tzf', path.join(fixture, 'security-fixture-1.0.0.tgz')], {
      encoding: 'utf8',
    });
    assert.match(entries, /assets\/public.js/);
    assert.doesNotMatch(entries, /gha-creds|credentials|\.git\/|\.env|private\.(pem|key)/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
