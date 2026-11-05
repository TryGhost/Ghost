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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join, resolve } from 'node:path';

import { isLocalhost, isValidAppId } from '@tryghost/app-contracts';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';

import {
  BACKEND_KEY_VARIABLE,
  IDENTITY_KEY_VARIABLE,
  KEYS_DIRECTORY,
  KEY_NAMES,
  createKeys,
  keyFile,
  signingKeySource,
  type Mode,
} from '../tooling/keys.ts';
import { canonicalPath, isWithin } from '../tooling/paths.ts';
import { MANIFEST_PATH, formatErrors } from '../shared/manifest.ts';
import { parseJsonText, parseOrigin } from '../shared/parse.ts';
import { MANIFEST_FILE, serialiseSigned, signProject } from '../tooling/sign.ts';
import { DENY, VITE_DEFAULT_DENY } from './deny.ts';
import { provideDevBackendKey } from './dev-vars.ts';

// The modes whose keys `.ghost-app/` holds, from a record of every `Mode`, so a mode added later
// is a type error here until its keys are protected too.
const EVERY_MODE: Record<Mode, true> = { development: true, production: true };
const MODES = Object.keys(EVERY_MODE) as Mode[];

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
      const origin = parseOrigin(entry);
      if (!origin) {
        throw new Error(
          `ghost-app: expected a tunnel's address such as https://example.trycloudflare.com, not ${entry}`,
        );
      }
      return origin;
    });
}

/** The `.dev.vars*` files at the project's root, in any case, as `DENY` names them. */
const devVarsFiles = (root: string) =>
  // A filesystem that ignores case serves `.DEV.VARS` as `.dev.vars`.
  readdirSync(root).filter((name) => name.toLowerCase().startsWith('.dev.vars'));

/**
 * Refuses a public directory that holds the private keys or `.dev.vars`, or sits among the
 * keys. Vite serves it as it is, without `server.fs.deny`, and copies it into the build.
 */
function refusePublicKeys(root: string, publicDir: string) {
  // An empty publicDir is none at all.
  if (!publicDir) {
    return;
  }
  // Compared where they really are, so a publicDir that links to the keys counts too.
  const keys = canonicalPath(join(root, KEYS_DIRECTORY));
  // Every `.dev.vars*` at the project's root, as `DENY` names them, `.dev.vars.<environment>`
  // included, where it really is, so one that is itself a link counts where it leads.
  const devVars = devVarsFiles(root).map((name) => canonicalPath(join(root, name)));
  // Each mode's directory and keys, where they really are, so one that is a link counts where it
  // leads.
  const modeKeys = MODES.flatMap((mode) =>
    KEY_NAMES.flatMap((name) => {
      const file = join(root, keyFile(mode, name));
      return [canonicalPath(dirname(file)), canonicalPath(file)];
    }),
  );
  // Into or an ancestor of any of them.
  const exposes = (path: string) =>
    [keys, ...modeKeys, ...devVars].some(
      (secret) => isWithin(secret, path) || isWithin(path, secret),
    );
  if (exposes(canonicalPath(publicDir))) {
    throw new Error(
      `ghost-app: publicDir (${publicDir}) holds ${KEYS_DIRECTORY}/ or .dev.vars, which Vite would serve and copy into the build with the private keys in them. Point publicDir at a directory of public files only, such as public/.`,
    );
  }
  // Vite copies publicDir following its links, so a link in it to the keys, to `.dev.vars` or to
  // a directory that holds them would put them in the build. A linked directory is walked where
  // it leads too, once, so a link inside it counts and a cycle of links ends.
  const walked = new Set<string>();
  const walk = (directory: string) => {
    const real = canonicalPath(directory);
    if (walked.has(real)) {
      return;
    }
    walked.add(real);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        const target = canonicalPath(path);
        if (exposes(target)) {
          throw new Error(
            `ghost-app: ${path} in publicDir links to ${target}, which is or holds a private key or .dev.vars, and Vite would copy the private keys into the build through it. Remove the link.`,
          );
        }
        if (statSync(target, { throwIfNoEntry: false })?.isDirectory()) {
          walk(target);
        }
      } else if (entry.isDirectory()) {
        walk(path);
      }
    }
  };
  if (existsSync(publicDir)) {
    walk(publicDir);
  }
}

/**
 * A variable from the environment or, as Vite reads them, the mode's `.env` files in `envDir`,
 * so a project can keep its address in `.env.production`. The environment wins. Vite is only
 * imported here, when it runs the plugin, as it's an optional peer dependency.
 */
async function readEnv(
  mode: string,
  envDir: string | false,
  name: string,
): Promise<string | undefined> {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess || envDir === false) {
    return fromProcess || undefined;
  }
  const { loadEnv } = await import('vite');
  // Exactly this name, though Vite reads every variable that starts with it.
  return loadEnv(mode, envDir, name)[name]?.trim() || undefined;
}

/**
 * The name `vite dev` prints the app at: one of its own under `.localhost`, from the last part
 * of its ID, such as `hello-world.localhost` for `org.ghost.hello-world`. Ghost refuses an app on
 * its own host on any port, and Ghost in development is on `localhost`. Browsers, Vite and Ghost
 * in development all send a `.localhost` name to this machine. `app.localhost` when the manifest
 * names no valid ID, which signing reports on its own.
 */
function devHostname(manifestFile: string): string {
  try {
    // Read as signing reads it, so a leading byte order mark is fine here too.
    const { id } = parseJsonText(readFileSync(manifestFile, 'utf8')) as { id?: unknown };
    // A label is at most 63 characters, and the ID's segments are labels already.
    const name = isValidAppId(id) ? id.slice(id.lastIndexOf('.') + 1) : '';
    if (name.length > 0 && name.length <= 63) {
      return `${name}.localhost`;
    }
  } catch {
    // Unreadable or not JSON: signing says so when the manifest is requested.
  }
  return 'app.localhost';
}

const installLink = (manifestUrl: string, ghostUrl: string | undefined) => {
  const ghost = (ghostUrl || 'http://localhost:2368').replace(/\/+$/, '');
  return `${ghost}/ghost/#/apps/install?manifest=${encodeURIComponent(manifestUrl)}`;
};

/**
 * Signs `ghost-app.json` with the app's keys, as the dev server serves it and as the build
 * emits it:
 *
 * - `vite dev` creates the development keys in `.ghost-app/` on its first run, and serves
 *   `/ghost-app.json` signed for the address it's requested at: a name for this machine on the
 *   dev server's port, or one of the tunnels it's told about. It prints the app at a name of its
 *   own under `.localhost`, such as `hello-world.localhost`, as Ghost on `localhost` refuses an
 *   app on its own host on any port. It refuses any other host, as
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
  // The Ghost the printed install link opens, which `.env.development` can name too.
  let ghostUrl: string | undefined;
  let config: ResolvedConfig;
  let pending: { level: 'info' | 'warn'; message: string } | undefined;
  let warnedUnsigned = false;
  // Whether this is `vite preview`, which serves only the build.
  let preview = false;
  // Where `vite dev` created the development keys, before any later plugin could move the root.
  let keysRoot: string | undefined;
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
    // HTTP/2, which Vite serves with server.https, names the host in `:authority` instead.
    const host = req.headers.host ?? (req.headers[':authority'] as string | undefined);
    const manifestUrl = manifestUrlFor(host, port);
    if (!manifestUrl) {
      const devHost = `${devHostname(resolve(config.root, manifestFile))}:${port ?? '<port>'}`;
      const allowed = [
        `this machine on port ${port ?? '<port>'}, such as ${devHost}`,
        ...tunnels.map((origin) => new URL(origin).host),
      ];
      res.statusCode = 421;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end(
        `The dev server signs ghost-app.json only for ${allowed.join(', ')}, not ${host ?? 'a request without a Host'}. Name a tunnel's address with GHOST_APP_TUNNEL_URL.\n`,
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
    // As the build emits it, so the dev server serves the same bytes.
    res.end(req.method === 'HEAD' ? undefined : serialiseSigned(result.signed));
  }

  return {
    name: '@tryghost/app-sdk/vite',
    // Before other plugins, Cloudflare's included, so the development keys and `.dev.vars`
    // exist before they start the backend, and the manifest route comes before theirs and
    // before Vite serves `ghost-app.json` from the project as a file.
    enforce: 'pre',

    async config(userConfig, { command, isPreview, mode }) {
      preview = Boolean(isPreview);
      const root = resolve(userConfig.root ?? '');
      // As Vite resolves it: against the project's root.
      const envDir = userConfig.envDir === false ? false : resolve(root, userConfig.envDir ?? '');
      if (command !== 'serve' || isPreview) {
        return undefined;
      }
      // The tunnels are read here, as the hosts Vite allows are set here, and only for the dev
      // server, which signs for them. Everything else is read once the config is resolved, so a
      // later plugin's `envDir` counts.
      if (options.tunnelUrl === undefined) {
        tunnels = readTunnels(await readEnv(mode, envDir, 'GHOST_APP_TUNNEL_URL'));
      }
      // Port 0 asks for any free port, which only a dev server listening itself can have.
      configuredPort = (userConfig.server?.middlewareMode && userConfig.server.port) || undefined;
      // Vitest loads the project's Vite config as a dev server, which shouldn't create keys or
      // write `.dev.vars` on every test run.
      if (!process.env.VITEST && mode !== 'test') {
        keysRoot = root;
        await createKeys({ root, mode: 'development' });
        // Read as Cloudflare's plugin reads it, which picks the Worker's `.dev.vars` file by it.
        const cloudflareEnv = await readEnv(mode, envDir, 'CLOUDFLARE_ENV');
        pending = await provideDevBackendKey(root, { cloudflareEnv });
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

    async configResolved(resolved) {
      config = resolved;
      // Vite gives client code every variable that starts with an env prefix, so one that the
      // private keys' variables start with would put the keys in the bundle.
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
      // The keys and `.dev.vars` are made before Cloudflare's plugin starts the Worker, so from
      // the root as the project's config sets it; the manifest is signed from the root Vite uses.
      if (keysRoot !== undefined && resolve(resolved.root) !== keysRoot) {
        throw new Error(
          `ghost-app: the development keys are in ${keysRoot}, but a plugin moved Vite's root to ${resolved.root}, where the manifest would be signed from. Set root in the Vite config rather than from a plugin, or list ghostApp() after a plugin that sets it with enforce: 'pre'.`,
        );
      }
      refusePublicKeys(resolved.root, resolved.publicDir);
      // Vite checks `server.fs.deny` only when `fs.strict` is on, so with it off the dev server
      // serves any file. Preview serves only the build, and Vitest serves nothing to anyone.
      if (
        resolved.command === 'serve' &&
        !preview &&
        !process.env.VITEST &&
        !resolved.server.fs.strict
      ) {
        throw new Error(
          `ghost-app: server.fs.strict is false, so the dev server would serve ${KEYS_DIRECTORY}/ and .dev.vars, the private keys, to anyone who can reach it. Leave server.fs.strict on, as Vite has it by default.`,
        );
      }
      appUrl = await readEnv(resolved.mode, resolved.envDir, 'GHOST_APP_URL');
      ghostUrl = await readEnv(resolved.mode, resolved.envDir, 'GHOST_URL');
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
          // The detail, such as a path on this machine, goes to the terminal, not to whoever
          // asked, who may be anyone reaching a tunnel.
          config.logger.error(`ghost-app: ${(error as Error).message}`, { timestamp: true });
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain; charset=utf-8');
          }
          res.end("ghost-app.json couldn't be signed. The dev server's output says why.\n");
        });
      });

      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        printUrls();
        const port = portOf(server);
        const scheme = config.server.https ? 'https' : 'http';
        const urls = [
          ...(port === undefined
            ? []
            : [
                `${scheme}://${devHostname(resolve(config.root, manifestFile))}:${port}${MANIFEST_PATH}`,
              ]),
          ...tunnels.map((origin) => `${origin}${MANIFEST_PATH}`),
        ];
        const lines = urls.flatMap((url) => [
          `  Ghost app: ${url}`,
          `  Install:   ${installLink(url, ghostUrl)}`,
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
          // Vite leaves what's in outDir when told not to empty it, so an earlier build's file stays.
          const kept =
            this.environment.config.build.emptyOutDir === false
              ? ` build.emptyOutDir is false, so any ghost-app.json already in ${this.environment.config.build.outDir} is left as it is.`
              : '';
          config.logger.warn(
            `ghost-app: GHOST_APP_URL isn't set, so this build emits no signed ghost-app.json, and deploying a build without one takes the app down wherever it's installed.${kept} Set GHOST_APP_URL to the app's public address, such as https://app.example.com, in .env.production or the environment, to sign the manifest for <GHOST_APP_URL>/ghost-app.json.`,
          );
        }
        return;
      }
      const base = URL.parse(appUrl.endsWith('/') ? appUrl : `${appUrl}/`);
      // A query or fragment would land in the middle of the manifest's address, or swallow it,
      // so it's refused, written out or empty.
      if (!base || /[?#]/.test(appUrl)) {
        this.error(
          `ghost-app: GHOST_APP_URL must be the app's public address, such as https://app.example.com, not ${appUrl}`,
        );
      }
      const manifestUrl = new URL(MANIFEST_PATH.slice(1), base).href;
      // So `vite build --watch` signs it again when it changes.
      this.addWatchFile(resolve(config.root, manifestFile));
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
        `ghost-app: signed ghost-app.json for ${manifestUrl} with ${signingKeySource('production', 'identity')}`,
      );
    },
  };
}
