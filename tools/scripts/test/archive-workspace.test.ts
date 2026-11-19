import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { it, type TestContext } from 'node:test';
import yaml from 'js-yaml';
import { loadArchiveWorkspace } from '../../../ghost/scripts/archive-workspace.mts';

const execFileAsync = promisify(execFile);
const pnpm = process.env.npm_execpath || 'pnpm';

async function fixture(t: TestContext, files: Record<string, unknown>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-archive-workspace-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const [file, value] of Object.entries(files)) {
    const destination = path.join(directory, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, typeof value === 'string' ? value : JSON.stringify(value));
  }
  return directory;
}

it('exports resolved local includes as standalone install metadata with relative patch paths', async (t) => {
  const directory = await fixture(t, {
    'source/package.json': { name: 'source', private: true },
    'source/pnpm-workspace.yaml': {
      packages: ['packages/*'],
      pnpmfile: [],
      bootConfig: { minimumReleaseAge: 4320 },
      minimumReleaseAge: 4320,
      blockExoticSubdeps: true,
      include: {
        './settings/install.yaml': ['strictDepBuilds', 'allowBuilds', 'patchedDependencies'],
        './settings/catalog.yaml': ['catalog', 'catalogs.test'],
      },
      overrides: { example: '1.0.0' },
      packageExtensions: { example: { peerDependencies: { other: '*' } } },
      ignoredOptionalDependencies: ['sqlite3'],
    },
    'source/settings/install.yaml': {
      strictDepBuilds: true,
      allowBuilds: { 'native-fixture@1.0.0': true, 'dtrace-provider': false },
      patchedDependencies: { 'unused-fixture@1.0.0': './fix.patch' },
    },
    'source/settings/catalog.yaml': {
      catalog: { example: '1.0.0' },
      catalogs: { test: { other: '2.0.0' } },
    },
    'source/settings/fix.patch': 'unused patch fixture\n',
    'archive/package.json': { name: 'standalone-archive', private: true },
    // An accidental dependency on the source settings/package would fail offline.
    'archive/.npmrc': 'registry=http://127.0.0.1:9/\nfetch-retries=0\n',
  });
  const source = path.join(directory, 'source');
  const archive = path.join(directory, 'archive');
  const settings = await loadArchiveWorkspace(source, pnpm);
  assert.deepEqual(settings, {
    catalog: { example: '1.0.0' },
    catalogs: { test: { other: '2.0.0' } },
    allowBuilds: { 'native-fixture@1.0.0': true, 'dtrace-provider': false },
    strictDepBuilds: true,
    overrides: { example: '1.0.0' },
    packageExtensions: { example: { peerDependencies: { other: '*' } } },
    ignoredOptionalDependencies: ['sqlite3'],
    patchedDependencies: { 'unused-fixture@1.0.0': 'settings/fix.patch' },
    minimumReleaseAge: 0,
    allowUnusedPatches: true,
  });
  const output = yaml.dump(settings);
  assert.equal(yaml.dump(await loadArchiveWorkspace(source, pnpm)), output);
  await fs.writeFile(path.join(archive, 'pnpm-workspace.yaml'), output);
  for (const file of Object.values(settings.patchedDependencies || {})) {
    await fs.mkdir(path.dirname(path.join(archive, file)), { recursive: true });
    await fs.copyFile(path.join(source, file), path.join(archive, file));
  }
  await fs.rm(source, { recursive: true });
  await execFileAsync(pnpm, ['install', '--lockfile-only', '--offline', '--ignore-scripts'], {
    cwd: archive,
  });
  await execFileAsync(pnpm, ['install', '--frozen-lockfile', '--offline', '--ignore-scripts'], {
    cwd: archive,
  });
  assert.equal(await fs.readFile(path.join(archive, 'pnpm-workspace.yaml'), 'utf8'), output);
});

it('exports an installed declarative config dependency without shipping its bootstrap configuration', async (t) => {
  const root = await fixture(t, {
    'package.json': { name: 'source', private: true },
    'pnpm-workspace.yaml': {
      configDependencies: { '@fixture/policy': '1.0.0' },
      bootConfig: { minimumReleaseAge: 4320 },
      pnpmfile: [],
      include: { '@fixture/policy': ['strictDepBuilds'] },
    },
    // The installed config dependency location is documented by pnpm. This test
    // exercises real config loading without publishing a package or a registry.
    'node_modules/.pnpm-config/@fixture/policy/package.json': {
      name: '@fixture/policy',
      version: '1.0.0',
      pnpm: { config: './policy.yaml' },
    },
    'node_modules/.pnpm-config/@fixture/policy/policy.yaml': { strictDepBuilds: true },
  });
  assert.deepEqual(await loadArchiveWorkspace(root, pnpm), {
    strictDepBuilds: true,
    minimumReleaseAge: 0,
    allowUnusedPatches: true,
  });
  await fs.rm(path.join(root, 'node_modules'), { recursive: true });
  await assert.rejects(loadArchiveWorkspace(root, pnpm), /without resolved strictDepBuilds/);
});

it('preserves effective overlapping matcher settings when normalizing map order', async (t) => {
  const root = await fixture(t, {
    'target/package.json': {
      name: 'archive-fixture-target',
      version: '1.0.0',
      dependencies: { 'archive-fixture-leaf': '*' },
    },
    'leaf/package.json': { name: 'archive-fixture-leaf', version: '1.0.0' },
    'leaf2/package.json': { name: 'archive-fixture-leaf', version: '2.0.0' },
    'source/package.json': {
      name: 'source',
      private: true,
      dependencies: { 'archive-fixture-target': 'file:./archive-fixture-target-1.0.0.tgz' },
    },
    'source/.npmrc': 'registry=http://127.0.0.1:9/\nfetch-retries=0\n',
    'source/pnpm-workspace.yaml': {
      strictDepBuilds: true,
      include: { './settings.yaml': ['allowBuilds', 'overrides', 'packageExtensions'] },
    },
    'source/settings.yaml': {
      allowBuilds: { 'archive-fixture-target@1.0.0': true, 'archive-fixture-target': false },
      overrides: {
        'archive-fixture-target>archive-fixture-leaf': 'file:./archive-fixture-leaf-2.0.0.tgz',
        'archive-fixture-leaf': 'file:./archive-fixture-leaf-1.0.0.tgz',
      },
      packageExtensions: {
        'archive-fixture-target@1.0.0': {
          peerDependencies: { exact: '*' },
          peerDependenciesMeta: { exact: { optional: true } },
        },
        'archive-fixture-target@*': {
          peerDependencies: { broad: '*' },
          peerDependenciesMeta: { broad: { optional: true } },
        },
      },
    },
  });
  const source = path.join(root, 'source');
  const archive = path.join(root, 'archive');
  for (const name of ['target', 'leaf', 'leaf2']) {
    await execFileAsync(pnpm, ['pack', '--pack-destination', source], {
      cwd: path.join(root, name),
    });
  }
  await fs.cp(source, archive, { recursive: true });
  await fs.writeFile(
    path.join(archive, 'pnpm-workspace.yaml'),
    yaml.dump(await loadArchiveWorkspace(source, pnpm)),
  );
  await fs.rm(path.join(archive, 'settings.yaml'));
  for (const directory of [source, archive]) {
    await execFileAsync(pnpm, ['install', '--offline', '--ignore-scripts'], { cwd: directory });
  }
  const sourceLock = yaml.load(await fs.readFile(path.join(source, 'pnpm-lock.yaml'), 'utf8'));
  const archiveLock = yaml.load(await fs.readFile(path.join(archive, 'pnpm-lock.yaml'), 'utf8'));
  assert.deepEqual(archiveLock, sourceLock);
  const packages = (
    archiveLock as {
      packages: Record<string, { peerDependencies?: Record<string, string> }>;
    }
  ).packages;
  assert.ok(Object.keys(packages).some((key) => key.includes('archive-fixture-leaf-2.0.0.tgz')));
  assert.deepEqual(
    Object.entries(packages).find(([key]) => key.includes('archive-fixture-target'))?.[1]
      .peerDependencies,
    { broad: '*', exact: '*' },
  );
});

it('fails closed when permissions.build would override the exported allowBuilds policy', async (t) => {
  const root = await fixture(t, {
    'package.json': { name: 'source', private: true },
    'pnpm-workspace.yaml': {
      strictDepBuilds: true,
      allowBuilds: { 'native-fixture@1.0.0': true },
      permissions: { 'native-fixture@1.0.0': { build: false } },
    },
  });
  await assert.rejects(loadArchiveWorkspace(root, pnpm), /permissions.build/);
});

it('rejects ambiguous includes and patch paths outside the checkout before exporting', async (t) => {
  const root = await fixture(t, {
    'package.json': { name: 'source', private: true },
    'pnpm-workspace.yaml': {
      strictDepBuilds: true,
      include: { './settings.yaml': ['strictDepBuilds'] },
    },
    'settings.yaml': { strictDepBuilds: true },
  });
  await assert.rejects(loadArchiveWorkspace(root, pnpm), /DUPLICATE_SETTING/);
  await fs.writeFile(
    path.join(root, 'pnpm-workspace.yaml'),
    yaml.dump({
      strictDepBuilds: true,
      patchedDependencies: { 'outside@1.0.0': '../outside.patch' },
    }),
  );
  await assert.rejects(loadArchiveWorkspace(root, pnpm), /patch outside the repository/);
  const outside = await fixture(t, { 'outside.patch': 'outside patch fixture\n' });
  await fs.symlink(path.join(outside, 'outside.patch'), path.join(root, 'linked.patch'));
  await fs.writeFile(
    path.join(root, 'pnpm-workspace.yaml'),
    yaml.dump({
      strictDepBuilds: true,
      patchedDependencies: { 'linked@1.0.0': './linked.patch' },
    }),
  );
  await assert.rejects(loadArchiveWorkspace(root, pnpm), /patch outside the repository/);
});
