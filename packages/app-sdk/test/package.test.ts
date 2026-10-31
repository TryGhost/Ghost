// @vitest-environment node
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import ts from 'typescript';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import manifest from '../package.json' with { type: 'json' };

// Apps install the SDK from npm, so these tests pack it as the publish job does, install the
// tarball into an app of its own outside the workspace, and use it from there. `pnpm pack`
// packs the package's own build/ and dist/, which Nx builds before `test:unit`, so they are
// first checked against what the source builds to now (from `test/build.ts`).
const built = inject('built');
const root = fileURLToPath(new URL('..', import.meta.url));

// The app takes the SDK's dependencies from the workspace's own install, at the versions its
// lockfile pins, so installing needs no registry and runs no newly resolved code.
const dependencies = Object.fromEntries(
  Object.keys(manifest.dependencies).map((name) => {
    const path = realpathSync(join(root, 'node_modules', name));
    const { version } = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')) as {
      version: string;
    };
    return [name, { path, version }];
  }),
);
const execFileAsync = promisify(execFile);

/** Runs a command, and on failure reports what it printed. */
async function run(command: string, args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, { cwd, maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    throw new Error(`${command} ${args.join(' ')} failed\n${stdout}${stderr}`, { cause: error });
  }
}

/** What a module exports, imported by Node from the app, so the app's resolution applies. */
async function loadedExports(app: string, specifier: string): Promise<string[]> {
  const script = `const m = await import(${JSON.stringify(specifier)}); console.log(JSON.stringify(Object.keys(m).sort()));`;
  return JSON.parse(await run('node', ['--input-type=module', '-e', script], app)) as string[];
}

// Every entry point the package exports, as an app imports it. Node and TypeScript resolve
// each one, so any form of `exports` target works. A `null` target blocks its subpath, and a
// pattern can't be listed, so its entry points must be named.
const entryPoints = Object.entries(manifest.exports as Record<string, unknown>)
  .filter(([subpath, target]) => subpath !== './package.json' && target !== null)
  .map(([subpath]) => {
    if (subpath.includes('*')) {
      throw new Error(`exports has the pattern ${subpath}: list its entry points here instead`);
    }
    return manifest.name + subpath.slice(1);
  });

// How an app uses the root entry point, so its declarations are checked in use, not only
// loaded. Type-checked, never run.
const USAGE = `
import { connect, GhostAppError, type Ghost, type GhostAppErrorCode } from '@tryghost/app-sdk';

try {
  const ghost: Ghost = await connect({ timeout: 5000 });
  const response: Response = await ghost.fetch('/posts/?limit=5', { method: 'GET' });
  const unsubscribe: () => void = ghost.onThemeChange((theme) => {
    const mode: 'light' | 'dark' = theme.mode;
    document.body.dataset.theme = mode;
  });
  await ghost.open({ post: { id: '1' } });
  console.log(ghost.site.url, ghost.user.role, ghost.path.current, response.ok);
  unsubscribe();
} catch (error) {
  if (error instanceof GhostAppError) {
    const code: GhostAppErrorCode = error.code;
    console.log(code);
  }
}
`;

const resolutions = {
  node: { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext },
  bundler: { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler },
};

describe('the packed package', () => {
  let directory: string;
  let app: string;
  let installed: string;

  // Packing takes a few seconds, more on a CPU-constrained CI runner.
  beforeAll(async () => {
    for (const [file, fresh] of [
      ['build/index.js', join(built.package, 'index.js')],
      ['build/index.d.ts', join(built.package, 'index.d.ts')],
      ['dist/app-sdk.js', join(built.bundle, 'app-sdk.js')],
    ] as const) {
      const path = join(root, file);
      if (!existsSync(path) || readFileSync(path, 'utf8') !== readFileSync(fresh, 'utf8')) {
        throw new Error(`${file} isn't what the source builds to now: run pnpm build first`);
      }
    }

    directory = await mkdtemp(join(tmpdir(), 'app-sdk-package-'));
    const packed = JSON.parse(
      await run('pnpm', ['pack', '--json', '--pack-destination', directory], root),
    ) as { filename: string };

    app = join(directory, 'app');
    await mkdir(app);
    await writeFile(
      join(app, 'package.json'),
      JSON.stringify({
        name: 'app',
        private: true,
        type: 'module',
        dependencies: { [manifest.name]: `file:${packed.filename}` },
      }),
    );
    await writeFile(
      join(app, 'entries.ts'),
      entryPoints.map((specifier, i) => `export * as entry${i} from '${specifier}';\n`).join(''),
    );
    await writeFile(join(app, 'usage.ts'), USAGE);
    await writeFile(
      join(app, 'pnpm-workspace.yaml'),
      `overrides:\n${Object.entries(dependencies)
        .map(([name, { path }]) => `  ${JSON.stringify(name)}: ${JSON.stringify(`link:${path}`)}\n`)
        .join('')}`,
    );
    await run('pnpm', ['install', '--offline', '--ignore-scripts', '--lockfile=false'], app);
    installed = join(app, 'node_modules', manifest.name);
  }, 120_000);

  afterAll(async () => {
    if (directory) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('depends on nothing from the workspace', () => {
    const packed = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8')) as {
      private?: boolean;
      dependencies?: Record<string, string>;
      devDependencies?: unknown;
    };
    expect(packed.private).toBeUndefined();
    expect(packed.devDependencies).toBeUndefined();
    // The catalog pins each version exactly, so the app installs what the workspace tested.
    expect(packed.dependencies).toEqual(
      Object.fromEntries(
        Object.entries(dependencies).map(([name, { version }]) => [name, version]),
      ),
    );
  });

  // Each starts Node, which can be slow on a CPU-constrained CI runner.
  it.each(entryPoints)('loads %s', { timeout: 60_000 }, async (specifier) => {
    expect((await loadedExports(app, specifier)).length).toBeGreaterThan(0);
  });

  it(
    'ships the browser bundle, which exports what the package does',
    { timeout: 60_000 },
    async () => {
      const bundle = pathToFileURL(join(installed, 'dist/app-sdk.js')).href;
      expect(await loadedExports(app, bundle)).toEqual(await loadedExports(app, manifest.name));
    },
  );

  // The publish job sets the version in package.json just before it builds.
  it.each(['build/index.js', 'dist/app-sdk.js'])(
    '%s reports the version in package.json',
    (file) => {
      const code = readFileSync(join(installed, file), 'utf8');
      expect(code.match(/\bSDK_VERSION = "([^"]*)";/)?.[1]).toBe(manifest.version);
    },
  );

  // Type-checking against the DOM lib is quick locally, but can time out on a CPU-constrained
  // CI runner.
  it.each(Object.entries(resolutions))(
    'type-checks an app against every entry point, with %s resolution',
    { timeout: 60_000 },
    (_name, resolution) => {
      const program = ts.createProgram([join(app, 'entries.ts'), join(app, 'usage.ts')], {
        ...resolution,
        strict: true,
        noEmit: true,
        // Checks the package's declarations themselves, not only what the app uses of them.
        skipLibCheck: false,
        target: ts.ScriptTarget.ES2022,
        types: [],
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
      });
      const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      expect(diagnostics).toEqual([]);
    },
  );
});
