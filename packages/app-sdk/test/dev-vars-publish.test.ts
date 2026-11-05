// @vitest-environment node
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createKeys, readBackendKey } from '../src/tooling/index.ts';
import { provideDevBackendKey } from '../src/vite/dev-vars.ts';
import { makeProject } from './helpers.ts';

// A write that creates its file before the content lands, as a write to a slow disk does, so
// another dev server can find the file in between.
vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>();
  return {
    ...fs,
    writeFile: async (...args: Parameters<typeof fs.writeFile>) => {
      const [path, data, options] = args;
      if (typeof options === 'object' && options?.flag === 'wx') {
        const handle = await fs.open(path as string, 'wx', options.mode);
        try {
          await new Promise((resolve) => {
            setTimeout(resolve, 200);
          });
          return await handle.writeFile(data);
        } finally {
          await handle.close();
        }
      }
      return fs.writeFile(...args);
    },
  };
});

let root: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ root, cleanup } = await makeProject({ 'wrangler.jsonc': '{}' }));
  await createKeys({ root, mode: 'development' });
});

afterEach(() => cleanup());

describe('a new .dev.vars', () => {
  it('is never there for another dev server to read before the key is in it', async () => {
    // The one that loses the race reads what the winner wrote. Finding it empty, it would add
    // a key of its own, and say so.
    const results = await Promise.all([provideDevBackendKey(root), provideDevBackendKey(root)]);
    expect(results.filter((result) => result?.level === 'info')).toHaveLength(1);
    expect(results).toContain(undefined);
    const key = JSON.stringify(await readBackendKey({ root, mode: 'development' }));
    expect(await readFile(join(root, '.dev.vars'), 'utf8')).toBe(
      `GHOST_APP_BACKEND_KEY='${key}'\n`,
    );
    // Nothing is left among the keys but the keys.
    expect((await readdir(join(root, '.ghost-app/development'))).sort()).toEqual([
      'backend.json',
      'identity.json',
    ]);
  });
});
