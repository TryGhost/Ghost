// @vitest-environment node
import { existsSync } from 'node:fs';
import {
  chmod,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { createServer as createHttpServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
import { SOURCE, git, makeProject, readAsGhost } from './helpers.ts';

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
  vi.stubEnv('GHOST_URL', undefined);
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
  it('creates the development keys, and serves the manifest signed for a .localhost name of its own', async () => {
    const { port, logger } = await startDevServer();
    expect(existsSync(join(root, '.ghost-app/development/identity.json'))).toBe(true);
    expect(existsSync(join(root, '.ghost-app/production'))).toBe(false);

    const response = await get(port, `hello.localhost:${port}`);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    // Not the readable ghost-app.json from the project, which Vite would otherwise serve.
    const manifestUrl = `http://hello.localhost:${port}/ghost-app.json`;
    const manifest = await readAsGhost(JSON.parse(response.body), manifestUrl);
    expect(manifest).toMatchObject({ manifest_url: manifestUrl, development: true });
    // Written as the build emits it.
    expect(response.body).toBe(`${JSON.stringify(JSON.parse(response.body), null, 2)}\n`);

    // Every other path still reaches the other plugins.
    expect((await get(port, `hello.localhost:${port}`, '/')).body).toBe('from the worker');

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
    expect(response.body).toContain(
      `signs ghost-app.json only for this machine on port ${port}, such as hello.localhost:${port}`,
    );
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
      `only for this machine on port ${open.port}, such as hello.localhost:${open.port}, tunnel.example, not env.example`,
    );
  });

  it('prints the install link for GHOST_URL from the .env files, which the environment overrides', async () => {
    await writeFile(join(root, '.env.development'), 'GHOST_URL=http://from-file.localhost:2368/\n');
    const link = (port: number) =>
      `/ghost/#/apps/install?manifest=${encodeURIComponent(`http://hello.localhost:${port}/ghost-app.json`)}`;
    const printed = async () => {
      const started = await startDevServer();
      server!.printUrls();
      await server!.close();
      return {
        port: started.port,
        text: started.logger.messages.map(({ text }) => text).join('\n'),
      };
    };

    const fromFile = await printed();
    expect(fromFile.text).toContain(
      `Install:   http://from-file.localhost:2368${link(fromFile.port)}`,
    );

    vi.stubEnv('GHOST_URL', 'http://from-env.localhost:2368');
    const fromEnv = await printed();
    expect(fromEnv.text).toContain(
      `Install:   http://from-env.localhost:2368${link(fromEnv.port)}`,
    );
  });

  it("reads GHOST_APP_TUNNEL_URL from the mode's .env files", async () => {
    await writeFile(
      join(root, '.env.development'),
      'GHOST_APP_TUNNEL_URL=https://committed.example\n',
    );
    const { port } = await startDevServer();
    const response = await get(port, 'committed.example');
    expect(response.status).toBe(200);
    await readAsGhost(JSON.parse(response.body), 'https://committed.example/ghost-app.json');
  });

  it.each(['https://tunnel.example/path', 'https://tunnel.example;x', 'tunnel.example'])(
    'refuses %s, which is not a tunnel address',
    (tunnelUrl) => {
      expect(() => ghostApp({ tunnelUrl })).toThrow("expected a tunnel's address");
    },
  );

  it('refuses a tunnel that is not an address', () => {
    expect(() => ghostApp({ tunnelUrl: 'https://tunnel.example/path' })).toThrow(
      "expected a tunnel's address such as https://example.trycloudflare.com",
    );
  });

  it('prints the name from an ID in a manifest that starts with a byte order mark', async () => {
    const { port, logger } = await startDevServer();
    await writeFile(join(root, 'ghost-app.json'), `\uFEFF${JSON.stringify(SOURCE)}`);
    server!.printUrls();
    expect(logger.messages.map(({ text }) => text).join('\n')).toContain(
      `Ghost app: http://hello.localhost:${port}/ghost-app.json`,
    );
  });

  it.each([
    ['names no valid ID', '{"id":"Not an ID"}'],
    ['is not JSON', 'not JSON'],
  ])('prints the app at app.localhost when the manifest %s', async (_name, source) => {
    const { port, logger } = await startDevServer();
    await writeFile(join(root, 'ghost-app.json'), source);
    server!.printUrls();
    expect(logger.messages.map(({ text }) => text).join('\n')).toContain(
      `Ghost app: http://app.localhost:${port}/ghost-app.json`,
    );
  });

  it('answers with the error when the manifest cannot be read', async () => {
    const { port, logger } = await startDevServer();
    await rm(join(root, 'ghost-app.json'));
    const response = await get(port, `hello.localhost:${port}`);
    expect(response.status).toBe(500);
    // The detail, with a path on this machine, goes to the terminal only.
    expect(response.body).not.toContain('ENOENT');
    expect(response.body).toContain("ghost-app.json couldn't be signed");
    expect(
      logger.messages.some(({ level, text }) => level === 'error' && text.includes('ENOENT')),
    ).toBe(true);
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
      for (const host of [`hello.localhost:${port}`, 'tunnel.example']) {
        for (const path of [`/${file}`, `/@fs${root}/${file}`, `/${file}?import`, `/${file}?raw`]) {
          const response = await get(port, host, path);
          expect(response.status, `${host}${path}`).toBe(403);
          expect(response.body).not.toContain('"d"');
          expect(response.body).not.toContain('SECRET');
        }
      }
    });

    it('copies the defaults the installed Vite resolves, so none is dropped', async () => {
      const resolved = await resolveConfig(
        { root, configFile: false, logLevel: 'silent' },
        'serve',
      );
      expect(resolved.server.fs.deny).toEqual(VITE_DEFAULT_DENY);
    });

    it("keeps Vite's own refusals, and the project's", async () => {
      await writeFile(join(root, '.env'), 'SECRET=1\n');
      await writeFile(join(root, 'secret.txt'), 'SECRET=1\n');
      const { port } = await startDevServer(undefined, { worker: false });
      expect((await get(port, `hello.localhost:${port}`, '/.env')).status).toBe(403);
      await server!.close();

      const own = await startDevServer(undefined, {
        worker: false,
        serverOptions: { fs: { deny: ['secret.txt'] } },
      });
      // `.env` too, which the project's list leaves out, as the plugin may put the key there.
      for (const path of ['/secret.txt', '/.ghost-app/production/identity.json', '/.env']) {
        expect((await get(own.port, `localhost:${own.port}`, path)).status).toBe(403);
      }
    });

    it('refuses to start with server.fs.strict off, which would serve every file', async () => {
      await expect(
        startDevServer(undefined, { worker: false, serverOptions: { fs: { strict: false } } }),
      ).rejects.toThrow('server.fs.strict is false');
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
        const response = await get(port, `hello.localhost:${port}`);
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
        for (const hostHeader of ['hello.localhost', 'hello.localhost:80']) {
          const response = await get(port, hostHeader);
          expect(response.status).toBe(200);
          await readAsGhost(JSON.parse(response.body), 'http://hello.localhost/ghost-app.json');
        }
      } finally {
        http.close();
      }
    });
  });

  it('answers a manifest that cannot be signed with its problems', async () => {
    await writeFile(join(root, 'ghost-app.json'), JSON.stringify({ name: 'Hello' }));
    const { port, logger } = await startDevServer();
    const response = await get(port, `hello.localhost:${port}`);
    expect(response.status).toBe(500);
    expect(JSON.parse(response.body)).toMatchObject({ code: 'APP_MANIFEST_INVALID' });
    expect(
      logger.messages.some(({ level, text }) => level === 'error' && text.includes('id:')),
    ).toBe(true);
  });

  it('refuses a root a later plugin moves away from where it made the keys', async () => {
    await mkdir(join(root, 'app'));
    const mover: Plugin = { name: 'mover', config: () => ({ root: join(root, 'app') }) };
    await expect(
      createServer({
        root,
        configFile: false,
        customLogger: recordingLogger(),
        plugins: [ghostApp(), mover],
        server: { port: 0, host: 'localhost' },
      }),
    ).rejects.toThrow(
      `the development keys are in ${root}, but a plugin moved Vite's root to ${join(root, 'app')}`,
    );
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
        expect.objectContaining({
          level: 'warn',
          text: expect.stringContaining("to something that isn't a private key as JSON"),
        }),
      );
    });

    describe("reads .dev.vars by dotenv's rules, as Wrangler does", () => {
      async function warningsFor(text: (key: string) => string) {
        await createKeys({ root, mode: 'development' });
        const key = JSON.stringify(await readBackendKey({ root, mode: 'development' }));
        await writeFile(join(root, '.dev.vars'), text(key));
        const { logger } = await startDevServer();
        await server!.close();
        return logger.messages.filter(({ level }) => level === 'warn').map(({ text: t }) => t);
      }

      it.each([
        [
          'the last assignment',
          (key: string) =>
            `GHOST_APP_BACKEND_KEY=${JSON.stringify(generateKey())}\nGHOST_APP_BACKEND_KEY='${key}'\n`,
        ],
        [
          'an unquoted value before a comment',
          (key: string) => `GHOST_APP_BACKEND_KEY=${key} # development\n`,
        ],
        [
          'an exported, double-quoted value',
          (key: string) => `export GHOST_APP_BACKEND_KEY="${key}"\n`,
        ],
      ])('takes %s', async (_name, text) => {
        expect(await warningsFor(text)).toEqual([]);
      });

      it("says a value with escaped quotes isn't a key, as Wrangler keeps the backslashes", async () => {
        const warnings = await warningsFor(
          (key) => `GHOST_APP_BACKEND_KEY="${key.replaceAll('"', '\\"')}"\n`,
        );
        expect(warnings).toEqual([expect.stringContaining("isn't a private key as JSON")]);
      });

      it("says a public key isn't the private key the Worker needs", async () => {
        const warnings = await warningsFor(
          (key) => `GHOST_APP_BACKEND_KEY='${JSON.stringify(publicKeyOf(JSON.parse(key)))}'\n`,
        );
        expect(warnings).toEqual([expect.stringContaining("isn't a private key as JSON")]);
      });

      it.each([
        ['kty', { kty: 'EC' }],
        ['crv', { crv: 'X25519' }],
      ])(
        "says the development key with another %s isn't a key the Worker can use",
        async (_name, change) => {
          const warnings = await warningsFor(
            (key) =>
              `GHOST_APP_BACKEND_KEY='${JSON.stringify({ ...JSON.parse(key), ...change })}'\n`,
          );
          expect(warnings).toEqual([expect.stringContaining("isn't a private key as JSON")]);
        },
      );

      it('says when the last assignment is another key', async () => {
        const warnings = await warningsFor(
          (key) =>
            `GHOST_APP_BACKEND_KEY='${key}'\nGHOST_APP_BACKEND_KEY='${JSON.stringify(generateKey())}'\n`,
        );
        expect(warnings).toEqual([expect.stringContaining('to another key')]);
      });
    });

    it('leaves .env to the developer, which Wrangler reads only without .dev.vars', async () => {
      await writeFile(join(root, '.env'), 'OTHER=1\n');
      const { logger } = await startDevServer();
      expect(existsSync(join(root, '.dev.vars'))).toBe(false);
      expect(logger.messages).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          text: expect.stringContaining(
            "Wrangler reads .env when there's no .dev.vars, so add GHOST_APP_BACKEND_KEY to one of them",
          ),
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

    it("reads CLOUDFLARE_ENV from the mode's .env files, as Cloudflare's plugin does", async () => {
      await writeFile(join(root, '.env.development'), 'CLOUDFLARE_ENV=staging\n');
      await writeFile(join(root, '.dev.vars.staging'), 'OTHER=1\n');
      const { logger } = await startDevServer();
      expect(logger.messages).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          text: expect.stringContaining('Wrangler reads .dev.vars.staging instead of .dev.vars'),
        }),
      );
      expect(existsSync(join(root, '.dev.vars'))).toBe(false);
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

  it('says which identity key it signed with', async () => {
    await createKeys({ root, mode: 'production' });
    vi.stubEnv('GHOST_APP_URL', 'https://hello.example.com');
    // Blank, so the file is used, and named.
    vi.stubEnv('GHOST_APP_IDENTITY_KEY', '  ');
    const fromFile = await buildApp();
    expect(fromFile.messages.map(({ text }) => text)).toContain(
      'ghost-app: signed ghost-app.json for https://hello.example.com/ghost-app.json with .ghost-app/production/identity.json',
    );

    // The same key as the file, as a different one is refused.
    vi.stubEnv(
      'GHOST_APP_IDENTITY_KEY',
      await readFile(join(root, '.ghost-app/production/identity.json'), 'utf8'),
    );
    const fromEnv = await buildApp();
    expect(fromEnv.messages.map(({ text }) => text)).toContain(
      'ghost-app: signed ghost-app.json for https://hello.example.com/ghost-app.json with GHOST_APP_IDENTITY_KEY',
    );
  });

  it.each([['GHOST_'], ['GHOST_APP_'], [['VITE_', 'GHOST_APP_BACKEND']]])(
    'refuses an envPrefix of %j, which would put the private keys in the bundle',
    async (envPrefix) => {
      await expect(
        build({
          root,
          configFile: false,
          envPrefix,
          customLogger: recordingLogger(),
          plugins: [ghostApp()],
          build: { outDir: outDir() },
        }),
      ).rejects.toThrow("the app's private keys, to the client bundle");
      expect(existsSync(outDir())).toBe(false);
    },
  );

  it("accepts an envPrefix the keys don't start with", async () => {
    await expect(
      build({
        root,
        configFile: false,
        envPrefix: ['VITE_', 'GHOST_APP_URL'],
        customLogger: recordingLogger(),
        plugins: [ghostApp()],
        build: { outDir: outDir() },
      }),
    ).resolves.toBeDefined();
  });

  describe('publicDir', () => {
    const buildWith = (publicDir: string | false) =>
      build({
        root,
        configFile: false,
        publicDir,
        customLogger: recordingLogger(),
        plugins: [ghostApp()],
        build: { outDir: outDir() },
      });

    // Vite serves it without fs.deny, and copies it into the build.
    it.each(['.', '.ghost-app', '.ghost-app/production'])(
      'refuses %s, which would serve and ship the private keys',
      async (publicDir) => {
        await createKeys({ root, mode: 'production' });
        await expect(buildWith(publicDir)).rejects.toThrow(
          'holds .ghost-app/ or .dev.vars, which Vite would serve',
        );
        expect(existsSync(outDir())).toBe(false);
      },
    );

    it.each([
      ['the keys', '.ghost-app/production'],
      ['the project', '.'],
    ])('refuses one that links to %s', async (_name, target) => {
      await createKeys({ root, mode: 'production' });
      await symlink(join(root, target), join(root, 'public'));
      await expect(buildWith('public')).rejects.toThrow(
        'holds .ghost-app/ or .dev.vars, which Vite would serve',
      );
      expect(existsSync(outDir())).toBe(false);
    });

    // Only where the filesystem ignores case, as macOS's does by default.
    it.skipIf(!existsSync(fileURLToPath(import.meta.url).toUpperCase()))(
      'refuses the keys named in another case',
      async () => {
        await createKeys({ root, mode: 'production' });
        await expect(buildWith('.GHOST-APP/production')).rejects.toThrow(
          'holds .ghost-app/ or .dev.vars, which Vite would serve',
        );
      },
    );

    // Vite copies publicDir following its links.
    it.each([
      ['the keys', 'keys', '../.ghost-app'],
      ['a key', 'nested/identity.json', '../../.ghost-app/production/identity.json'],
      ['the project', 'root', '..'],
      ['.dev.vars', 'vars', '../.dev.vars'],
      ['.dev.vars.<environment>', 'staging', '../.dev.vars.staging'],
    ])('refuses a link in it to %s', async (_name, link, target) => {
      await createKeys({ root, mode: 'production' });
      await writeFile(join(root, '.dev.vars'), 'SECRET=1\n');
      await writeFile(join(root, '.dev.vars.staging'), 'SECRET=1\n');
      await mkdir(dirname(join(root, 'public', link)), { recursive: true });
      await symlink(target, join(root, 'public', link));
      await expect(buildWith('public')).rejects.toThrow(
        'Vite would copy the private keys into the build through it',
      );
      expect(existsSync(outDir())).toBe(false);
    });

    it('refuses a link to a .dev.vars that is itself a link', async () => {
      await createKeys({ root, mode: 'production' });
      await writeFile(join(root, 'worker-secrets'), 'SECRET=1\n');
      await symlink('worker-secrets', join(root, '.dev.vars'));
      await mkdir(join(root, 'public'));
      await symlink('../.dev.vars', join(root, 'public/vars'));
      await expect(buildWith('public')).rejects.toThrow(
        'Vite would copy the private keys into the build through it',
      );
      expect(existsSync(outDir())).toBe(false);
    });

    // Only where the filesystem ignores case, as macOS's does by default.
    it.skipIf(!existsSync(fileURLToPath(import.meta.url).toUpperCase())).each([
      ['a file', async () => writeFile(join(root, '.DEV.VARS'), 'SECRET=1\n')],
      [
        'a link',
        async () => {
          await writeFile(join(root, 'worker-secrets'), 'SECRET=1\n');
          await symlink('worker-secrets', join(root, '.DEV.VARS'));
        },
      ],
    ])('refuses a link to a .DEV.VARS that is %s, named in another case', async (_name, make) => {
      await createKeys({ root, mode: 'production' });
      await make();
      await mkdir(join(root, 'public'));
      await symlink('../.dev.vars', join(root, 'public/vars'));
      await expect(buildWith('public')).rejects.toThrow(
        'Vite would copy the private keys into the build through it',
      );
      expect(existsSync(outDir())).toBe(false);
    });

    it.each([
      [
        'a key that is a link elsewhere',
        '../.ghost-app/production/identity.json',
        async () => {
          await rename(
            join(root, '.ghost-app/production/identity.json'),
            join(root, 'identity-secret'),
          );
          await symlink('../../identity-secret', join(root, '.ghost-app/production/identity.json'));
        },
      ],
      [
        "a mode's directory that is a link elsewhere",
        '../.ghost-app/production',
        async () => {
          await rename(join(root, '.ghost-app/production'), join(root, 'prod-keys'));
          await symlink('../prod-keys', join(root, '.ghost-app/production'));
        },
      ],
    ])('refuses a link to %s', async (_name, target, move) => {
      await createKeys({ root, mode: 'production' });
      await move();
      await mkdir(join(root, 'public'));
      await symlink(target, join(root, 'public/secret'));
      await expect(buildWith('public')).rejects.toThrow(
        'Vite would copy the private keys into the build through it',
      );
      expect(existsSync(outDir())).toBe(false);
    });

    it('refuses a link to the keys inside a directory it links to', async () => {
      await createKeys({ root, mode: 'production' });
      await mkdir(join(root, 'shared-assets'));
      await symlink('../.ghost-app/production', join(root, 'shared-assets/private'));
      await mkdir(join(root, 'public'));
      await symlink('../shared-assets', join(root, 'public/shared'));
      await expect(buildWith('public')).rejects.toThrow(
        'Vite would copy the private keys into the build through it',
      );
      expect(existsSync(outDir())).toBe(false);
    });

    it('ends a cycle of linked directories', async () => {
      await createKeys({ root, mode: 'production' });
      await mkdir(join(root, 'a'));
      await mkdir(join(root, 'public'));
      await symlink('../public', join(root, 'a/back'));
      await symlink('../a', join(root, 'public/a'));
      // The walk ends without refusing anything: the build succeeds, or Vite's own copy refuses the
      // cycle. A walk that never ended would overflow the stack instead.
      const outcome: unknown = await buildWith('public').catch((error: unknown) => error);
      if (outcome instanceof Error) {
        expect(outcome).not.toBeInstanceOf(RangeError);
        expect(String(outcome)).not.toContain('Maximum call stack size exceeded');
        expect(String(outcome)).toMatch(/vite:prepare-out-dir|ELOOP/);
      }
    });

    it('accepts links in it to anything else', async () => {
      await createKeys({ root, mode: 'production' });
      await mkdir(join(root, 'assets'));
      await mkdir(join(root, 'public'));
      await writeFile(join(root, 'assets/logo.svg'), '<svg/>');
      await symlink('../assets', join(root, 'public/assets'));
      await symlink('../main.js', join(root, 'public/main.js'));
      await expect(buildWith('public')).resolves.toBeDefined();
    });

    it.each(['public', false] as const)('accepts %s', async (publicDir) => {
      await expect(buildWith(publicDir)).resolves.toBeDefined();
    });
  });

  it('builds whatever GHOST_APP_TUNNEL_URL holds, as only the dev server reads it', async () => {
    vi.stubEnv('GHOST_APP_TUNNEL_URL', 'not a tunnel');
    await expect(buildApp()).resolves.toBeDefined();
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
    const warning = logger.messages.find(({ level }) => level === 'warn')?.text;
    expect(warning).toContain('this build emits no signed ghost-app.json');
    expect(warning).toContain('in .env.production or the environment');
    expect(warning).not.toContain('emptyOutDir');
  });

  it("says an earlier build's ghost-app.json is left in outDir when it isn't emptied, and keeps it", async () => {
    await mkdir(outDir());
    await writeFile(join(outDir(), 'ghost-app.json'), '{"earlier":true}');
    const logger = recordingLogger();
    await build({
      root,
      configFile: false,
      customLogger: logger,
      plugins: [ghostApp()],
      build: { outDir: outDir(), emptyOutDir: false },
    });
    expect(await readFile(join(outDir(), 'ghost-app.json'), 'utf8')).toBe('{"earlier":true}');
    expect(logger.messages.find(({ level }) => level === 'warn')?.text).toContain(
      `build.emptyOutDir is false, so any ghost-app.json already in ${outDir()} is left as it is.`,
    );
  });

  it('reads .env files from the envDir the project names, against its root as Vite does', async () => {
    await createKeys({ root, mode: 'production' });
    await mkdir(join(root, 'config'));
    await writeFile(
      join(root, 'config/.env.production'),
      'GHOST_APP_URL=https://config.example.com\n',
    );
    // The tests run from the package, not the project, so a path against the cwd misses.
    expect(process.cwd()).not.toBe(root);
    await build({
      root,
      configFile: false,
      envDir: 'config',
      customLogger: recordingLogger(),
      plugins: [ghostApp()],
      build: { outDir: outDir() },
    });
    const signed = JSON.parse(await readFile(join(outDir(), 'ghost-app.json'), 'utf8'));
    await readAsGhost(signed, 'https://config.example.com/ghost-app.json');
  });

  it('reads GHOST_APP_URL from the envDir a later plugin names', async () => {
    await createKeys({ root, mode: 'production' });
    await mkdir(join(root, 'config'));
    await writeFile(
      join(root, 'config/.env.production'),
      'GHOST_APP_URL=https://later.example.com\n',
    );
    const later: Plugin = { name: 'later', config: () => ({ envDir: 'config' }) };
    await build({
      root,
      configFile: false,
      customLogger: recordingLogger(),
      plugins: [ghostApp(), later],
      build: { outDir: outDir() },
    });
    const signed = JSON.parse(await readFile(join(outDir(), 'ghost-app.json'), 'utf8'));
    await readAsGhost(signed, 'https://later.example.com/ghost-app.json');
  });

  it('reads GHOST_APP_URL from .env.production, which the environment overrides', async () => {
    await createKeys({ root, mode: 'production' });
    await writeFile(join(root, '.env.production'), 'GHOST_APP_URL=https://committed.example.com\n');
    // Another mode's file doesn't count.
    await writeFile(join(root, '.env.development'), 'GHOST_APP_URL=https://dev.example.com\n');
    await buildApp();
    const read = async () => JSON.parse(await readFile(join(outDir(), 'ghost-app.json'), 'utf8'));
    await readAsGhost(await read(), 'https://committed.example.com/ghost-app.json');

    vi.stubEnv('GHOST_APP_URL', 'https://env.example.com');
    await buildApp();
    await readAsGhost(await read(), 'https://env.example.com/ghost-app.json');
  });

  it('fails for a GHOST_APP_URL that is not one, or a manifest that cannot be signed', async () => {
    await createKeys({ root, mode: 'production' });
    for (const appUrl of [
      'hello',
      'https://hello.example.com?v=1',
      'https://hello.example.com/#x',
      'https://hello.example.com?',
    ]) {
      vi.stubEnv('GHOST_APP_URL', appUrl);
      await expect(buildApp(), appUrl).rejects.toThrow(
        "GHOST_APP_URL must be the app's public address",
      );
    }

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
