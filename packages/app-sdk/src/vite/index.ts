/**
 * A Vite plugin that serves and builds an app's signed manifest.
 *
 * ```ts
 * import { cloudflare } from '@cloudflare/vite-plugin';
 * import { ghostApp } from '@tryghost/app-sdk/vite';
 * import { defineConfig } from 'vite';
 *
 * export default defineConfig({ plugins: [ghostApp(), cloudflare()] });
 * ```
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';

import { isLocalhost } from '@tryghost/app-contracts';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';

import { createKeys, keyFile } from '../tooling/keys.ts';
import { MANIFEST_PATH, formatErrors } from '../shared/manifest.ts';
import { MANIFEST_FILE, serialiseSigned, signProject } from '../tooling/sign.ts';
import { provideDevBackendKey } from './dev-vars.ts';

// What Vite denies when a project names nothing to deny, as of Vite 8. A project's own list
// replaces these rather than adding to them, so they're added again here alongside the keys.
const VITE_DEFAULT_DENY = [
  '.env',
  '.env.*',
  '*.{crt,pem,key,p12,pfx,cer,der}',
  '.npmrc',
  '.yarnrc.yml',
  '**/.git/**',
];

// The private keys, and `.dev.vars`, which holds the development backend key. Vite serves the
// project's root, so without these anyone who can reach the dev server, through a tunnel too,
// could read them as files, through `/@fs/` or as imports.
const DENY = ['**/.ghost-app/**', '.dev.vars*'];

/** A URL's port, or the scheme's default when the URL leaves it out. */
const effectivePort = (url: URL) => url.port || (url.protocol === 'https:' ? '443' : '80');

export interface GhostAppOptions {
  /** The readable manifest, relative to Vite's root. `ghost-app.json` by default. */
  manifest?: string;
  /**
   * The public addresses of tunnels to the dev server, such as
   * `https://example.trycloudflare.com`, which `vite dev` also signs the manifest for. Read from
   * `GHOST_APP_TUNNEL_URL` (comma-separated) by default, in the environment or the mode's `.env`
   * files.
   */
  tunnelUrl?: string | readonly string[];
}

function readTunnels(input: string | readonly string[] | undefined): string[] {
  const entries = typeof input === 'string' ? input.split(',') : (input ?? []);
  return entries
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const url = URL.parse(entry);
      if (
        !url ||
        (url.protocol !== 'https:' && url.protocol !== 'http:') ||
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        url.username ||
        url.password
      ) {
        throw new Error(
          `ghost-app: expected a tunnel's address such as https://example.trycloudflare.com, not ${entry}`,
        );
      }
      return url.origin;
    });
}

const installLink = (manifestUrl: string) => {
  const ghost = (process.env.GHOST_URL?.trim() || 'http://localhost:2368').replace(/\/+$/, '');
  return `${ghost}/ghost/#/apps/install?manifest=${encodeURIComponent(manifestUrl)}`;
};

/**
 * Signs `ghost-app.json` with the app's keys, as the dev server serves it and as the build
 * emits it:
 *
 * - `vite dev` creates the development keys in `.ghost-app/` on its first run, and serves
 *   `/ghost-app.json` signed for the address it's requested at: `localhost` on the dev
 *   server's port, or one of the tunnels it's told about. It refuses any other host, as
 *   signing for whatever a request names would let anyone pass for the app. In a Cloudflare
 *   Workers project, it adds the development backend key to `.dev.vars`, so the Worker answers
 *   Ghost's challenge in development as it does in production.
 * - `vite build` signs it for `GHOST_APP_URL`, from the environment or the mode's `.env` files
 *   such as `.env.production`, with the production keys, from `.ghost-app/` or
 *   `GHOST_APP_IDENTITY_KEY` and `GHOST_APP_BACKEND_KEY`, and emits it with the client build.
 *   Without `GHOST_APP_URL` it emits none, and says so. It never creates a production key.
 *
 * List it before `cloudflare()`. The identity key never reaches a bundle: only the signed
 * manifest is served or emitted.
 */
export function ghostApp(options: GhostAppOptions = {}): Plugin {
  const manifestFile = options.manifest ?? MANIFEST_FILE;
  // An option is checked at once; the environment's once the config hook has read it.
  let tunnels = options.tunnelUrl === undefined ? [] : readTunnels(options.tunnelUrl);
  let appUrl: string | undefined;
  let config: ResolvedConfig;
  let pending: { level: 'info' | 'warn'; message: string } | undefined;
  let warnedUnsigned = false;
  // The port the project names, for middleware mode, where the dev server doesn't listen itself.
  let configuredPort: number | undefined;

  /** The manifest URL to sign for a request's Host, or `undefined` if it isn't one of ours. */
  function manifestUrlFor(host: string | undefined, port: number | undefined): string | undefined {
    const scheme = config.server.https ? 'https' : 'http';
    // Parsed, so the host is compared in the URL parser's normalised form.
    const url = URL.parse(`${scheme}://${host ?? ''}`);
    if (!url) {
      return undefined;
    }
    const tunnel = tunnels.find((origin) => new URL(origin).host === url.host);
    if (tunnel) {
      return `${tunnel}${MANIFEST_PATH}`;
    }
    if (port !== undefined && effectivePort(url) === String(port) && isLocalhost(url.hostname)) {
      return `${url.origin}${MANIFEST_PATH}`;
    }
    return undefined;
  }

  const portOf = (server: ViteDevServer) => {
    const address = server.httpServer?.address();
    return typeof address === 'object' && address ? address.port : configuredPort;
  };

  async function serveManifest(server: ViteDevServer, req: IncomingMessage, res: ServerResponse) {
    const port = portOf(server);
    const manifestUrl = manifestUrlFor(req.headers.host, port);
    if (!manifestUrl) {
      const allowed = [
        `localhost:${port ?? '<port>'}`,
        ...tunnels.map((origin) => new URL(origin).host),
      ];
      res.statusCode = 421;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end(
        `The dev server signs ghost-app.json only for ${allowed.join(', ')}, not ${req.headers.host ?? 'a request without a Host'}. Name a tunnel's address with GHOST_APP_TUNNEL_URL.\n`,
      );
      return;
    }
    const result = await signProject({
      root: config.root,
      mode: 'development',
      manifestUrl,
      manifestFile,
    });
    if (!result.success) {
      const problems = formatErrors(result.errors);
      config.logger.error(`ghost-app: ${manifestFile} can't be signed:\n${problems}`, {
        timestamp: true,
      });
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ code: result.code, errors: result.errors }));
      return;
    }
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(result.signed));
  }

  return {
    name: '@tryghost/app-sdk/vite',
    // Before other plugins, Cloudflare's included, so the development keys and `.dev.vars`
    // exist before they start the backend, and the manifest route comes before theirs and
    // before Vite serves `ghost-app.json` from the project as a file.
    enforce: 'pre',

    async config(userConfig, { command, isPreview, mode }) {
      // Read as Vite reads the mode's `.env` files, so a project can keep its address in
      // `.env.production`. The environment wins. Vite is only imported here, when it runs the
      // plugin, as it's an optional peer dependency.
      const envDir = userConfig.envDir ?? userConfig.root ?? '';
      const { loadEnv } = await import('vite');
      const files =
        envDir === false
          ? {}
          : loadEnv(mode, resolve(envDir), ['GHOST_APP_URL', 'GHOST_APP_TUNNEL_URL']);
      const read = (name: string) => process.env[name]?.trim() || files[name]?.trim() || undefined;
      appUrl = read('GHOST_APP_URL');
      if (options.tunnelUrl === undefined) {
        tunnels = readTunnels(read('GHOST_APP_TUNNEL_URL'));
      }

      if (command !== 'serve' || isPreview) {
        return undefined;
      }
      // Port 0 asks for any free port, which only a dev server listening itself can have.
      configuredPort = (userConfig.server?.middlewareMode && userConfig.server.port) || undefined;
      // Vitest loads the project's Vite config as a dev server, which shouldn't create keys or
      // write `.dev.vars` on every test run.
      if (!process.env.VITEST && mode !== 'test') {
        const root = resolve(userConfig.root ?? '');
        await createKeys({ root, mode: 'development' });
        pending = await provideDevBackendKey(root);
      }
      return {
        server: {
          // Merged after the project's own list, which replaces Vite's defaults when it has one.
          fs: { deny: [...(userConfig.server?.fs?.deny ? [] : VITE_DEFAULT_DENY), ...DENY] },
          // Vite refuses requests for a host it doesn't know, so the tunnels are added.
          ...(tunnels.length > 0 && userConfig.server?.allowedHosts !== true
            ? { allowedHosts: tunnels.map((origin) => new URL(origin).hostname) }
            : {}),
        },
      };
    },

    configResolved(resolved) {
      config = resolved;
      if (pending) {
        config.logger[pending.level](`ghost-app: ${pending.message}`);
        pending = undefined;
      }
    },

    configureServer(server) {
      if (config.server.middlewareMode && configuredPort === undefined && tunnels.length === 0) {
        config.logger.warn(
          `ghost-app: in middleware mode, set server.port to the port the app is served on, or name a tunnel with GHOST_APP_TUNNEL_URL, so the dev server can sign ghost-app.json for it.`,
        );
      }
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== MANIFEST_PATH || (req.method !== 'GET' && req.method !== 'HEAD')) {
          next();
          return;
        }
        serveManifest(server, req, res).catch((error: unknown) => {
          config.logger.error(`ghost-app: ${(error as Error).message}`, { timestamp: true });
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain; charset=utf-8');
          }
          res.end(`${(error as Error).message}\n`);
        });
      });

      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        printUrls();
        const port = portOf(server);
        const scheme = config.server.https ? 'https' : 'http';
        const urls = [
          ...(port === undefined ? [] : [`${scheme}://localhost:${port}${MANIFEST_PATH}`]),
          ...tunnels.map((origin) => `${origin}${MANIFEST_PATH}`),
        ];
        const lines = urls.flatMap((url) => [
          `  Ghost app: ${url}`,
          `  Install:   ${installLink(url)}`,
        ]);
        config.logger.info(`\n${lines.join('\n')}\n`);
      };
    },

    async buildStart() {
      if (config.command !== 'build' || this.environment.config.consumer !== 'client') {
        return;
      }
      if (!appUrl) {
        if (!warnedUnsigned) {
          warnedUnsigned = true;
          config.logger.warn(
            `ghost-app: GHOST_APP_URL isn't set, so this build has no signed ghost-app.json: it can't be installed, and deploying it takes the app down wherever it's installed. Set GHOST_APP_URL to the app's public address, such as https://app.example.com, in .env.production or the environment, to sign the manifest for <GHOST_APP_URL>/ghost-app.json.`,
          );
        }
        return;
      }
      const base = URL.parse(appUrl.endsWith('/') ? appUrl : `${appUrl}/`);
      if (!base) {
        this.error(
          `ghost-app: GHOST_APP_URL must be the app's public address, such as https://app.example.com, not ${appUrl}`,
        );
      }
      const manifestUrl = new URL(MANIFEST_PATH.slice(1), base).href;
      let result;
      try {
        result = await signProject({
          root: config.root,
          mode: 'production',
          manifestUrl,
          manifestFile,
        });
      } catch (error) {
        this.error(`ghost-app: ${(error as Error).message}`);
      }
      if (!result.success) {
        this.error(
          `ghost-app: ${manifestFile} can't be signed for ${manifestUrl}:\n${formatErrors(result.errors)}`,
        );
      }
      this.emitFile({
        type: 'asset',
        fileName: MANIFEST_PATH.slice(1),
        source: serialiseSigned(result.signed),
      });
      config.logger.info(
        `ghost-app: signed ghost-app.json for ${manifestUrl} with ${process.env.GHOST_APP_IDENTITY_KEY ? 'GHOST_APP_IDENTITY_KEY' : keyFile('production', 'identity')}`,
      );
    },
  };
}
