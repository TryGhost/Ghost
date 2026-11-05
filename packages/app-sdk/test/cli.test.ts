// @vitest-environment node
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync } from 'node:fs';
import { readFile, rename, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { signManifest } from '@tryghost/app-contracts/identity';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CHALLENGE_PATH, handleChallenge } from '../src/backend/index.ts';
import { run } from '../src/cli.ts';
import {
  generateKey,
  publicKeyOf,
  signAppManifest,
  type PrivateKeyJwk,
} from '../src/tooling/index.ts';
import { SOURCE, makeProject, readAsGhost } from './helpers.ts';

/** Runs the CLI, collecting what it prints. */
async function cli(...args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(args, { out: (text) => out.push(text), err: (text) => err.push(text) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
  });
}

/**
 * An app on localhost, as an app's backend would serve it: the signed manifest, and the
 * challenge answered by `handleChallenge`. Each test sets what it serves.
 */
let server: Server;
let origin: string;
let app: {
  manifest: (manifestUrl: string) => Promise<unknown>;
  backendKey: PrivateKeyJwk;
  challengeStatus?: number;
};

beforeAll(async () => {
  server = createServer((req, res) => {
    void (async () => {
      const request = await toRequest(req);
      let response: Response;
      if (req.url === '/ghost-app.json') {
        response = Response.json(await app.manifest(`${origin}/ghost-app.json`));
      } else if (req.url === '/moved.json') {
        response = new Response(null, {
          status: 301,
          headers: { location: 'https://elsewhere.example/ghost-app.json' },
        });
      } else if (req.url === '/utf8.json') {
        // A Location of raw UTF-8 bytes, as a server sends a path outside ASCII unescaped.
        response = new Response(null, {
          status: 301,
          headers: { location: Buffer.from('/ghost-app-ü.json').toString('latin1') },
        });
      } else if (req.url === '/ghost-app-%C3%BC.json') {
        response = Response.json(await app.manifest(`${origin}/utf8.json`));
      } else if (req.url === CHALLENGE_PATH && !app.challengeStatus) {
        response = await handleChallenge(request, { backendKey: app.backendKey });
      } else {
        response = new Response('Not found', { status: app.challengeStatus ?? 404 });
      }
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    })();
  });
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  origin = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(
  () =>
    new Promise((resolve) => {
      server.close(resolve);
    }),
);

const identityKey = generateKey();

/** Serves a manifest signed with `identityKey`, naming `backendKey`. */
function serveSigned(backendKey: PrivateKeyJwk, { signFor }: { signFor?: string } = {}) {
  app = {
    backendKey,
    manifest: async (manifestUrl) => {
      const result = await signAppManifest(SOURCE, {
        manifestUrl: signFor ?? manifestUrl,
        identityKey,
        backendKey,
        development: true,
      });
      if (!result.success) {
        throw new Error(JSON.stringify(result.errors));
      }
      return result.signed;
    },
  };
}

// What `check` finds is checkApp's, and tested with it. These test what the CLI prints.
describe('ghost-app check', () => {
  beforeEach(() => serveSigned(generateKey()));

  it('says so, and exits with 0, for an app Ghost would install', async () => {
    const result = await cli('check', `${origin}/ghost-app.json`);
    expect(result).toMatchObject({ code: 0, err: '' });
    expect(result.out).toContain(`OK: Hello (com.example.hello) at ${origin}/ghost-app.json`);
    expect(result.out).toContain('development build');
  });

  it("prints Ghost's code, its message and what was wrong, and exits with 1", async () => {
    serveSigned(generateKey(), { signFor: 'http://localhost:1/ghost-app.json' });
    const result = await cli('check', `${origin}/ghost-app.json`);
    expect(result).toMatchObject({ code: 1, out: '' });
    expect(result.err).toContain(
      'APP_MANIFEST_URL_MISMATCH: The app’s manifest is for another address.',
    );
    expect(result.err).toContain(`Expected ${origin}/ghost-app.json`);
  });

  it('prints a manifest Ghost would refuse field by field', async () => {
    app.manifest = async (manifestUrl) => {
      const backendKey = generateKey();
      return signManifest(
        {
          ...SOURCE,
          accent_color: 'red',
          manifest_url: manifestUrl,
          identity_key: publicKeyOf(identityKey),
          backend_key: publicKeyOf(backendKey),
          development: true,
        },
        identityKey,
      );
    };
    const result = await cli('check', `${origin}/ghost-app.json`);
    expect(result.code).toBe(1);
    expect(result.err).toContain('accent_color: Expected a hex colour such as #ff5500');
  });
});

describe('ghost-app keys, sign and backend-key', () => {
  let root: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ root, cleanup } = await makeProject());
  });

  afterEach(() => cleanup());

  it('creates keys, signs with them, and prints the backend key only when asked', async () => {
    expect(await cli('keys', '--dir', root)).toMatchObject({ code: 0, out: '' });
    const production = await cli('keys', '--production', '--dir', root);
    expect(production.err).toContain('Created .ghost-app/production/identity.json');
    expect(production.err).toContain('Keep a copy of the production identity key');
    expect((await cli('keys', '--production', '--dir', root)).err).toContain(
      'Kept .ghost-app/production/identity.json, which already exists',
    );

    const manifestUrl = 'https://hello.example.com/ghost-app.json';
    const signed = await cli('sign', '--url', manifestUrl, '--production', '--dir', root);
    expect(signed.code).toBe(0);
    expect((await readAsGhost(JSON.parse(signed.out), manifestUrl)).development).toBe(false);

    const out = join(root, 'signed.json');
    expect(
      (
        await cli(
          'sign',
          '--url',
          'http://my-app.localhost:5173/ghost-app.json',
          '--out',
          out,
          '--dir',
          root,
        )
      ).code,
    ).toBe(0);
    expect(
      (
        await readAsGhost(
          JSON.parse(await readFile(out, 'utf8')),
          'http://my-app.localhost:5173/ghost-app.json',
        )
      ).development,
    ).toBe(true);

    // The private keys appear nowhere but where backend-key prints the backend key.
    const identity = JSON.parse(
      await readFile(join(root, '.ghost-app/production/identity.json'), 'utf8'),
    );
    const backend = JSON.parse(
      await readFile(join(root, '.ghost-app/production/backend.json'), 'utf8'),
    );
    expect(signed.out + signed.err + production.err).not.toContain(identity.d);
    expect(signed.out + signed.err + production.err).not.toContain(backend.d);
    expect(JSON.parse((await cli('backend-key', '--production', '--dir', root)).out)).toEqual(
      backend,
    );
  });

  it.each([
    ['ghost-app.json', [], 'over ghost-app.json'],
    ['./readable.json', ['--manifest', 'readable.json'], 'over readable.json'],
    ['.ghost-app/development/signed.json', [], 'into .ghost-app/'],
    ['.ghost-app', [], 'into .ghost-app/'],
    // A name that starts with `..` is still inside.
    ['.ghost-app/..signed.json', [], 'into .ghost-app/'],
  ])('refuses --out %s, %j', async (out, extra, refusal) => {
    await cli('keys', '--dir', root);
    await writeFile(join(root, 'readable.json'), JSON.stringify(SOURCE));
    const before = await readFile(join(root, 'ghost-app.json'), 'utf8');
    const result = await cli(
      'sign',
      '--url',
      'http://my-app.localhost:5173/ghost-app.json',
      ...extra,
      '--out',
      out,
      '--dir',
      root,
    );
    expect(result.code).toBe(1);
    expect(result.err).toContain(`Refusing to write the signed manifest ${refusal}`);
    expect(await readFile(join(root, 'ghost-app.json'), 'utf8')).toBe(before);
  });

  it.each([
    ['a key', '.ghost-app/development/identity.json', 'into .ghost-app/'],
    ['a key yet to be written', '.ghost-app/development/next.json', 'into .ghost-app/'],
    ['the manifest', 'ghost-app.json', 'over ghost-app.json'],
  ])('refuses an --out that links to %s', async (_name, target, refusal) => {
    await cli('keys', '--dir', root);
    await symlink(join(root, target), join(root, 'signed.json'));
    const identity = await readFile(join(root, '.ghost-app/development/identity.json'), 'utf8');
    const manifest = await readFile(join(root, 'ghost-app.json'), 'utf8');
    const result = await cli(
      'sign',
      '--url',
      'http://my-app.localhost:5173/ghost-app.json',
      '--out',
      'signed.json',
      '--dir',
      root,
    );
    expect(result.code).toBe(1);
    expect(result.err).toContain(`Refusing to write the signed manifest ${refusal}`);
    expect(await readFile(join(root, '.ghost-app/development/identity.json'), 'utf8')).toBe(
      identity,
    );
    expect(await readFile(join(root, 'ghost-app.json'), 'utf8')).toBe(manifest);
  });

  it('refuses an --out that links through another link to a key yet to be written', async () => {
    await cli('keys', '--dir', root);
    await symlink(join(root, '.ghost-app/development/next.json'), join(root, 'alias.json'));
    await symlink(join(root, 'alias.json'), join(root, 'signed.json'));
    const result = await cli(
      'sign',
      '--url',
      'http://my-app.localhost:5173/ghost-app.json',
      '--out',
      'signed.json',
      '--dir',
      root,
    );
    expect(result.code).toBe(1);
    expect(result.err).toContain('Refusing to write the signed manifest into .ghost-app/');
    expect(existsSync(join(root, '.ghost-app/development/next.json'))).toBe(false);
    expect(existsSync(join(root, '.ghost-app/development/next.json'))).toBe(false);
  });

  // A key that is itself a link lands outside .ghost-app/, so neither the path as written nor
  // where it lands is enough on its own.
  it.each(['.ghost-app/development/identity.json', 'identity-secret.json'])(
    'refuses an --out of %s, when the identity key is a link out of .ghost-app/',
    async (out) => {
      await cli('keys', '--dir', root);
      const key = join(root, '.ghost-app/development/identity.json');
      const secret = join(root, 'identity-secret.json');
      await rename(key, secret);
      await symlink(secret, key);
      const before = await readFile(secret, 'utf8');
      const result = await cli(
        'sign',
        '--url',
        'http://my-app.localhost:5173/ghost-app.json',
        '--out',
        out,
        '--dir',
        root,
      );
      expect(result.code).toBe(1);
      expect(result.err).toContain('Refusing to write the signed manifest into .ghost-app/');
      expect(await readFile(secret, 'utf8')).toBe(before);
    },
  );

  // Only where the filesystem ignores case, as macOS's does by default.
  it.skipIf(!existsSync(fileURLToPath(import.meta.url).toUpperCase())).each([
    ['Ghost-App.json', 'over ghost-app.json'],
    ['.GHOST-APP/development/identity.json', 'into .ghost-app/'],
  ])('refuses --out %s, which is the same file in another case', async (out, refusal) => {
    await cli('keys', '--dir', root);
    const identity = await readFile(join(root, '.ghost-app/development/identity.json'), 'utf8');
    const result = await cli(
      'sign',
      '--url',
      'http://my-app.localhost:5173/ghost-app.json',
      '--out',
      out,
      '--dir',
      root,
    );
    expect(result.code).toBe(1);
    expect(result.err).toContain(`Refusing to write the signed manifest ${refusal}`);
    expect(await readFile(join(root, '.ghost-app/development/identity.json'), 'utf8')).toBe(
      identity,
    );
  });

  it("writes --out in the project's directory, like --manifest, and says where", async () => {
    await cli('keys', '--dir', root);
    await writeFile(join(root, 'readable.json'), JSON.stringify(SOURCE));
    const result = await cli(
      'sign',
      '--url',
      'http://my-app.localhost:5173/ghost-app.json',
      '--manifest',
      'readable.json',
      '--out',
      'public/ghost-app.json',
      '--dir',
      root,
    );
    expect(result.err).toContain(`Wrote ${join(root, 'public/ghost-app.json')}, signed for`);
    expect(existsSync(join(root, 'public/ghost-app.json'))).toBe(true);
  });

  it("prints only the backend key's public half with --public", async () => {
    await cli('keys', '--production', '--dir', root);
    const backend = JSON.parse(
      await readFile(join(root, '.ghost-app/production/backend.json'), 'utf8'),
    );
    const result = await cli('backend-key', '--production', '--public', '--dir', root);
    expect(result).toMatchObject({ code: 0, err: '' });
    expect(JSON.parse(result.out)).toEqual({ kty: 'OKP', crv: 'Ed25519', x: backend.x });
    expect(result.out).not.toContain(backend.d);
  });

  describe('backend-key --check', () => {
    it('prints nothing, and exits with 0, for a key that is there and usable', async () => {
      await cli('keys', '--production', '--dir', root);
      expect(await cli('backend-key', '--production', '--check', '--dir', root)).toEqual({
        code: 0,
        out: '',
        err: '',
      });
    });

    it('says why on stderr, and prints nothing else, for a key that is missing', async () => {
      const result = await cli('backend-key', '--production', '--check', '--dir', root);
      expect(result).toMatchObject({ code: 1, out: '' });
      expect(result.err).toContain("There's no production backend key");
    });

    it("says why, without the key, for one that isn't usable", async () => {
      await cli('keys', '--production', '--dir', root);
      const file = join(root, '.ghost-app/production/backend.json');
      const backend = JSON.parse(await readFile(file, 'utf8'));
      await writeFile(file, JSON.stringify({ ...backend, x: generateKey().x }));
      const result = await cli('backend-key', '--production', '--check', '--dir', root);
      expect(result).toMatchObject({ code: 1, out: '' });
      expect(result.err).toContain("isn't a usable Ed25519 key");
      expect(result.err).not.toContain(backend.d);
    });
  });

  it('reports a manifest that cannot be signed with its problems', async () => {
    await cli('keys', '--dir', root);
    await writeFile(
      join(root, 'ghost-app.json'),
      JSON.stringify({ ...SOURCE, accent_color: 'red' }),
    );
    const result = await cli(
      'sign',
      '--url',
      'http://my-app.localhost:5173/ghost-app.json',
      '--dir',
      root,
    );
    expect(result).toMatchObject({ code: 1, out: '' });
    expect(result.err).toContain('APP_MANIFEST_INVALID');
    expect(result.err).toContain('accent_color: Expected a hex colour such as #ff5500');
  });

  it('says how to create a key that is missing', async () => {
    const result = await cli(
      'sign',
      '--url',
      'https://hello.example.com/ghost-app.json',
      '--production',
      '--dir',
      root,
    );
    expect(result.code).toBe(1);
    expect(result.err).toContain(
      'Create one with `ghost-app keys --production`, or set GHOST_APP_IDENTITY_KEY',
    );
    expect((await cli('backend-key', '--dir', root)).err).toContain(
      'Create one with `ghost-app keys`',
    );
  });

  it('shows the help for a mistake, and exits with 2', async () => {
    const none = await cli();
    expect(none).toMatchObject({ code: 2, out: '' });
    expect(none.err).toContain('Usage: ghost-app');
    for (const [args, says] of [
      [['check'], "missing required argument 'manifest URL'"],
      [['keys', 'extra'], "too many arguments for 'keys'"],
      [['keys', '--nope'], "unknown option '--nope'"],
      [['sign', '--dir', root], "required option '--url <manifest URL>' not specified"],
      [['nope'], "unknown command 'nope'"],
    ] as const) {
      const result = await cli(...args);
      expect(result).toMatchObject({ code: 2, out: '' });
      expect(result.err).toContain(says);
      expect(result.err).toContain('Usage: ghost-app');
    }
  });

  it('shows the help when asked, on stdout, and exits with 0', async () => {
    for (const args of [['--help'], ['-h'], ['help'], ['sign', '--help']]) {
      const result = await cli(...args);
      expect(result).toMatchObject({ code: 0, err: '' });
      expect(result.out).toContain('Usage: ghost-app');
    }
  });

  it('takes --dir before or after the command', async () => {
    await cli('keys', '--dir', root);
    for (const args of [
      ['--dir', root, 'backend-key', '--check'],
      ['backend-key', '--check', '--dir', root],
    ]) {
      expect(await cli(...args)).toMatchObject({ code: 0, out: '', err: '' });
    }
  });
});
