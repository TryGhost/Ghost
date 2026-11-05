// @vitest-environment node
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createKeys, generateKey, readBackendKey } from '../src/tooling/index.ts';
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

  // Directory modes don't stop writes on Windows, or for a process that bypasses them (root).
  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'fails on any other reason it cannot create the file',
    async () => {
      await chmod(root, 0o500);
      try {
        await expect(provideDevBackendKey(root)).rejects.toThrow(/EACCES/);
      } finally {
        await chmod(root, 0o700);
      }
    },
  );
});

describe('.dev.vars.<environment>, which Wrangler reads instead with CLOUDFLARE_ENV', () => {
  const staging = () => join(root, '.dev.vars.staging');

  it('asks for the key there, and writes nothing', async () => {
    await writeFile(staging(), 'OTHER=1\n');
    expect(await provideDevBackendKey(root, { cloudflareEnv: 'staging' })).toMatchObject({
      level: 'warn',
      message: expect.stringContaining(
        'Wrangler reads .dev.vars.staging instead of .dev.vars for CLOUDFLARE_ENV=staging, so add GHOST_APP_BACKEND_KEY to it',
      ),
    });
    expect(existsSync(join(root, '.dev.vars'))).toBe(false);
    expect(await readFile(staging(), 'utf8')).toBe('OTHER=1\n');
  });

  it('checks the key it holds', async () => {
    const key = JSON.stringify(await readBackendKey({ root, mode: 'development' }));
    await writeFile(staging(), `GHOST_APP_BACKEND_KEY='${key}'\n`);
    expect(await provideDevBackendKey(root, { cloudflareEnv: 'staging' })).toBeUndefined();

    await writeFile(staging(), `GHOST_APP_BACKEND_KEY='${JSON.stringify(generateKey())}'\n`);
    expect(await provideDevBackendKey(root, { cloudflareEnv: 'staging' })).toMatchObject({
      message: expect.stringContaining(
        '.dev.vars.staging sets GHOST_APP_BACKEND_KEY to another key',
      ),
    });
  });

  it('writes .dev.vars as usual when the environment has no file of its own', async () => {
    expect(await provideDevBackendKey(root, { cloudflareEnv: 'staging' })).toMatchObject({
      level: 'info',
    });
    expect(existsSync(join(root, '.dev.vars'))).toBe(true);
  });
});

describe('the .env files Wrangler reads when there is no .dev.vars', () => {
  it.each([
    ['.env.local', undefined],
    ['.env.staging', 'staging'],
    ['.env.staging.local', 'staging'],
  ])('leaves %s to the developer, telling them git must ignore it', async (file, cloudflareEnv) => {
    await writeFile(join(root, file), 'OTHER=1\n');
    const message = await provideDevBackendKey(root, { cloudflareEnv });
    expect(message).toMatchObject({ level: 'warn' });
    expect(message?.message).toContain(`Wrangler reads ${file} when there's no .dev.vars`);
    expect(message?.message).toContain('Git must ignore the file you put it in.');
    expect(existsSync(join(root, '.dev.vars'))).toBe(false);
  });

  it('checks the key the one Wrangler gives precedence sets', async () => {
    const key = JSON.stringify(await readBackendKey({ root, mode: 'development' }));
    await writeFile(
      join(root, '.env'),
      `GHOST_APP_BACKEND_KEY='${JSON.stringify(generateKey())}'\n`,
    );
    await writeFile(join(root, '.env.staging.local'), `GHOST_APP_BACKEND_KEY='${key}'\n`);
    expect(await provideDevBackendKey(root, { cloudflareEnv: 'staging' })).toBeUndefined();

    await writeFile(
      join(root, '.env.local'),
      `GHOST_APP_BACKEND_KEY='${JSON.stringify(generateKey())}'\n`,
    );
    expect(await provideDevBackendKey(root)).toMatchObject({
      message: expect.stringContaining('.env.local sets GHOST_APP_BACKEND_KEY to another key'),
    });
  });
});
