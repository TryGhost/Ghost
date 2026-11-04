// @vitest-environment node
import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  build,
  createLogger,
  createServer,
  type Logger,
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
import { ghostApp, type GhostAppOptions } from '../src/vite/index.ts';
import { git, makeProject, readAsGhost } from './helpers.ts';

let root: string;
let cleanup: () => Promise<void>;
let server: ViteDevServer | undefined;

beforeEach(async () => {
  ({ root, cleanup } = await makeProject({
    'index.html': '<!doctype html><script type="module" src="/main.js"></script>',
    'main.js': 'document.body.textContent = "Hello";\n',
  }));
  vi.stubEnv('GHOST_APP_URL', undefined);
  vi.stubEnv('GHOST_APP_TUNNEL_URL', undefined);
  vi.stubEnv('GHOST_APP_IDENTITY_KEY', undefined);
  vi.stubEnv('GHOST_APP_BACKEND_KEY', undefined);
  // These tests run the plugin as `vite dev` would, not as Vitest loads a project's config.
  vi.stubEnv('VITEST', undefined);
});

afterEach(async () => {
  await server?.close();
  server = undefined;
  vi.unstubAllEnvs();
  await cleanup();
});

/** A logger that keeps what it's told, so a test can read the warnings. */
function recordingLogger(): Logger & { messages: { level: string; text: string }[] } {
  const logger = createLogger('silent');
  const messages: { level: string; text: string }[] = [];
  for (const level of ['info', 'warn', 'error'] as const) {
    logger[level] = (text: string) => {
      messages.push({ level, text });
    };
  }
  logger.warnOnce = logger.warn;
  return Object.assign(logger, { messages });
}

// Stands in for a plugin that answers every request itself, as Cloudflare's does with the
// Worker, listed after this one.
const catchAll: Plugin = {
  name: 'catch-all',
  configureServer(dev) {
    dev.middlewares.use((_req, res) => res.end('from the worker'));
  },
};

async function startDevServer(
  options?: GhostAppOptions,
  {
    logger = recordingLogger(),
    allowedHosts,
    worker = true,
    mode,
    serverOptions = {},
  }: {
    logger?: ReturnType<typeof recordingLogger>;
    allowedHosts?: true;
    /** Whether a plugin answers every other request, as Cloudflare's does with the Worker. */
    worker?: boolean;
    mode?: string;
    serverOptions?: ServerOptions;
  } = {},
) {
  server = await createServer({
    root,
    configFile: false,
    customLogger: logger,
    mode,
    plugins: [ghostApp(options), ...(worker ? [catchAll] : [])],
    server: { port: 0, host: 'localhost', allowedHosts, ...serverOptions },
  });
  await server.listen();
  const port = (server.httpServer!.address() as AddressInfo).port;
  return { port, logger };
}

/** Requests the manifest with the given Host, as Ghost (or a tunnel) would send it. */
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
  it('creates the development keys, and serves the manifest signed for localhost', async () => {
    const { port, logger } = await startDevServer();
    expect(existsSync(join(root, '.ghost-app/development/identity.json'))).toBe(true);
    expect(existsSync(join(root, '.ghost-app/production'))).toBe(false);

    const response = await get(port, `localhost:${port}`);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    // Not the readable ghost-app.json from the project, which Vite would otherwise serve.
    const manifestUrl = `http://localhost:${port}/ghost-app.json`;
    const manifest = await readAsGhost(JSON.parse(response.body), manifestUrl);
    expect(manifest).toMatchObject({ manifest_url: manifestUrl, development: true });

    // Every other path still reaches the other plugins.
    expect((await get(port, `localhost:${port}`, '/')).body).toBe('from the worker');

    server!.printUrls();
    const printed = logger.messages.map(({ text }) => text).join('\n');
    expect(printed).toContain(
      `Install:   http://localhost:2368/ghost/#/apps/install?manifest=${encodeURIComponent(manifestUrl)}`,
    );
  });

  it('signs for the address of the machine it is requested at, when Ghost in Docker asks', async () => {
    const { port } = await startDevServer();
    // Ghost in Docker connects through host.docker.internal, and keeps the original Host.
    for (const host of [`127.0.0.1:${port}`, `app.localhost:${port}`]) {
      const response = await get(port, host);
      expect(response.status).toBe(200);
      await readAsGhost(JSON.parse(response.body), `http://${host}/ghost-app.json`);
    }
  });

  // Vite refuses a host it doesn't know with a 403 before any plugin sees the request. With
  // every host allowed, the plugin still refuses to sign for one.
  it.each([
    ['another site', 'evil.example'],
    ['another port', 'localhost:1'],
    ['the alias without the original Host', 'host.docker.internal:5173'],
    ['something that is not a host', 'not a host'],
  ])('refuses to sign for %s, even with every host allowed', async (_name, host) => {
    const { port } = await startDevServer(undefined, { allowedHosts: true });
    const response = await get(port, host.replace('5173', String(port)));
    expect(response.status).toBe(421);
    expect(response.body).toContain(`signs ghost-app.json only for localhost:${port}`);
    await server!.close();

    const strict = await startDevServer();
    expect([403, 421]).toContain(
      (await get(strict.port, host.replace('5173', String(strict.port)))).status,
    );
  });

  it('signs for the tunnels it is told about, from the option or GHOST_APP_TUNNEL_URL', async () => {
    vi.stubEnv('GHOST_APP_TUNNEL_URL', 'https://env.example, https://other.example');
    const { port } = await startDevServer();
    const response = await get(port, 'other.example');
    expect(response.status).toBe(200);
    await readAsGhost(JSON.parse(response.body), 'https://other.example/ghost-app.json');
    await server!.close();

    const option = await startDevServer({ tunnelUrl: 'https://tunnel.example' });
    expect((await get(option.port, 'tunnel.example')).status).toBe(200);
    expect([403, 421]).toContain((await get(option.port, 'env.example')).status);

    // The install link is printed for each, and a refusal lists them.
    server!.printUrls();
    expect(option.logger.messages.map(({ text }) => text).join('\n')).toContain(
      `manifest=${encodeURIComponent('https://tunnel.example/ghost-app.json')}`,
    );
    await server!.close();
    const open = await startDevServer(
      { tunnelUrl: ['https://tunnel.example'] },
      { allowedHosts: true },
    );
    expect((await get(open.port, 'env.example')).body).toContain(
      `only for localhost:${open.port}, tunnel.example, not env.example`,
    );
  });

  it('refuses a tunnel that is not an address', () => {
    expect(() => ghostApp({ tunnelUrl: 'https://tunnel.example/path' })).toThrow(
      "expected a tunnel's address such as https://example.trycloudflare.com",
    );
  });

  it('answers with the error when the manifest cannot be read', async () => {
    const { port, logger } = await startDevServer();
    await rm(join(root, 'ghost-app.json'));
    const response = await get(port, `localhost:${port}`);
    expect(response.status).toBe(500);
    expect(response.body).toContain('ENOENT');
    expect(logger.messages.some(({ level }) => level === 'error')).toBe(true);
  });

  describe('never serves a private key as a file', () => {
    const KEY_FILES = [
      '.ghost-app/development/identity.json',
      '.ghost-app/development/backend.json',
      '.ghost-app/production/identity.json',
      '.ghost-app/production/backend.json',
      '.dev.vars',
      '.dev.vars.staging',
    ];

    beforeEach(async () => {
      await createKeys({ root, mode: 'production' });
      await writeFile(join(root, '.dev.vars'), 'SECRET=1\n');
      await writeFile(join(root, '.dev.vars.staging'), 'SECRET=1\n');
    });

    it.each(KEY_FILES)('refuses %s, as a file, through /@fs/ or as an import', async (file) => {
      const { port } = await startDevServer(
        { tunnelUrl: 'https://tunnel.example' },
        { worker: false },
      );
      for (const host of [`localhost:${port}`, 'tunnel.example']) {
        for (const path of [`/${file}`, `/@fs${root}/${file}`, `/${file}?import`, `/${file}?raw`]) {
          const response = await get(port, host, path);
          expect(response.status, `${host}${path}`).toBe(403);
          expect(response.body).not.toContain('"d"');
          expect(response.body).not.toContain('SECRET');
        }
      }
    });

    it("keeps Vite's own refusals, and the project's", async () => {
      await writeFile(join(root, '.env'), 'SECRET=1\n');
      await writeFile(join(root, 'secret.txt'), 'SECRET=1\n');
      const { port } = await startDevServer(undefined, { worker: false });
      expect((await get(port, `localhost:${port}`, '/.env')).status).toBe(403);
      await server!.close();

      const own = await startDevServer(undefined, {
        worker: false,
        serverOptions: { fs: { deny: ['secret.txt'] } },
      });
      for (const path of ['/secret.txt', '/.ghost-app/production/identity.json']) {
        expect((await get(own.port, `localhost:${own.port}`, path)).status).toBe(403);
      }
    });
  });

  it.each([
    ['VITEST is set', { env: 'true' }],
    ['the mode is test', { mode: 'test' }],
  ])('creates no keys and writes no .dev.vars when %s, as under Vitest', async (_name, how) => {
    await writeFile(join(root, 'wrangler.jsonc'), '{}');
    if ('env' in how) {
      vi.stubEnv('VITEST', how.env);
    }
    await startDevServer(undefined, { mode: 'mode' in how ? how.mode : undefined });
    expect(existsSync(join(root, '.ghost-app'))).toBe(false);
    expect(existsSync(join(root, '.dev.vars'))).toBe(false);
  });

  describe('in middleware mode', () => {
    /** A dev server in middleware mode, which doesn't listen itself. */
    async function startMiddlewareServer(serverOptions: ServerOptions) {
      const logger = recordingLogger();
      server = await createServer({
        root,
        configFile: false,
        customLogger: logger,
        plugins: [ghostApp()],
        server: { middlewareMode: true, ...serverOptions },
      });
      return { logger };
    }

    /** Serves the dev server's middleware on a port of its own, as an app's own server would. */
    async function host() {
      const http = createHttpServer(server!.middlewares);
      await new Promise<void>((resolve) => {
        http.listen(0, resolve);
      });
      return { http, port: (http.address() as AddressInfo).port };
    }

    it('warns, and signs for nothing, without a port or a tunnel', async () => {
      const { logger } = await startMiddlewareServer({});
      expect(logger.messages).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          text: expect.stringContaining('middleware mode'),
        }),
      );
      const { http, port } = await host();
      try {
        const response = await get(port, `localhost:${port}`);
        expect(response.status).toBe(421);
        expect(response.body).not.toContain('undefined');
      } finally {
        http.close();
      }
    });

    it("signs for the port it's given, its scheme's default included", async () => {
      await startMiddlewareServer({ port: 80 });
      const { http, port } = await host();
      try {
        for (const hostHeader of ['localhost', 'localhost:80']) {
          const response = await get(port, hostHeader);
          expect(response.status).toBe(200);
          await readAsGhost(JSON.parse(response.body), 'http://localhost/ghost-app.json');
        }
      } finally {
        http.close();
      }
    });
  });

  it('answers a manifest that cannot be signed with its problems', async () => {
    await writeFile(join(root, 'ghost-app.json'), JSON.stringify({ name: 'Hello' }));
    const { port, logger } = await startDevServer();
    const response = await get(port, `localhost:${port}`);
    expect(response.status).toBe(500);
    expect(JSON.parse(response.body)).toMatchObject({ code: 'APP_MANIFEST_INVALID' });
    expect(
      logger.messages.some(({ level, text }) => level === 'error' && text.includes('id:')),
    ).toBe(true);
  });

  it('refuses to create keys git would commit', async () => {
    await git(root, 'init', '--quiet');
    await expect(startDevServer()).rejects.toThrow('Add .ghost-app/ to .gitignore');
  });

  describe('in a Cloudflare Workers project', () => {
    beforeEach(() => writeFile(join(root, 'wrangler.jsonc'), '{}'));

    it('gives the Worker the development backend key in .dev.vars', async () => {
      await writeFile(join(root, '.dev.vars'), 'OTHER=1');
      const { logger } = await startDevServer();
      const key = await readBackendKey({ root, mode: 'development' });
      expect(await readFile(join(root, '.dev.vars'), 'utf8')).toBe(
        `OTHER=1\nGHOST_APP_BACKEND_KEY='${JSON.stringify(key)}'\n`,
      );
      expect(logger.messages.map(({ text }) => text)).toContain(
        'ghost-app: Added GHOST_APP_BACKEND_KEY to .dev.vars, with the development backend key',
      );

      // Once it's there, nothing changes.
      await server!.close();
      const again = await startDevServer();
      expect(again.logger.messages.filter(({ text }) => text.includes('.dev.vars'))).toEqual([]);
    });

    it('creates .dev.vars for the owner only', async () => {
      await startDevServer();
      expect((await stat(join(root, '.dev.vars'))).mode & 0o777).toBe(0o600);
    });

    it('never replaces another value, and says so', async () => {
      await writeFile(join(root, '.dev.vars'), 'GHOST_APP_BACKEND_KEY=mine\n');
      const { logger } = await startDevServer();
      expect(await readFile(join(root, '.dev.vars'), 'utf8')).toBe('GHOST_APP_BACKEND_KEY=mine\n');
      expect(logger.messages).toContainEqual(
        expect.objectContaining({ level: 'warn', text: expect.stringContaining('another key') }),
      );
    });

    it('leaves .env to the developer, which Wrangler reads only without .dev.vars', async () => {
      await writeFile(join(root, '.env'), 'OTHER=1\n');
      const { logger } = await startDevServer();
      expect(existsSync(join(root, '.dev.vars'))).toBe(false);
      expect(logger.messages).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          text: expect.stringContaining('Add GHOST_APP_BACKEND_KEY to .env'),
        }),
      );
    });

    it('says nothing once .env has the development key, and warns about another', async () => {
      await createKeys({ root, mode: 'development' });
      const key = await readBackendKey({ root, mode: 'development' });
      await writeFile(join(root, '.env'), `GHOST_APP_BACKEND_KEY='${JSON.stringify(key)}'\n`);
      const { logger } = await startDevServer();
      expect(logger.messages.filter(({ level }) => level === 'warn')).toEqual([]);
      await server!.close();

      await writeFile(
        join(root, '.env'),
        `GHOST_APP_BACKEND_KEY='${JSON.stringify(generateKey())}'\n`,
      );
      const other = await startDevServer();
      expect(other.logger.messages).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          text: expect.stringContaining('.env sets GHOST_APP_BACKEND_KEY to another key'),
        }),
      );
      expect(existsSync(join(root, '.dev.vars'))).toBe(false);
    });

    it('fails on a .env it cannot read', async () => {
      await mkdir(join(root, '.env'));
      await expect(startDevServer()).rejects.toThrow(/EISDIR/);
    });

    it('makes an existing .dev.vars private before adding the key', async () => {
      await writeFile(join(root, '.dev.vars'), 'OTHER=1\n');
      await chmod(join(root, '.dev.vars'), 0o644);
      await startDevServer();
      expect((await stat(join(root, '.dev.vars'))).mode & 0o777).toBe(0o600);
      expect(await readFile(join(root, '.dev.vars'), 'utf8')).toContain('GHOST_APP_BACKEND_KEY=');
    });

    it.each([
      ['a link', () => symlink(join(root, 'elsewhere'), join(root, '.dev.vars'))],
      ['a directory', () => mkdir(join(root, '.dev.vars'))],
    ])("doesn't write through a .dev.vars that is %s", async (_name, make) => {
      await writeFile(join(root, 'elsewhere'), 'OTHER=1\n');
      await make();
      const { logger } = await startDevServer();
      expect(await readFile(join(root, 'elsewhere'), 'utf8')).toBe('OTHER=1\n');
      expect(logger.messages).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          text: expect.stringContaining("it isn't a regular file"),
        }),
      );
    });

    it("doesn't write the key where git would commit it", async () => {
      await git(root, 'init', '--quiet');
      await writeFile(join(root, '.gitignore'), '.ghost-app/\n');
      const { logger } = await startDevServer();
      expect(existsSync(join(root, '.dev.vars'))).toBe(false);
      expect(logger.messages).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          text: expect.stringContaining('Add .dev.vars to .gitignore'),
        }),
      );
    });
  });
});

describe('vite build', () => {
  const outDir = () => join(root, 'dist');

  async function buildApp(logger = recordingLogger()) {
    await build({
      root,
      configFile: false,
      customLogger: logger,
      plugins: [ghostApp()],
      build: { outDir: outDir() },
    });
    return logger;
  }

  async function everyFile(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true, recursive: true });
    return Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map((entry) => readFile(join(entry.parentPath, entry.name), 'utf8')),
    );
  }

  it('emits ghost-app.json signed for GHOST_APP_URL with the production keys', async () => {
    await createKeys({ root, mode: 'production' });
    vi.stubEnv('GHOST_APP_URL', 'https://hello.example.com');
    await buildApp();

    const manifestUrl = 'https://hello.example.com/ghost-app.json';
    const signed = JSON.parse(await readFile(join(outDir(), 'ghost-app.json'), 'utf8'));
    const manifest = await readAsGhost(signed, manifestUrl);
    const keys = await readSigningKeys({ root, mode: 'production', env: {} });
    expect(manifest).toMatchObject({
      manifest_url: manifestUrl,
      identity_key: publicKeyOf(keys.identityKey),
      backend_key: keys.backendKey,
      development: false,
    });

    // No private key is in anything the build wrote.
    const backend = await readBackendKey({ root, mode: 'production' });
    for (const text of await everyFile(outDir())) {
      expect(text).not.toContain(keys.identityKey.d);
      expect(text).not.toContain(backend.d);
    }
  });

  it('signs with the identity key from GHOST_APP_IDENTITY_KEY in CI', async () => {
    const identity = generateKey();
    vi.stubEnv('GHOST_APP_URL', 'https://hello.example.com/');
    vi.stubEnv('GHOST_APP_IDENTITY_KEY', JSON.stringify(identity));
    vi.stubEnv('GHOST_APP_BACKEND_KEY', JSON.stringify(publicKeyOf(generateKey())));
    await buildApp();
    const signed = JSON.parse(await readFile(join(outDir(), 'ghost-app.json'), 'utf8'));
    expect(
      (await readAsGhost(signed, 'https://hello.example.com/ghost-app.json')).identity_key,
    ).toEqual(publicKeyOf(identity));
    for (const text of await everyFile(outDir())) {
      expect(text).not.toContain(identity.d);
    }
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
    vi.stubEnv('GHOST_APP_URL', 'hello');
    await expect(buildApp()).rejects.toThrow("GHOST_APP_URL must be the app's public address");

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
