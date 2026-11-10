// @vitest-environment node
import { existsSync } from 'node:fs';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createKeys, readBackendKey } from '../src/tooling/index.ts';
import { provideDevBackendKey } from '../src/vite/dev-vars.ts';
import { makeProject } from './helpers.ts';

let root: string;
let cleanup: () => Promise<void>;
let line: string;

beforeEach(async () => {
  ({ root, cleanup } = await makeProject({ 'wrangler.jsonc': '{}' }));
  await createKeys({ root, mode: 'development' });
  const key = await readBackendKey({ root, mode: 'development' });
  line = `GHOST_APP_BACKEND_KEY='${JSON.stringify(key)}'\n`;
});

afterEach(() => cleanup());

const devVars = () => join(root, '.dev.vars');

describe('provideDevBackendKey', () => {
  it('does nothing outside a Workers project', async () => {
    await rm(join(root, 'wrangler.jsonc'));
    expect(await provideDevBackendKey(root)).toBeUndefined();
    expect(existsSync(devVars())).toBe(false);
  });

  it('creates .dev.vars with the key, for the owner only, once', async () => {
    expect(await provideDevBackendKey(root)).toEqual({
      level: 'info',
      message: 'Added GHOST_APP_BACKEND_KEY to .dev.vars, with the development backend key',
    });
    expect(await readFile(devVars(), 'utf8')).toBe(line);
    expect((await stat(devVars())).mode & 0o777).toBe(0o600);
    expect(await provideDevBackendKey(root)).toBeUndefined();
    expect(await readFile(devVars(), 'utf8')).toBe(line);
  });

  it('adds the key on a line of its own to an existing .dev.vars', async () => {
    await writeFile(devVars(), 'OTHER=1');
    await provideDevBackendKey(root);
    expect(await readFile(devVars(), 'utf8')).toBe(`OTHER=1\n${line}`);
  });

  it('leaves another key that is there as it is, and says so', async () => {
    await writeFile(devVars(), 'GHOST_APP_BACKEND_KEY=mine\n');
    expect(await provideDevBackendKey(root)).toMatchObject({
      level: 'warn',
      message: expect.stringContaining(
        ".dev.vars has a GHOST_APP_BACKEND_KEY that isn't the key in .ghost-app/development/backend.json",
      ),
    });
    expect(await readFile(devVars(), 'utf8')).toBe('GHOST_APP_BACKEND_KEY=mine\n');
  });

  it.each(['.env', '.env.local'])(
    'asks for the key in .env.local when there is a %s, which Wrangler reads only without .dev.vars',
    async (file) => {
      await writeFile(join(root, file), 'OTHER=1\n');
      expect(await provideDevBackendKey(root)).toMatchObject({
        level: 'warn',
        message: expect.stringContaining(`Wrangler reads ${file} when there's no .dev.vars`),
      });
      expect(existsSync(devVars())).toBe(false);

      await writeFile(join(root, file), line);
      expect(await provideDevBackendKey(root)).toBeUndefined();
      expect(existsSync(devVars())).toBe(false);
    },
  );

  it('goes by .env.local over .env, as Wrangler does', async () => {
    await writeFile(join(root, '.env'), 'GHOST_APP_BACKEND_KEY=another\n');
    await writeFile(join(root, '.env.local'), line);
    expect(await provideDevBackendKey(root)).toBeUndefined();
  });
});
