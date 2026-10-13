import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import { promisify } from 'node:util';
import {
  comparePackageDirectories,
  comparePublishedPackage,
  packPackage,
} from '../compare-package.ts';

function write(directory: string, path: string, contents: string | Buffer) {
  mkdirSync(dirname(join(directory, path)), { recursive: true });
  writeFileSync(join(directory, path), contents);
}

function temporaryDirectory(t: TestContext): string {
  const directory = mkdtempSync(join(tmpdir(), 'package-comparison-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function updateManifest(directory: string, update: Record<string, unknown>) {
  const path = join(directory, 'package.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  writeFileSync(path, JSON.stringify({ ...manifest, ...update }));
}

function packAndExtract(directory: string, output: string) {
  mkdirSync(output, { recursive: true });
  packPackage(directory, join(output, 'package.tgz'));
  execFileSync('tar', ['-xzf', join(output, 'package.tgz'), '-C', output]);
  return join(output, 'package');
}

function createWorkspace(root: string): string {
  write(
    root,
    'pnpm-workspace.yaml',
    `packages:\n  - library\n  - dependency\ncatalog:\n  react: 18.3.1\n`,
  );
  write(
    root,
    'dependency/package.json',
    JSON.stringify({ name: 'fixture-dependency', version: '1.2.3' }),
  );
  const directory = join(root, 'library');
  mkdirSync(join(directory, 'node_modules'), { recursive: true });
  symlinkSync('../../dependency', join(directory, 'node_modules/fixture-dependency'));
  write(
    directory,
    'package.json',
    JSON.stringify({
      name: 'comparison-fixture',
      version: '1.0.0',
      files: ['dist', 'styles.css', 'assets'],
      exports: { '.': { source: './src/index.ts', default: './dist/index.js' } },
      publishConfig: {
        exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
      },
      dependencies: { react: 'catalog:', 'fixture-dependency': 'workspace:^' },
      peerDependencies: { react: '^18.0.0' },
      devDependencies: { typescript: '6.0.2' },
      scripts: { prepack: 'exit 42', prepare: 'exit 42', postpack: 'exit 42', test: 'exit 1' },
    }),
  );
  write(directory, 'dist/index.js', 'export {value} from "./internal.js";');
  write(directory, 'dist/internal.js', 'export const value = 1;');
  write(directory, 'dist/index.d.ts', 'export declare const value: number;');
  write(directory, 'styles.css', '@import "./assets/theme.css";');
  write(directory, 'assets/theme.css', ':root { color: red; }');
  write(directory, 'assets/font.woff2', Buffer.from([0, 1, 2, 255]));
  write(directory, 'README.md', '# Library\n');
  write(directory, 'src/index.ts', 'export const value = 1;');
  return directory;
}

describe('packed package comparison', () => {
  let root: string;
  let published: string;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'package-comparison-baseline-'));
    const directory = createWorkspace(root);
    published = packAndExtract(directory, join(root, 'packed'));
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  function localPackage(t: TestContext): string {
    const copy = temporaryDirectory(t);
    cpSync(root, copy, { recursive: true, verbatimSymlinks: true });
    return join(copy, 'library');
  }

  it('uses real pnpm exports and resolved catalog/workspace dependencies without running hooks', () => {
    const manifest = JSON.parse(readFileSync(join(published, 'package.json'), 'utf8'));
    assert.deepEqual(manifest.exports, {
      '.': { types: './dist/index.d.ts', default: './dist/index.js' },
    });
    assert.deepEqual(manifest.dependencies, { react: '18.3.1', 'fixture-dependency': '^1.2.3' });
  });

  it('matches unchanged packs despite version, development and generated metadata changes', (t) => {
    const directory = localPackage(t);
    updateManifest(directory, {
      version: '1.0.7',
      devDependencies: { typescript: '6.1.0' },
      scripts: { build: 'new-build', test: 'new-test', prepack: 'exit 42' },
      nx: { targets: { build: {} } },
      packageManager: 'pnpm@12.0.0',
      gitHead: 'different',
      _npmVersion: 'different',
      description: 'different',
    });
    write(directory, 'src/index.ts', '// development-only file outside the tarball');
    const local = packAndExtract(directory, join(dirname(directory), 'changed'));
    assert.deepEqual(comparePackageDirectories(local, published), {
      changed: false,
      reason: 'Packed package contents match',
    });
  });

  for (const [path, contents] of [
    ['dist/internal.js', 'export const value = 2;'],
    ['dist/index.d.ts', 'export declare const value: string;'],
    ['styles.css', '@import "./assets/theme.css"; body { margin: 0; }'],
    ['assets/theme.css', ':root { color: blue; }'],
    ['assets/font.woff2', Buffer.from([0, 3, 2, 255])],
    ['README.md', '# Updated library\n'],
  ] as const) {
    it(`detects changes to packed ${path}`, (t) => {
      const directory = localPackage(t);
      write(directory, path, contents);
      const local = packAndExtract(directory, join(dirname(directory), 'changed'));
      assert.deepEqual(comparePackageDirectories(local, published), {
        changed: true,
        reason: `Changed ${path}`,
      });
    });
  }

  for (const operation of ['Added', 'Removed'] as const) {
    it(`detects ${operation.toLowerCase()} assets`, (t) => {
      const directory = localPackage(t);
      const path = operation === 'Added' ? 'assets/new.svg' : 'assets/font.woff2';
      if (operation === 'Added') {
        write(directory, path, '<svg/>');
      } else {
        rmSync(join(directory, path));
      }
      const local = packAndExtract(directory, join(dirname(directory), 'changed'));
      assert.deepEqual(comparePackageDirectories(local, published), {
        changed: true,
        reason: `${operation} ${path}`,
      });
    });
  }

  for (const [field, value] of Object.entries({
    exports: { '.': './dist/internal.js' },
    dependencies: { react: '18.3.0', 'fixture-dependency': 'workspace:^' },
    peerDependencies: { react: '^19.0.0' },
    optionalDependencies: { optional: '^1.0.0' },
    peerDependenciesMeta: { react: { optional: true } },
    sideEffects: ['*.css'],
    engines: { node: '>=22' },
    scripts: { install: 'node install.js' },
  })) {
    it(`detects consumer metadata changes to ${field}`, (t) => {
      const directory = localPackage(t);
      updateManifest(
        directory,
        field === 'exports' ? { publishConfig: { exports: value } } : { [field]: value },
      );
      const local = packAndExtract(directory, join(dirname(directory), 'changed'));
      assert.equal(comparePackageDirectories(local, published).changed, true);
      assert.match(comparePackageDirectories(local, published).reason, /package.json/);
    });
  }

  it('ignores dependency key order but preserves export condition order', (t) => {
    const local = temporaryDirectory(t);
    cpSync(published, local, { recursive: true });
    updateManifest(local, { dependencies: { 'fixture-dependency': '^1.2.3', react: '18.3.1' } });
    assert.equal(comparePackageDirectories(local, published).changed, false);
    updateManifest(local, {
      exports: { '.': { default: './dist/index.js', types: './dist/index.d.ts' } },
    });
    assert.equal(
      comparePackageDirectories(local, published).reason,
      'Changed package.json exports',
    );
  });
});

describe('public app UMD comparison', () => {
  it('ignores all files and metadata outside umd, while detecting UMD assets and empty directories', (t) => {
    const root = temporaryDirectory(t);
    const local = join(root, 'local');
    const published = join(root, 'published');
    for (const directory of [local, published]) {
      write(directory, 'umd/app.js', 'same');
      write(directory, 'umd/main.css', 'same');
    }
    write(local, 'package.json', '{"dependencies":{"changed":"1"}}');
    write(local, 'es/index.js', 'different');
    assert.equal(comparePackageDirectories(local, published, 'umd').changed, false);
    write(local, 'umd/main.css', 'changed');
    assert.equal(comparePackageDirectories(local, published, 'umd').changed, true);
    write(local, 'umd/main.css', 'same');
    mkdirSync(join(local, 'umd/empty'));
    assert.equal(comparePackageDirectories(local, published, 'umd').changed, true);
    rmSync(join(local, 'umd'), { recursive: true });
    assert.equal(comparePackageDirectories(local, published, 'umd').changed, true);
  });
});

describe('published package comparison', () => {
  it('marks a first release as changed without building or requesting a tarball', async () => {
    assert.deepEqual(await comparePublishedPackage('/not-a-package', ''), {
      changed: true,
      reason: 'No release in this version line yet',
    });
  });

  it('builds at the published version, restores the manifest and propagates failures', async (t) => {
    const root = temporaryDirectory(t);
    const directory = createWorkspace(root);
    updateManifest(directory, { version: '1.0.7', files: ['dist', 'umd'] });
    write(directory, 'umd/app.js', '1.0.7');
    write(directory, 'dist/version.js', '1.0.7');
    packAndExtract(directory, join(root, 'published'));
    const archive = readFileSync(join(root, 'published/package.tgz'));
    updateManifest(directory, { version: '1.0.0' });
    const original = readFileSync(join(directory, 'package.json'), 'utf8');
    let responseStatus = 200;
    const server = createServer((_request, response) => {
      response.writeHead(responseStatus);
      response.end(archive);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    t.after(() => server.close());
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const realPnpm = execFileSync('which', ['pnpm'], { encoding: 'utf8' }).trim();
    const commands = join(root, 'commands');
    const bin = join(root, 'bin');
    write(
      bin,
      'pnpm',
      `#!${process.execPath}
const fs = require('node:fs');
const cp = require('node:child_process');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(commands)}, JSON.stringify(args) + '\\n');
if (args[0] === 'nx') {
  if (process.env.COMPARISON_FAILURE === 'build') process.exit(1);
  const {version} = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  fs.writeFileSync('umd/app.js', version);
  fs.writeFileSync('dist/version.js', version);
} else if (args[0] === 'view') {
  if (process.env.COMPARISON_FAILURE === 'registry') process.exit(1);
  console.log(JSON.stringify('http://127.0.0.1:${address.port}/package.tgz'));
} else {
  if (process.env.COMPARISON_FAILURE === 'pack') process.exit(1);
  const result = cp.spawnSync(${JSON.stringify(realPnpm)}, args, {stdio: 'inherit'});
  process.exit(result.status ?? 1);
}
`,
    );
    chmodSync(join(bin, 'pnpm'), 0o755);
    const originalPath = process.env.PATH;
    const originalFailure = process.env.COMPARISON_FAILURE;
    t.after(() => {
      process.env.PATH = originalPath;
      if (originalFailure === undefined) {
        delete process.env.COMPARISON_FAILURE;
      } else {
        process.env.COMPARISON_FAILURE = originalFailure;
      }
    });
    process.env.PATH = `${bin}:${originalPath}`;
    const output = join(root, 'github-output');
    const cli = (latest: string) =>
      promisify(execFile)(
        process.execPath,
        [join(import.meta.dirname, '../compare-package.ts'), '--latest', latest],
        { cwd: directory, env: { ...process.env, GITHUB_OUTPUT: output } },
      );
    await cli('1.0.7');
    assert.equal(readFileSync(output, 'utf8'), 'changed=false\n');
    write(directory, 'README.md', '# Changed\n');
    await cli('1.0.7');
    assert.equal(readFileSync(output, 'utf8'), 'changed=false\nchanged=true\n');
    write(directory, 'README.md', '# Library\n');
    assert.equal((await comparePublishedPackage(directory, '1.0.7')).changed, false);
    assert.equal(readFileSync(join(directory, 'dist/version.js'), 'utf8'), '1.0.7');
    assert.equal(readFileSync(join(directory, 'package.json'), 'utf8'), original);
    writeFileSync(commands, '');
    assert.equal((await comparePublishedPackage(directory, '1.0.7', 'umd')).changed, false);
    assert.equal(readFileSync(commands, 'utf8').includes('pack'), false);
    for (const failure of ['build', 'registry', 'pack']) {
      process.env.COMPARISON_FAILURE = failure;
      await assert.rejects(comparePublishedPackage(directory, '1.0.7'));
      assert.equal(readFileSync(join(directory, 'package.json'), 'utf8'), original);
    }
    await assert.rejects(cli('1.0.7'));
    assert.equal(readFileSync(output, 'utf8'), 'changed=false\nchanged=true\n');
    delete process.env.COMPARISON_FAILURE;
    responseStatus = 500;
    await assert.rejects(comparePublishedPackage(directory, '1.0.7'), /HTTP 500/);
    assert.equal(readFileSync(join(directory, 'package.json'), 'utf8'), original);
  });
});
