// @vitest-environment node
import { existsSync } from 'node:fs';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  build,
  createLogger,
  createServer,
  type Logger,
  resolveConfig,
  type Plugin,
  type ServerOptions,
  type ViteDevServer,
} from 'vite';

import {
  createKeys,
  generateKey,
  publicKeyOf,
  readBackendKey,
  readSigningKeys,
} from '../src/tooling/index.ts';
import { VITE_DEFAULT_DENY } from '../src/vite/deny.ts';
import { ghostApp, type GhostAppOptions } from '../src/vite/index.ts';
import { makeProject, readAsGhost } from './helpers.ts';

let root: string;
let cleanup: () => Promise<void>;
let server: ViteDevServer | undefined;

beforeEach(async () => {
  ({ root, cleanup } = await makeProject({
    'index.html': '<!doctype html><script type="module" src="/main.js"></script>',
    'main.js': 'document.body.textContent = "Hello";\n',
  }));
  for (const name of [
    'GHOST_APP_URL',
    'GHOST_APP_TUNNEL_URL',
    'GHOST_URL',
    'GHOST_APP_IDENTITY_KEY',
    'GHOST_APP_BACKEND_KEY',
    // These tests run the plugin as `vite dev` would, not as Vitest loads a project's config.
    'VITEST',
  ]) {
    vi.stubEnv(name, undefined);
  }
});

afterEach(async () => {
  await server?.close();
  server = undefined;
  vi.unstubAllEnvs();
  await cleanup();
});

/** A logger that keeps what it's told. */
function recordingLogger(): Logger & { messages: { level: string; text: string }[] } {
  const logger = createLogger('silent');
  const messages: { level: string; text: string }[] = [];
  for (const level of ['info', 'warn', 'error'] as const) {
    logger[level] = (text: string) => {
      messages.push({ level, text });
    };
  }
  return Object.assign(logger, { messages });
}

const printed = (logger: ReturnType<typeof recordingLogger>) =>
  logger.messages.map(({ text }) => text).join('\n');

// Stands in for Cloudflare's plugin, listed after this one, which answers every request itself.
const catchAll: Plugin = {
  name: 'catch-all',
  configureServer(dev) {
    dev.middlewares.use((_req, res) => res.end('from the worker'));
  },
};

async function startDevServer(
  options?: GhostAppOptions,
  {
    worker = true,
    mode,
    ...serverOptions
  }: ServerOptions & { worker?: boolean; mode?: string } = {},
) {
  const logger = recordingLogger();
  server = await createServer({
    root,
    configFile: false,
    customLogger: logger,
    mode,
    plugins: [ghostApp(options), ...(worker ? [catchAll] : [])],
    server: { port: 0, host: 'localhost', ...serverOptions },
  });
  await server.listen();
  const port = (server.httpServer!.address() as AddressInfo).port;
  return { port, logger };
}

/** Requests a path with the given Host, as Ghost (or a tunnel) would send it. */
function get(port: number, host: string, path = '/ghost-app.json') {
  return new Promise<{ status: number; body: string; headers: Record<string, unknown> }>(
    (resolve, reject) => {
      const req = request({ host: 'localhost', port, path, headers: { host } }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode!, body, headers: res.headers }));
      });
      req.on('error', reject);
      req.end();
    },
  );
}

describe('vite dev', () => {
  it('creates the development keys, serves the signed manifest, and prints where', async () => {
    const { port, logger } = await startDevServer();
    expect(existsSync(join(root, '.ghost-app/development/identity.json'))).toBe(true);
    expect(existsSync(join(root, '.ghost-app/production'))).toBe(false);

    const response = await get(port, `hello.localhost:${port}`);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const manifestUrl = `http://hello.localhost:${port}/ghost-app.json`;
    const manifest = await readAsGhost(JSON.parse(response.body), manifestUrl);
    expect(manifest).toMatchObject({ manifest_url: manifestUrl, development: true });
    // Every other path still reaches the other plugins.
    expect((await get(port, `hello.localhost:${port}`, '/')).body).toBe('from the worker');

    server!.printUrls();
    expect(printed(logger)).toContain(`Ghost app: ${manifestUrl}`);
    expect(printed(logger)).toContain(
      `Install:   http://localhost:2368/ghost/#/apps/install?manifest=${encodeURIComponent(manifestUrl)}`,
    );
  });

  it('signs for any name for this machine, as Ghost in Docker keeps the original Host', async () => {
    const { port } = await startDevServer();
    for (const host of [`127.0.0.1:${port}`, 'app.localhost:1']) {
      const response = await get(port, host);
      expect(response.status).toBe(200);
      await readAsGhost(JSON.parse(response.body), `http://${host}/ghost-app.json`);
    }
  });

  it('refuses to sign for another host, even with every host allowed', async () => {
    const { port } = await startDevServer(
      { tunnelUrl: ['https://tunnel.example'] },
      { allowedHosts: true },
    );
    const response = await get(port, 'evil.example');
    expect(response.status).toBe(421);
    expect(response.body).toBe(
      "The dev server signs ghost-app.json only for this machine, tunnel.example, not evil.example. Name a tunnel's address with GHOST_APP_TUNNEL_URL.\n",
    );
  });

  it('signs for the tunnels from GHOST_APP_TUNNEL_URL or the option, and prints each', async () => {
    vi.stubEnv('GHOST_APP_TUNNEL_URL', 'https://env.example, https://other.example');
    const fromEnv = await startDevServer();
    const response = await get(fromEnv.port, 'other.example');
    expect(response.status).toBe(200);
    await readAsGhost(JSON.parse(response.body), 'https://other.example/ghost-app.json');
    await server!.close();

    const { port, logger } = await startDevServer({ tunnelUrl: 'https://tunnel.example' });
    expect((await get(port, 'tunnel.example')).status).toBe(200);
    // Vite refuses a host it doesn't know.
    expect((await get(port, 'env.example')).status).toBe(403);
    server!.printUrls();
    expect(printed(logger)).toContain(
      `manifest=${encodeURIComponent('https://tunnel.example/ghost-app.json')}`,
    );
  });

  it("reads GHOST_APP_TUNNEL_URL and GHOST_URL from the mode's .env files, which the environment overrides", async () => {
    await writeFile(
      join(root, '.env.development'),
      'GHOST_APP_TUNNEL_URL=https://committed.example\nGHOST_URL=http://from-file.localhost:2368/\n',
    );
    const fromFile = await startDevServer();
    expect((await get(fromFile.port, 'committed.example')).status).toBe(200);
    server!.printUrls();
    expect(printed(fromFile.logger)).toContain('Install:   http://from-file.localhost:2368/ghost/');
    await server!.close();

    vi.stubEnv('GHOST_URL', 'http://from-env.localhost:2368');
    const fromEnv = await startDevServer();
    server!.printUrls();
    expect(printed(fromEnv.logger)).toContain('Install:   http://from-env.localhost:2368/ghost/');
  });

  it('refuses a tunnel that is not an address', async () => {
    await expect(startDevServer({ tunnelUrl: 'https://tunnel.example/path' })).rejects.toThrow(
      "expected a tunnel's address such as https://example.trycloudflare.com",
    );
  });

  it('prints the app at app.localhost when the manifest names no ID', async () => {
    const { port, logger } = await startDevServer();
    await writeFile(join(root, 'ghost-app.json'), 'not JSON');
    server!.printUrls();
    expect(printed(logger)).toContain(`Ghost app: http://app.localhost:${port}/ghost-app.json`);
  });

  it("answers 500 with why when the manifest can't be signed", async () => {
    await writeFile(join(root, 'ghost-app.json'), JSON.stringify({ name: 'Hello' }));
    const { port, logger } = await startDevServer();
    const response = await get(port, `hello.localhost:${port}`);
    expect(response.status).toBe(500);
    expect(response.body).toContain("ghost-app.json can't be signed");
    expect(logger.messages).toContainEqual(
      expect.objectContaining({ level: 'error', text: expect.stringContaining('id:') }),
    );

    await rm(join(root, 'ghost-app.json'));
    expect((await get(port, `hello.localhost:${port}`)).status).toBe(500);
  });

  it('never serves a private key or .dev.vars as a file', async () => {
    await createKeys({ root, mode: 'production' });
    await writeFile(join(root, '.dev.vars'), 'SECRET=1\n');
    const { port } = await startDevServer(undefined, { worker: false });
    for (const file of ['.ghost-app/production/identity.json', '.dev.vars']) {
      for (const path of [`/${file}`, `/@fs${root}/${file}`, `/${file}?raw`]) {
        const response = await get(port, `hello.localhost:${port}`, path);
        expect(response.status, path).toBe(403);
        expect(response.body).not.toContain('SECRET');
      }
    }
  });

  it("keeps Vite's own refusals, and the project's", async () => {
    for (const file of ['.npmrc', '.env', 'secret.txt']) {
      await writeFile(join(root, file), 'SECRET=1\n');
    }
    const { port } = await startDevServer(undefined, { worker: false });
    expect((await get(port, `localhost:${port}`, '/.npmrc')).status).toBe(403);
    await server!.close();

    const own = await startDevServer(undefined, { worker: false, fs: { deny: ['secret.txt'] } });
    for (const path of ['/secret.txt', '/.ghost-app/development/identity.json', '/.env']) {
      expect((await get(own.port, `localhost:${own.port}`, path)).status).toBe(403);
    }
  });

  it('copies the defaults the installed Vite resolves, so none is dropped', async () => {
    const resolved = await resolveConfig({ root, configFile: false, logLevel: 'silent' }, 'serve');
    expect(resolved.server.fs.deny).toEqual(VITE_DEFAULT_DENY);
  });

  it.each([
    ['VITEST is set', () => vi.stubEnv('VITEST', 'true'), undefined],
    ['the mode is test', () => undefined, 'test'],
  ])('creates no keys and writes no .dev.vars when %s', async (_name, setUp, mode) => {
    await writeFile(join(root, 'wrangler.jsonc'), '{}');
    setUp();
    await startDevServer(undefined, { mode });
    expect(existsSync(join(root, '.ghost-app'))).toBe(false);
    expect(existsSync(join(root, '.dev.vars'))).toBe(false);
  });

  it('gives a Workers project the development backend key in .dev.vars, and says so', async () => {
    await writeFile(join(root, 'wrangler.jsonc'), '{}');
    const { logger } = await startDevServer();
    const key = await readBackendKey({ root, mode: 'development' });
    expect(await readFile(join(root, '.dev.vars'), 'utf8')).toBe(
      `GHOST_APP_BACKEND_KEY='${JSON.stringify(key)}'\n`,
    );
    expect(logger.messages).toContainEqual({
      level: 'info',
      text: 'ghost-app: Added GHOST_APP_BACKEND_KEY to .dev.vars, with the development backend key',
    });
  });
});

describe('vite build', () => {
  const outDir = () => join(root, 'dist');

  async function buildApp() {
    const logger = recordingLogger();
    await build({
      root,
      configFile: false,
      customLogger: logger,
      plugins: [ghostApp()],
      build: { outDir: outDir() },
    });
    return logger;
  }

  const readEmitted = async () =>
    JSON.parse(await readFile(join(outDir(), 'ghost-app.json'), 'utf8')) as unknown;

  async function everyFile(): Promise<string[]> {
    const entries = await readdir(outDir(), { withFileTypes: true, recursive: true });
    return Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map((entry) => readFile(join(entry.parentPath, entry.name), 'utf8')),
    );
  }

  it('emits ghost-app.json signed for GHOST_APP_URL with the production keys', async () => {
    await createKeys({ root, mode: 'production' });
    vi.stubEnv('GHOST_APP_URL', 'https://hello.example.com');
    const logger = await buildApp();

    const manifestUrl = 'https://hello.example.com/ghost-app.json';
    const manifest = await readAsGhost(await readEmitted(), manifestUrl);
    const keys = await readSigningKeys({ root, mode: 'production', env: {} });
    expect(manifest).toMatchObject({
      manifest_url: manifestUrl,
      identity_key: publicKeyOf(keys.identityKey),
      backend_key: keys.backendKey,
      development: false,
    });
    expect(logger.messages.map(({ text }) => text)).toContain(
      `ghost-app: signed ghost-app.json for ${manifestUrl} with .ghost-app/production/identity.json`,
    );

    // No private key is in anything the build wrote.
    const backend = await readBackendKey({ root, mode: 'production' });
    for (const text of await everyFile()) {
      expect(text).not.toContain(keys.identityKey.d);
      expect(text).not.toContain(backend.d);
    }
  });

  it('signs with the identity key from GHOST_APP_IDENTITY_KEY in CI', async () => {
    const identity = generateKey();
    vi.stubEnv('GHOST_APP_URL', 'https://hello.example.com/');
    vi.stubEnv('GHOST_APP_IDENTITY_KEY', JSON.stringify(identity));
    vi.stubEnv('GHOST_APP_BACKEND_KEY', JSON.stringify(publicKeyOf(generateKey())));
    const logger = await buildApp();
    const manifest = await readAsGhost(
      await readEmitted(),
      'https://hello.example.com/ghost-app.json',
    );
    expect(manifest.identity_key).toEqual(publicKeyOf(identity));
    expect(printed(logger)).toContain('with GHOST_APP_IDENTITY_KEY');
  });

  it('reads GHOST_APP_URL from .env.production, which the environment overrides', async () => {
    await createKeys({ root, mode: 'production' });
    await writeFile(join(root, '.env.production'), 'GHOST_APP_URL=https://committed.example.com\n');
    await buildApp();
    await readAsGhost(await readEmitted(), 'https://committed.example.com/ghost-app.json');

    vi.stubEnv('GHOST_APP_URL', 'https://env.example.com');
    await buildApp();
    await readAsGhost(await readEmitted(), 'https://env.example.com/ghost-app.json');
  });

  it('emits no manifest without GHOST_APP_URL, and says so', async () => {
    const logger = await buildApp();
    expect(existsSync(join(outDir(), 'index.html'))).toBe(true);
    expect(existsSync(join(outDir(), 'ghost-app.json'))).toBe(false);
    expect(logger.messages).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        text: expect.stringContaining("GHOST_APP_URL isn't set"),
      }),
    );
  });

  it('fails for a GHOST_APP_URL that is not one, or a manifest that cannot be signed', async () => {
    await createKeys({ root, mode: 'production' });
    for (const appUrl of ['hello', 'https://hello.example.com?v=1']) {
      vi.stubEnv('GHOST_APP_URL', appUrl);
      await expect(buildApp(), appUrl).rejects.toThrow(
        "GHOST_APP_URL must be the app's public address",
      );
    }

    // Ghost refuses a plain HTTP address that isn't this machine.
    vi.stubEnv('GHOST_APP_URL', 'http://hello.example.com');
    await expect(buildApp()).rejects.toThrow(
      "ghost-app.json can't be signed for http://hello.example.com/ghost-app.json",
    );
  });

  it('fails without the production keys, saying how to create them, and creates none', async () => {
    vi.stubEnv('GHOST_APP_URL', 'https://hello.example.com');
    await expect(buildApp()).rejects.toThrow(
      'Create one with `ghost-app keys --production`, or set GHOST_APP_IDENTITY_KEY',
    );
    expect(existsSync(join(root, '.ghost-app'))).toBe(false);
  });
});
