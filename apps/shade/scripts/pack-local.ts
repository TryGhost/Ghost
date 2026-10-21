/// <reference types="node" />
/* eslint-disable no-console -- this is a CLI script; stdout is the UI */

/**
 * Installs the working copy of Shade into an app outside the monorepo, the
 * way npm would install a published release, without publishing anything.
 *
 *   pnpm pack:local <app-dir> [--watch] [-- <dev server args>]
 *
 * One run builds Shade, packs it with `pnpm pack` (so `publishConfig` and
 * `catalog:` versions apply exactly as in CI), stamps the tarball's version as
 * `<x.y.z>-local.<YYYYMMDD-HHMMSS>`, runs `npm install --no-save` in the app and
 * clears the app's Vite dependency cache. The app's package.json and lockfile
 * stay untouched, so a plain `npm install` there goes back to the published
 * release.
 *
 * `--watch` then starts the app's dev server (`npm run dev`) and repeats the
 * run on every change under `src/`, restarting the server after each install.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, watch, type FSWatcher } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, relative, resolve } from 'node:path';

const SHADE_DIR = resolve(import.meta.dirname, '..');
const PACKAGE_NAME = '@tryghost/shade';
const TARBALL = join(SHADE_DIR, '.local-pack', 'tryghost-shade-local.tgz');
const DEBOUNCE_MS = 300;

const FOREIGN_LOCKFILES: Record<string, string> = {
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'Yarn',
  'bun.lock': 'Bun',
  'bun.lockb': 'Bun',
};

const pad = (value: number) => String(value).padStart(2, '0');

/** `0.1.0-alpha.0` → `0.1.0-local.20261021-101200`, in local time. */
export function localVersion(version: string, now: Date): string {
  const match = /^(\d+\.\d+\.\d+)/.exec(version);
  if (!match) {
    throw new Error(`Can't stamp "${version}": it doesn't start with major.minor.patch.`);
  }
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${match[1]}-local.${date}-${time}`;
}

/**
 * Why `appDir` can't take a local Shade build, or `undefined` when it can.
 * `packageJson` is the app's package.json text, if it has one, and `files`
 * lists the names in the app's root directory.
 */
export function findTargetProblem(
  appDir: string,
  packageJson: string | undefined,
  files: readonly string[],
): string | undefined {
  if (packageJson === undefined) {
    return `${appDir} has no package.json.`;
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(packageJson) as Record<string, unknown>;
  } catch {
    return `${appDir}/package.json isn't valid JSON.`;
  }
  const dependencyFields = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ];
  const dependsOnShade = dependencyFields.some((field) => {
    const dependencies = manifest[field];
    return (
      typeof dependencies === 'object' && dependencies !== null && PACKAGE_NAME in dependencies
    );
  });
  if (!dependsOnShade) {
    return `${appDir}/package.json doesn't depend on ${PACKAGE_NAME}. Install the published package first: npm install ${PACKAGE_NAME}@alpha`;
  }

  const foreign = files.find((file) => file in FOREIGN_LOCKFILES);
  if (foreign) {
    return `${appDir} uses ${FOREIGN_LOCKFILES[foreign]} (${foreign}). Only npm apps are supported so far.`;
  }
  if (!files.includes('package-lock.json')) {
    return `${appDir} has no package-lock.json. Only npm apps are supported so far; run npm install there first.`;
  }

  return undefined;
}

// --- Processes -------------------------------------------------------------

/**
 * The environment for commands run in the app: without pnpm's `npm_*` settings
 * and the monorepo's `node_modules/.bin` entries, so the app runs as it would
 * from its own shell.
 */
function appEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!/^(npm|pnpm)_/i.test(key) && key !== 'INIT_CWD') {
      env[key] = value;
    }
  }
  env.PATH = (process.env.PATH ?? '')
    .split(delimiter)
    .filter((entry) => !/node_modules[\\/]\.bin$|node-gyp-bin$/.test(entry))
    .join(delimiter);
  return env;
}

const running = new Set<ChildProcess>();

/** Runs a command quietly; its output is printed only when it fails. */
function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    running.add(child);
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk));
    child.on('error', (error) => {
      running.delete(child);
      reject(error);
    });
    child.on('close', (code, signal) => {
      running.delete(child);
      if (code === 0) {
        resolvePromise(output);
      } else {
        const status = signal ? `was stopped by ${signal}` : `exited with ${code}`;
        reject(new Error(`\`${command} ${args.join(' ')}\` ${status}\n\n${output.trim()}`));
      }
    });
  });
}

// --- One run ---------------------------------------------------------------

async function checkTarget(appDir: string): Promise<void> {
  if (!existsSync(appDir)) {
    throw new Error(`${appDir} doesn't exist.`);
  }
  const packageJsonPath = join(appDir, 'package.json');
  const packageJson = existsSync(packageJsonPath)
    ? await readFile(packageJsonPath, 'utf8')
    : undefined;
  const problem = findTargetProblem(appDir, packageJson, await readdir(appDir));
  if (problem) {
    throw new Error(problem);
  }
}

/** Builds, packs and stamps Shade into `TARBALL`. Returns the stamped version. */
async function buildAndPack(): Promise<string> {
  await run('pnpm', ['build'], SHADE_DIR);

  const workDir = await mkdtemp(join(tmpdir(), 'shade-pack-local-'));
  try {
    await run('pnpm', ['pack', '--pack-destination', workDir], SHADE_DIR);
    const packed = (await readdir(workDir)).find((file) => file.endsWith('.tgz'));
    if (!packed) {
      throw new Error('`pnpm pack` produced no tarball.');
    }

    const extracted = join(workDir, 'extracted');
    await mkdir(extracted);
    await run('tar', ['-xzf', join(workDir, packed), '-C', extracted], workDir);

    const manifestPath = join(extracted, 'package', 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { version: string };
    manifest.version = localVersion(manifest.version, new Date());
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    // COPYFILE_DISABLE keeps macOS tar from adding `._*` metadata files.
    await mkdir(join(SHADE_DIR, '.local-pack'), { recursive: true });
    await run('tar', ['-czf', TARBALL, '-C', extracted, 'package'], workDir, {
      ...process.env,
      COPYFILE_DISABLE: '1',
    });
    return manifest.version;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Installs `TARBALL` without saving it, and restores the manifest and lockfile if npm changed them anyway. */
async function install(appDir: string): Promise<void> {
  const tracked = ['package.json', 'package-lock.json'].map((file) => join(appDir, file));
  const before = await Promise.all(tracked.map((file) => readFile(file)));

  await run('npm', ['install', '--no-save', '--no-audit', '--no-fund', TARBALL], appDir, appEnv());

  const after = await Promise.all(tracked.map((file) => readFile(file)));
  for (const [index, file] of tracked.entries()) {
    if (!before[index]!.equals(after[index]!)) {
      await writeFile(file, before[index]!);
      console.warn(`npm changed ${relative(appDir, file)} despite --no-save; restored it.`);
    }
  }

  // Vite pre-bundles dependencies into node_modules/.vite. Vite 8 keys that
  // cache on npm's hidden node_modules/.package-lock.json, which --no-save
  // still updates, so it re-bundles on its own; older Vite and other setups
  // key on package-lock.json, which stays the same. Removing the cache makes
  // the next dev server start pre-bundle the new Shade either way.
  await rm(join(appDir, 'node_modules', '.vite'), { recursive: true, force: true });
}

async function installedVersion(appDir: string): Promise<string> {
  const manifest = JSON.parse(
    await readFile(join(appDir, 'node_modules', PACKAGE_NAME, 'package.json'), 'utf8'),
  ) as { version: string };
  return manifest.version;
}

const seconds = (since: number) => `${((performance.now() - since) / 1000).toFixed(1)} s`;

// --- Dev server ------------------------------------------------------------

let devServer: ChildProcess | undefined;

function startDevServer(appDir: string, args: string[]): void {
  const extra = args.length > 0 ? ['--', ...args] : [];
  console.log(`\n▶ npm run dev${extra.length > 0 ? ` ${extra.join(' ')}` : ''}\n`);
  // Its own process group, so stopping it also stops npm's child (Vite).
  const child = spawn('npm', ['run', 'dev', ...extra], {
    cwd: appDir,
    env: appEnv(),
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true,
  });
  devServer = child;
  child.on('exit', (code, signal) => {
    if (devServer === child) {
      devServer = undefined;
      console.log(
        `\nThe dev server stopped (${signal ?? `exit ${code}`}). It starts again after the next change.`,
      );
    }
  });
}

function stopDevServer(): Promise<void> {
  const child = devServer;
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    devServer = undefined;
    return Promise.resolve();
  }
  devServer = undefined;
  return new Promise((resolvePromise) => {
    child.once('exit', () => resolvePromise());
    try {
      process.kill(-child.pid!, 'SIGTERM');
    } catch {
      resolvePromise();
    }
  });
}

// --- CLI -------------------------------------------------------------------

const USAGE = `Usage: pnpm pack:local <app-dir> [--watch] [-- <dev server args>]

Builds Shade, packs it as npm would publish it, and installs it into an npm app
with --no-save. --watch also runs the app's dev server and repeats on every
change under apps/shade/src.`;

function parseArgs(argv: string[]): { appDir: string; watchMode: boolean; devArgs: string[] } {
  const separator = argv.indexOf('--');
  const own = separator === -1 ? argv : argv.slice(0, separator);
  const devArgs = separator === -1 ? [] : argv.slice(separator + 1);

  if (own.includes('--help') || own.includes('-h')) {
    console.log(USAGE);
    process.exit(0);
  }
  const unknown = own.filter((arg) => arg.startsWith('-') && arg !== '--watch');
  const positional = own.filter((arg) => !arg.startsWith('-'));
  if (unknown.length > 0 || positional.length !== 1) {
    console.error(USAGE);
    process.exit(1);
  }
  // pnpm runs scripts from apps/shade; resolve the path from where it was typed.
  const appDir = resolve(process.env.INIT_CWD ?? process.cwd(), positional[0]!);
  return { appDir, watchMode: own.includes('--watch'), devArgs };
}

async function packAndInstall(appDir: string): Promise<boolean> {
  const started = performance.now();
  try {
    console.log('Building and packing Shade…');
    const version = await buildAndPack();
    console.log(`Installing ${PACKAGE_NAME}@${version} into ${appDir}…`);
    await install(appDir);
    const installed = await installedVersion(appDir);
    const hasDocs = existsSync(join(appDir, 'node_modules', PACKAGE_NAME, 'docs', 'index.md'));
    console.log(
      `\nInstalled ${PACKAGE_NAME}@${installed} in ${seconds(started)}. docs/: ${hasDocs ? 'present' : 'missing'}.`,
    );
    return true;
  } catch (error) {
    console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}\n`);
    return false;
  }
}

async function main(): Promise<void> {
  const { appDir, watchMode, devArgs } = parseArgs(process.argv.slice(2));

  try {
    await checkTarget(appDir);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const ok = await packAndInstall(appDir);

  if (!watchMode) {
    if (!ok) {
      process.exit(1);
    }
    console.log("Restart the app's dev server, then reload the page.");
    console.log('Running npm install in the app goes back to the published release.');
    return;
  }

  let stopping = false;
  let busy = false;
  let queued = false;
  let timer: NodeJS.Timeout | undefined;

  const pass = async () => {
    busy = true;
    do {
      queued = false;
      console.log('\nShade changed: rebuilding…');
      const started = performance.now();
      try {
        const version = await buildAndPack();
        if (stopping) {
          break;
        }
        await stopDevServer();
        await install(appDir);
        console.log(
          `Installed ${PACKAGE_NAME}@${version} in ${seconds(started)}. Restarting the dev server; the page reloads when it's back.`,
        );
      } catch (error) {
        if (stopping) {
          break;
        }
        console.error(
          `\n✖ ${error instanceof Error ? error.message : String(error)}\n\nStill watching; the dev server keeps the last good build.`,
        );
      }
      if (!stopping && !devServer) {
        startDevServer(appDir, devArgs);
      }
    } while (queued && !stopping);
    busy = false;
  };

  const watcher: FSWatcher = watch(
    join(SHADE_DIR, 'src'),
    { recursive: true },
    (_event, filename) => {
      // Skip editor swap files, backups and dotfiles such as .DS_Store.
      if (stopping || (filename && /(^|[\\/])\.|~$|\.swp$/.test(filename))) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (busy) {
          queued = true;
        } else {
          void pass();
        }
      }, DEBOUNCE_MS);
    },
  );

  const shutdown = async () => {
    if (stopping) {
      return;
    }
    stopping = true;
    clearTimeout(timer);
    watcher.close();
    for (const child of running) {
      child.kill('SIGTERM');
    }
    await stopDevServer();
    console.log(
      '\nStopped watching. The app keeps the last local build until you run npm install there.',
    );
    process.exit(0);
  };
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => void shutdown());
  }
  // Last resort if the script dies some other way: don't leave Vite behind.
  process.on('exit', () => {
    if (devServer?.pid) {
      try {
        process.kill(-devServer.pid, 'SIGTERM');
      } catch {
        // already gone
      }
    }
  });

  console.log('Watching apps/shade/src for changes. Ctrl-C stops the watcher and the dev server.');
  startDevServer(appDir, devArgs);
}

if (import.meta.main) {
  await main();
}
