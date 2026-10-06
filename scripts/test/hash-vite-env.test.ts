import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { hashViteEnv } from '../hash-vite-env.ts';

describe('Vite dotenv cache input', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'vite-env-hash-'));
  });
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('invalidates when a mode-specific local file is added, changed or removed', () => {
    const initial = hashViteEnv(directory);
    const file = join(directory, '.env.test.local');
    writeFileSync(file, 'VITE_TEST=true\n');
    const added = hashViteEnv(directory);
    assert.notEqual(added, initial);
    assert.match(added, /^[a-f0-9]{64}$/);
    writeFileSync(file, 'VITE_TEST=false\n');
    assert.notEqual(hashViteEnv(directory), added);
    rmSync(file);
    assert.equal(hashViteEnv(directory), initial);
  });

  it('includes standard and custom-mode filenames as well as their contents', () => {
    let previous = hashViteEnv(directory);
    for (const name of ['.env', '.env.local', '.env.test', '.env.preview.local']) {
      writeFileSync(join(directory, name), 'VITE_TEST=true\n');
      const next = hashViteEnv(directory);
      assert.notEqual(next, previous, name);
      previous = next;
    }
    renameSync(join(directory, '.env.preview.local'), join(directory, '.env.other.local'));
    assert.notEqual(hashViteEnv(directory), previous);
  });

  it('follows symlinked dotenv files and ignores unrelated files and directories', () => {
    const initial = hashViteEnv(directory);
    const target = join(directory, 'local-values');
    writeFileSync(target, 'VITE_TEST=true\n');
    mkdirSync(join(directory, '.env.directory'));
    symlinkSync(join(directory, 'missing'), join(directory, '.env.broken'));
    assert.equal(hashViteEnv(directory), initial);
    symlinkSync(target, join(directory, '.env.test.local'));
    const linked = hashViteEnv(directory);
    assert.notEqual(linked, initial);
    writeFileSync(target, 'VITE_TEST=false\n');
    assert.notEqual(hashViteEnv(directory), linked);
  });
});
