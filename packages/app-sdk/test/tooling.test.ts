// @vitest-environment node
import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createKeys,
  generateKey,
  publicKeyOf,
  readBackendKey,
  readSigningKeys,
  signAppManifest,
  signProject,
} from '../src/tooling/index.ts';
import { SOURCE, git, makeProject, readAsGhost } from './helpers.ts';

let root: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ root, cleanup } = await makeProject());
});

afterEach(() => cleanup());

const read = (file: string) => readFile(join(root, file), 'utf8');

describe('createKeys', () => {
  it.each(['development', 'production'] as const)(
    'creates two private keys for %s, that only the owner can read',
    async (mode) => {
      expect(await createKeys({ root, mode })).toEqual({
        created: ['identity', 'backend'],
        kept: [],
      });
      const identity = JSON.parse(await read(`.ghost-app/${mode}/identity.json`));
      const backend = JSON.parse(await read(`.ghost-app/${mode}/backend.json`));
      for (const key of [identity, backend]) {
        expect(Object.keys(key)).toEqual(['kty', 'crv', 'x', 'd']);
        expect(key).toMatchObject({ kty: 'OKP', crv: 'Ed25519' });
      }
      expect(identity.x).not.toBe(backend.x);
      for (const name of ['identity', 'backend']) {
        expect((await stat(join(root, `.ghost-app/${mode}/${name}.json`))).mode & 0o777).toBe(
          0o600,
        );
      }
    },
  );

  it('keeps the development and production keys apart', async () => {
    await createKeys({ root, mode: 'development' });
    await createKeys({ root, mode: 'production' });
    const development = await readSigningKeys({ root, mode: 'development', env: {} });
    const production = await readSigningKeys({ root, mode: 'production', env: {} });
    expect(development.identityKey.x).not.toBe(production.identityKey.x);
    expect(development.backendKey.x).not.toBe(production.backendKey.x);
  });

  it('never replaces a key, creating only the one that is missing', async () => {
    await createKeys({ root, mode: 'development' });
    const identity = await read('.ghost-app/development/identity.json');
    await rm(join(root, '.ghost-app/development/backend.json'));

    expect(await createKeys({ root, mode: 'development' })).toEqual({
      created: ['backend'],
      kept: ['identity'],
    });
    expect(await read('.ghost-app/development/identity.json')).toBe(identity);
    expect(await createKeys({ root, mode: 'development' })).toEqual({
      created: [],
      kept: ['identity', 'backend'],
    });
  });

  describe('in a git repository', () => {
    beforeEach(() => git(root, 'init', '--quiet'));

    it('refuses unless git ignores .ghost-app/', async () => {
      await expect(createKeys({ root, mode: 'development' })).rejects.toThrow(
        "Refusing to write private keys where git could commit them: git doesn't ignore .ghost-app/development/identity.json. Add .ghost-app/ to .gitignore.",
      );
      expect(existsSync(join(root, '.ghost-app'))).toBe(false);
    });

    it('creates keys once git ignores .ghost-app/', async () => {
      await writeFile(join(root, '.gitignore'), '.ghost-app/\n');
      expect((await createKeys({ root, mode: 'production' })).created).toEqual([
        'identity',
        'backend',
      ]);
    });

    it("asks git about a project directory that doesn't exist yet", async () => {
      const project = join(root, 'apps/new');
      await expect(createKeys({ root: project, mode: 'development' })).rejects.toThrow(
        "git doesn't ignore .ghost-app/development/identity.json",
      );
      await writeFile(join(root, '.gitignore'), '.ghost-app/\n');
      expect((await createKeys({ root: project, mode: 'development' })).created).toHaveLength(2);
    });

    it('reads a path outside ASCII as ignored, which git would otherwise quote', async () => {
      await writeFile(join(root, '.gitignore'), '.ghost-app/\n');
      // Not created yet, so git is asked from the repository about `appär-日本/.ghost-app/…`.
      const project = join(root, 'appär-日本');
      expect((await createKeys({ root: project, mode: 'development' })).created).toHaveLength(2);
    });

    it('asks git once for both keys', async () => {
      const bin = join(root, 'bin');
      await mkdir(bin);
      const { stdout } = await git(root, '--exec-path');
      const real = join(stdout.trim(), 'git');
      await writeFile(
        join(bin, 'git'),
        `#!/bin/sh\necho "$1" >> "${join(root, 'calls')}"\nexec "${real}" "$@"\n`,
        { mode: 0o755 },
      );
      await writeFile(join(root, '.gitignore'), '.ghost-app/\nbin/\ncalls\n');
      vi.stubEnv('PATH', `${bin}:${process.env.PATH}`);
      try {
        await createKeys({ root, mode: 'development' });
      } finally {
        vi.unstubAllEnvs();
      }
      expect((await readFile(join(root, 'calls'), 'utf8')).trim().split('\n')).toEqual([
        'rev-parse',
        'check-ignore',
      ]);
    });

    it("refuses when git can't read the repository", async () => {
      await rm(join(root, '.git'), { recursive: true });
      await writeFile(join(root, '.git'), 'nonsense');
      await expect(createKeys({ root, mode: 'development' })).rejects.toThrow(
        "git couldn't read the repository: fatal: invalid gitfile format",
      );
    });

    it("refuses when git isn't installed to check", async () => {
      vi.stubEnv('PATH', root);
      try {
        await expect(createKeys({ root, mode: 'development' })).rejects.toThrow(
          "git isn't installed, so it can't check .ghost-app/development/identity.json and .ghost-app/development/backend.json are ignored",
        );
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('refuses for a key git tracks, even if .gitignore names it', async () => {
      await writeFile(join(root, '.gitignore'), '.ghost-app/\n');
      await createKeys({ root, mode: 'development' });
      await git(root, 'add', '--force', '.ghost-app/development/identity.json');
      await expect(createKeys({ root, mode: 'development' })).rejects.toThrow(
        "git doesn't ignore .ghost-app/development/identity.json",
      );
    });
  });
});

describe('whatever language git speaks', () => {
  // A git that answers only in German, so nothing can depend on what git says.
  async function germanGit(script: string) {
    const bin = join(root, 'bin');
    await mkdir(bin);
    await writeFile(join(bin, 'git'), `#!/bin/sh\n${script}\n`, { mode: 0o755 });
    vi.stubEnv('PATH', `${bin}:${process.env.PATH}`);
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('tells no repository from one git cannot read by its exit code', async () => {
    await germanGit('echo "fatal: Kein Git-Repository" >&2; exit 128');
    expect((await createKeys({ root, mode: 'development' })).created).toHaveLength(2);

    await mkdir(join(root, '.git'));
    await expect(createKeys({ root, mode: 'production' })).rejects.toThrow(
      "git couldn't read the repository: fatal: Kein Git-Repository",
    );
  });

  it('refuses when git fails to check a file', async () => {
    await germanGit(
      'if [ "$1" = rev-parse ]; then echo true; exit 0; fi; echo "fatal: Fehler" >&2; exit 128',
    );
    await expect(createKeys({ root, mode: 'development' })).rejects.toThrow(
      "git couldn't check .ghost-app/development/identity.json and .ghost-app/development/backend.json are ignored: fatal: Fehler",
    );
  });
});

describe('outside a git repository', () => {
  it("creates keys even without git, as there's nothing to commit them", async () => {
    vi.stubEnv('PATH', root);
    try {
      expect((await createKeys({ root, mode: 'development' })).created).toHaveLength(2);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('reports a key it could not write', async () => {
    await mkdir(join(root, '.ghost-app/development'), { recursive: true });
    await chmod(join(root, '.ghost-app/development'), 0o500);
    await expect(createKeys({ root, mode: 'development' })).rejects.toThrow(/EACCES/);
    await chmod(join(root, '.ghost-app/development'), 0o700);
  });
});

describe('readSigningKeys', () => {
  it('says how to create a missing key, and creates none', async () => {
    await expect(readSigningKeys({ root, mode: 'production', env: {} })).rejects.toThrow(
      "There's no production identity key: .ghost-app/production/identity.json doesn't exist. Create one with `ghost-app keys --production`, or set GHOST_APP_IDENTITY_KEY.",
    );
    await expect(readSigningKeys({ root, mode: 'development', env: {} })).rejects.toThrow(
      "There's no development identity key",
    );
    expect(existsSync(join(root, '.ghost-app'))).toBe(false);
  });

  it('reads the production keys from the environment, the backend key as its public half', async () => {
    const identity = generateKey();
    const backend = generateKey();
    const env = {
      GHOST_APP_IDENTITY_KEY: JSON.stringify(identity),
      GHOST_APP_BACKEND_KEY: JSON.stringify(publicKeyOf(backend)),
    };
    expect(await readSigningKeys({ root, mode: 'production', env })).toEqual({
      identityKey: identity,
      backendKey: publicKeyOf(backend),
    });
    // Development keys never come from the environment.
    await expect(readSigningKeys({ root, mode: 'development', env })).rejects.toThrow(
      "There's no development identity key",
    );
  });

  it.each([
    ['not JSON', 'secret'],
    ['a public key', JSON.stringify(publicKeyOf(generateKey()))],
    ['a key whose x is not its d', JSON.stringify({ ...generateKey(), x: generateKey().x })],
    ['another kind of key', JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'x', d: 'd' })],
    ['an Ed25519 key that is not one', JSON.stringify({ ...generateKey(), d: 'short' })],
  ])('refuses an identity key that is %s, without printing it', async (_name, text) => {
    const reading = readSigningKeys({
      root,
      mode: 'production',
      env: { GHOST_APP_IDENTITY_KEY: text },
    });
    await expect(reading).rejects.toThrow(/^GHOST_APP_IDENTITY_KEY /);
    await expect(reading).rejects.not.toThrow(text);
  });

  it.each([5, null, { value: 'x' }])(
    'refuses a backend key whose d is %j, rather than reading it as a public key',
    async (d) => {
      const reading = readSigningKeys({
        root,
        mode: 'production',
        env: {
          GHOST_APP_IDENTITY_KEY: JSON.stringify(generateKey()),
          GHOST_APP_BACKEND_KEY: JSON.stringify({ ...publicKeyOf(generateKey()), d }),
        },
      });
      await expect(reading).rejects.toThrow(
        "GHOST_APP_BACKEND_KEY isn't a usable Ed25519 key: its d isn't a string",
      );
    },
  );

  it('refuses the same key as both', async () => {
    const key = JSON.stringify(generateKey());
    await expect(
      readSigningKeys({
        root,
        mode: 'production',
        env: { GHOST_APP_IDENTITY_KEY: key, GHOST_APP_BACKEND_KEY: key },
      }),
    ).rejects.toThrow('must be two keys');
  });

  it('reports a key file it could not read', async () => {
    await mkdir(join(root, '.ghost-app/development/identity.json'), { recursive: true });
    await expect(readSigningKeys({ root, mode: 'development' })).rejects.toThrow(/EISDIR/);
  });

  it('reads the private backend key for the backend', async () => {
    await createKeys({ root, mode: 'development' });
    expect(await readBackendKey({ root, mode: 'development' })).toEqual(
      JSON.parse(await read('.ghost-app/development/backend.json')),
    );
  });
});

describe('signing', () => {
  const MANIFEST_URL = 'https://hello.example.com/ghost-app.json';

  it("signs a project's ghost-app.json so Ghost reads it back as signed", async () => {
    await createKeys({ root, mode: 'production' });
    const result = await signProject({
      root,
      mode: 'production',
      manifestUrl: MANIFEST_URL,
      env: {},
    });
    if (!result.success) {
      throw new Error(JSON.stringify(result.errors));
    }
    const keys = await readSigningKeys({ root, mode: 'production', env: {} });
    expect(await readAsGhost(result.signed, MANIFEST_URL)).toEqual({
      ...SOURCE,
      author: { ...SOURCE.author, url: 'https://example.com/' },
      surfaces: [{ type: 'admin_page', url: 'https://hello.example.com/' }],
      manifest_url: MANIFEST_URL,
      identity_key: publicKeyOf(keys.identityKey),
      backend_key: keys.backendKey,
      development: false,
    });
    // Nothing private is signed into it.
    expect(JSON.stringify(result.signed)).not.toContain(keys.identityKey.d);
    expect(Buffer.from(result.signed.payload, 'base64url').toString()).not.toMatch(/"d"/);
  });

  it('marks a development manifest as one, as localhost requires', async () => {
    await createKeys({ root, mode: 'development' });
    const manifestUrl = 'http://localhost:5173/ghost-app.json';
    const result = await signProject({ root, mode: 'development', manifestUrl });
    expect(result.success && (await readAsGhost(result.signed, manifestUrl)).development).toBe(
      true,
    );
  });

  it('refuses to sign a production manifest for localhost, as Ghost would refuse it', async () => {
    await createKeys({ root, mode: 'production' });
    const result = await signProject({
      root,
      mode: 'production',
      env: {},
      manifestUrl: 'http://localhost:5173/ghost-app.json',
    });
    expect(result).toEqual({
      success: false,
      code: 'APP_MANIFEST_INVALID',
      errors: [{ path: 'development', message: 'Expected true, as the app is on localhost' }],
    });
  });

  const keys = { identityKey: generateKey(), backendKey: generateKey(), development: false };

  it('lists every problem Ghost would find, by field', async () => {
    const result = await signAppManifest(
      {
        ...SOURCE,
        accent_color: 'orange',
        surfaces: [{ type: 'admin_page', url: 'https://elsewhere.example/' }],
      },
      { manifestUrl: MANIFEST_URL, ...keys },
    );
    expect(result.success).toBe(false);
    expect(!result.success && result.errors.map((error) => error.path)).toEqual([
      'accent_color',
      'surfaces[0].url',
    ]);
  });

  it('refuses a ghost-app.json that sets a field the tooling adds', async () => {
    const result = await signAppManifest(
      { ...SOURCE, manifest_url: MANIFEST_URL, development: false },
      { manifestUrl: MANIFEST_URL, ...keys },
    );
    expect(!result.success && result.errors.map((error) => error.path)).toEqual([
      'manifest_url',
      'development',
    ]);
  });

  it('refuses a manifest that is not an object, or a ghost-app.json that is not JSON', async () => {
    const result = await signAppManifest([SOURCE], { manifestUrl: MANIFEST_URL, ...keys });
    expect(!result.success && result.errors).toEqual([
      { path: '', message: 'Expected the manifest as a JSON object' },
    ]);
    await writeFile(join(root, 'ghost-app.json'), '{ "id": ');
    await expect(
      signProject({ root, mode: 'development', manifestUrl: MANIFEST_URL }),
    ).rejects.toThrow(`${join(root, 'ghost-app.json')} isn't JSON`);
  });

  it('refuses a manifest whose signed form is larger than Ghost fetches, though Ghost would store it', async () => {
    // Ghost trims the name, so what it stores is small, but the payload keeps every space.
    const result = await signAppManifest(
      { ...SOURCE, name: `Hello${' '.repeat(70_000)}` },
      { manifestUrl: MANIFEST_URL, ...keys },
    );
    expect(result).toMatchObject({ success: false, code: 'APP_MANIFEST_TOO_LARGE' });
    expect(!result.success && result.errors[0]?.message).toContain('as Ghost fetches it');
  });

  it('reads a ghost-app.json that starts with a byte order mark, as Ghost reads JSON', async () => {
    await createKeys({ root, mode: 'development' });
    await writeFile(join(root, 'ghost-app.json'), `\uFEFF${JSON.stringify(SOURCE)}`);
    const result = await signProject({
      root,
      mode: 'development',
      manifestUrl: 'http://localhost:5173/ghost-app.json',
    });
    expect(result.success).toBe(true);
  });

  it('reads a manifest from an absolute path, as it is', async () => {
    await createKeys({ root, mode: 'development' });
    const elsewhere = await makeProject();
    try {
      const result = await signProject({
        root,
        mode: 'development',
        manifestUrl: 'http://localhost:5173/ghost-app.json',
        manifestFile: join(elsewhere.root, 'ghost-app.json'),
      });
      expect(result.success).toBe(true);
    } finally {
      await elsewhere.cleanup();
    }
  });

  it('refuses a manifest URL Ghost would refuse', async () => {
    const result = await signAppManifest(SOURCE, {
      manifestUrl: 'ftp://x.example/m.json',
      ...keys,
    });
    expect(!result.success && result.code).toBe('APP_MANIFEST_URL_INVALID');
  });

  it('signs for the manifest URL as Ghost reads it', async () => {
    const result = await signAppManifest(SOURCE, {
      manifestUrl: ' https://Hello.Example.com/ghost-app.json',
      ...keys,
    });
    expect(result.success && result.manifest.manifest_url).toBe(MANIFEST_URL);
  });
});
