// @vitest-environment node
import { chmod, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createKeys, readBackendKey } from '../src/tooling/index.ts';
import { provideDevBackendKey } from '../src/vite/dev-vars.ts';
import { makeProject } from './helpers.ts';

let root: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ root, cleanup } = await makeProject({ 'wrangler.jsonc': '{}' }));
  await createKeys({ root, mode: 'development' });
});

afterEach(() => cleanup());

describe('.dev.vars', () => {
  it('adds the key once when two dev servers start together', async () => {
    const results = await Promise.all([provideDevBackendKey(root), provideDevBackendKey(root)]);
    const key = JSON.stringify(await readBackendKey({ root, mode: 'development' }));
    expect(await readFile(join(root, '.dev.vars'), 'utf8')).toBe(
      `GHOST_APP_BACKEND_KEY='${key}'\n`,
    );
    // One added it, and the other found it there.
    expect(results.filter((result) => result?.level === 'info')).toHaveLength(1);
    expect(results).toContain(undefined);
  });

  it('fails on any other reason it cannot create the file', async () => {
    await chmod(root, 0o500);
    try {
      await expect(provideDevBackendKey(root)).rejects.toThrow(/EACCES/);
    } finally {
      await chmod(root, 0o700);
    }
  });
});
