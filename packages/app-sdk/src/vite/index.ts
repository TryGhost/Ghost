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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { isLocalhost, isValidAppId } from '@tryghost/app-contracts';
import { parseJsonText } from '@tryghost/app-contracts/identity';
import type { Plugin, ResolvedConfig } from 'vite';

import {
  BACKEND_KEY_VARIABLE,
  IDENTITY_KEY_VARIABLE,
  KEYS_DIRECTORY,
  createKeys,
  signingKeySource,
} from '../tooling/keys.ts';
import { MANIFEST_PATH } from '../shared/manifest.ts';
import { parseOrigin } from '../shared/parse.ts';
import { MANIFEST_FILE, formatErrors, serialiseSigned, signProject } from '../tooling/sign.ts';
import { DENY, VITE_DEFAULT_DENY } from './deny.ts';
import { provideDevBackendKey } from './dev-vars.ts';

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
      const origin = parseOrigin(entry);
      if (!origin) {
        throw new Error(
          `ghost-app: expected a tunnel's address such as https://example.trycloudflare.com, not ${entry}`,
        );
      }
      return origin;
    });
}

/**
 * The name `vite dev` prints the app at, such as `hello-world.localhost` for
 * `org.ghost.hello-world`, as Ghost on `localhost` refuses an app on its own host.
 */
function devHostname(manifestFile: string): string {
  try {
    const { id } = parseJsonText(readFileSync(manifestFile, 'utf8')) as { id?: unknown };
    if (isValidAppId(id)) {
      return `${id.slice(id.lastIndexOf('.') + 1)}.localhost`;
    }
  } catch {
    // Signing says what's wrong when the manifest is requested.
  }
  return 'app.localhost';
}

/**
 * Signs `ghost-app.json` with the app's keys, as the dev server serves it and as the build
 * emits it:
 *
 * - `vite dev` creates the development keys in `.ghost-app/` on its first run, and serves
 *   `/ghost-app.json` signed for the address it's requested at: a name for this machine, or one
 *   of the tunnels it's told about. In a Cloudflare Workers project, it adds the development
 *   backend key to `.dev.vars`.
 * - `vite build` signs it for `GHOST_APP_URL` with the production keys, and emits it with the
 *   client build.
 *
 * List it before `cloudflare()`.
 */
export function ghostApp(options: GhostAppOptions = {}): Plugin {
  const manifestFile = options.manifest ?? MANIFEST_FILE;
  let tunnels: string[] = [];
  let appUrl: string | undefined;
  let ghostUrl: string | undefined;
  let config: ResolvedConfig;
  let pending: { level: 'info' | 'warn'; message: string } | undefined;
  // Whether this is `vite dev`, not a build, `vite preview` or Vitest loading the config.
  let dev = false;

  /** The manifest URL to sign for a request's Host, or `undefined` if it isn't one of ours. */
  function manifestUrlFor(host: string | undefined): string | undefined {
    const url = URL.parse(`${config.server.https ? 'https' : 'http'}://${host ?? ''}`);
    const tunnel = tunnels.find((origin) => new URL(origin).host === url?.host);
    if (tunnel) {
      return `${tunnel}${MANIFEST_PATH}`;
    }
    // Signing for any other host would let anyone pass for the app.
    return url && isLocalhost(url.hostname) ? `${url.origin}${MANIFEST_PATH}` : undefined;
  }

  return {
    name: '@tryghost/app-sdk/vite',
    // Before Cloudflare's plugin, so the keys and `.dev.vars` exist before it starts the Worker,
    // and the manifest route comes before the Worker and Vite's own file serving.
    enforce: 'pre',

    async config(userConfig, { command, isPreview, mode }) {
      const root = resolve(userConfig.root ?? '');
      // Imported here, as Vite is an optional peer dependency. The environment wins over files.
      const { loadEnv } = await import('vite');
      const env =
        userConfig.envDir === false
          ? process.env
          : // By name, as every `GHOST_` variable would include the private keys CI signs with.
            loadEnv(mode, resolve(root, userConfig.envDir ?? ''), [
              'GHOST_APP_URL',
              'GHOST_APP_TUNNEL_URL',
              'GHOST_URL',
            ]);
      appUrl = env.GHOST_APP_URL?.trim() || undefined;
      ghostUrl = env.GHOST_URL?.trim() || undefined;
      if (command !== 'serve' || isPreview) {
        return undefined;
      }
      tunnels = readTunnels(options.tunnelUrl ?? env.GHOST_APP_TUNNEL_URL);
      // Vitest loads the project's Vite config as a dev server, which shouldn't create keys.
      dev = !process.env.VITEST && mode !== 'test';
      if (dev) {
        await createKeys({ root, mode: 'development' });
        pending = await provideDevBackendKey(root);
      }
      return {
        server: {
          // A plugin's list replaces Vite's defaults when the project has none, so they're added.
          fs: { deny: [...(userConfig.server?.fs?.deny ? [] : VITE_DEFAULT_DENY), ...DENY] },
          ...(tunnels.length > 0 && userConfig.server?.allowedHosts !== true
            ? { allowedHosts: tunnels.map((origin) => new URL(origin).hostname) }
            : {}),
        },
      };
    },

    configResolved(resolved) {
      config = resolved;
      // Vite gives client code every variable that starts with an env prefix.
      const exposed = [resolved.envPrefix ?? 'VITE_']
        .flat()
        .find((prefix) =>
          [IDENTITY_KEY_VARIABLE, BACKEND_KEY_VARIABLE].some((name) => name.startsWith(prefix)),
        );
      if (exposed !== undefined) {
        throw new Error(
          `ghost-app: envPrefix ${JSON.stringify(exposed)} would expose ${IDENTITY_KEY_VARIABLE} and ${BACKEND_KEY_VARIABLE}, the app's private keys, to the client bundle. Use a prefix they don't start with, such as VITE_.`,
        );
      }
      // Vite checks `server.fs.deny` only with `fs.strict` on.
      if (dev && !resolved.server.fs.strict) {
        throw new Error(
          `ghost-app: server.fs.strict is false, so the dev server would serve ${KEYS_DIRECTORY}/ and .dev.vars, the private keys, to anyone who can reach it. Leave it on, and name other directories in server.fs.allow.`,
        );
      }
      if (pending) {
        config.logger[pending.level](`ghost-app: ${pending.message}`);
      }
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== MANIFEST_PATH || !['GET', 'HEAD'].includes(req.method!)) {
          next();
          return;
        }
        // HTTP/2, which Vite serves with server.https, names the host in `:authority`.
        const host = req.headers.host ?? (req.headers[':authority'] as string | undefined);
        const manifestUrl = manifestUrlFor(host);
        if (!manifestUrl) {
          const allowed = ['this machine', ...tunnels.map((origin) => new URL(origin).host)];
          res.statusCode = 421;
          res.setHeader('content-type', 'text/plain; charset=utf-8');
          res.end(
            `The dev server signs ghost-app.json only for ${allowed.join(', ')}, not ${host ?? 'a request without a Host'}. Name a tunnel's address with GHOST_APP_TUNNEL_URL.\n`,
          );
          return;
        }
        signProject({ root: config.root, mode: 'development', manifestUrl, manifestFile })
          .then((result) => {
            if (!result.success) {
              throw new Error(`${manifestFile} can't be signed:\n${formatErrors(result.errors)}`);
            }
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.setHeader('cache-control', 'no-store');
            res.end(req.method === 'HEAD' ? undefined : serialiseSigned(result.signed));
          })
          .catch((error: unknown) => {
            const message = `ghost-app: ${(error as Error).message}`;
            config.logger.error(message, { timestamp: true });
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain; charset=utf-8');
            res.end(`${message}\n`);
          });
      });

      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        printUrls();
        const address = server.httpServer?.address();
        const port = typeof address === 'object' && address ? address.port : undefined;
        const scheme = config.server.https ? 'https' : 'http';
        const local = `${scheme}://${devHostname(resolve(config.root, manifestFile))}:${port}`;
        const ghost = (ghostUrl ?? 'http://localhost:2368').replace(/\/+$/, '');
        const lines = [...(port ? [local] : []), ...tunnels].flatMap((origin) => [
          `  Ghost app: ${origin}${MANIFEST_PATH}`,
          `  Install:   ${ghost}/ghost/#/apps/install?manifest=${encodeURIComponent(`${origin}${MANIFEST_PATH}`)}`,
        ]);
        config.logger.info(`\n${lines.join('\n')}\n`);
      };
    },

    async buildStart() {
      if (config.command !== 'build' || this.environment.config.consumer !== 'client') {
        return;
      }
      if (!appUrl) {
        config.logger.warn(
          `ghost-app: GHOST_APP_URL isn't set, so this build emits no signed ghost-app.json, and deploying a build without one takes the app down wherever it's installed. Set GHOST_APP_URL to the app's public address, such as https://app.example.com, in .env.production or the environment.`,
        );
        return;
      }
      const base = URL.parse(appUrl.endsWith('/') ? appUrl : `${appUrl}/`);
      // A query or fragment would swallow the manifest's path.
      if (!base || !/^https?:$/.test(base.protocol) || /[?#]/.test(appUrl)) {
        this.error(
          `ghost-app: GHOST_APP_URL must be the app's public address, such as https://app.example.com, not ${appUrl}`,
        );
      }
      const manifestUrl = new URL(MANIFEST_PATH.slice(1), base).href;
      // So `vite build --watch` signs it again when it changes.
      this.addWatchFile(resolve(config.root, manifestFile));
      const result = await signProject({
        root: config.root,
        mode: 'production',
        manifestUrl,
        manifestFile,
      }).catch((error: unknown) => this.error(`ghost-app: ${(error as Error).message}`));
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
        `ghost-app: signed ghost-app.json for ${manifestUrl} with ${signingKeySource('production', 'identity')}`,
      );
    },
  };
}
