import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire, findPackageJSON } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import yaml from 'js-yaml';
import { bootLines, createService } from '../create-service.ts';
import { mutateBootInit } from '../services-verify.ts';
import { readDependencyBoundaries } from '../../scripts/lib/dependency-boundaries.ts';
import { legacyInventoryFile as inventoryPath } from '../../configs/oxlint/legacy-services.ts';

const repo = fileURLToPath(new URL('../../..', import.meta.url));
const requireRoot = createRequire(path.join(repo, 'package.json'));
const services = 'ghost/core/server/services';
const tests = 'ghost/test/unit/server/services';
const inventoryName = path.basename(inventoryPath);
const legacyReader = 'tools/configs/oxlint/legacy-services.ts';
const name = 'delivery-receipts';
const roots: string[] = [];
// The real inventory's sections, with nothing in them except what a test lists.
const sections = Object.keys(
  yaml.load(readFileSync(path.join(repo, inventoryPath), 'utf8')) as object,
);
const inventory = (legacy: Record<string, unknown> = {}) =>
  yaml.dump(
    Object.fromEntries(sections.map((section) => [section, section === 'services' ? legacy : {}])),
  );

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'gx-service-'));
  roots.push(root);
  for (const dir of [services, tests, 'tools/gx']) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  // One legacy entry whose directory is gone, and a standalone legacy file.
  writeFileSync(
    path.join(root, inventoryPath),
    inventory({ existing: { kind: 'directory' }, 'limits.ts': { kind: 'file' } }),
  );
  cpSync(path.join(repo, '.oxlintrc.json'), path.join(root, '.oxlintrc.json'));
  copy(root, '.oxfmtrc.json');
  copy(root, '.editorconfig');
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '--allow-empty',
      '--quiet',
      '-m',
      'fixture',
    ],
    { cwd: root },
  );
  return root;
}

function read(root: string, file: string) {
  return readFileSync(path.join(root, file), 'utf8');
}

function metadata(root: string) {
  return [read(root, inventoryPath), read(root, '.oxlintrc.json')];
}

function copy(root: string, file: string) {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  cpSync(path.join(repo, file), path.join(root, file));
}

function run(root: string, binary: string, args: string[]) {
  const result = spawnSync(process.execPath, [binary, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 60_000,
    env: {
      ...process.env,
      FORCE_COLOR: undefined,
      NO_COLOR: '1',
    },
  });
  assert.ifError(result.error);
  return result;
}

function success(result: ReturnType<typeof run>) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

test('creates source and a root test without registering the service anywhere', () => {
  const root = fixture();
  const before = metadata(root);
  const files = createService({ name, rootDir: root });
  assert.deepEqual(files, [
    `${services}/${name}/index.ts`,
    `${services}/${name}/${name}-service.ts`,
    `${tests}/${name}/index.test.ts`,
  ]);
  // Not being listed as legacy is what applies every check to the new service.
  assert.deepEqual(metadata(root), before);
  assert.match(read(root, files[0]!), /default defineService\('DeliveryReceiptsService'/);
  assert.match(read(root, files[1]!), /import type \{ GhostLogger \}/);
});

test('rejects invalid names without changing files', () => {
  const root = fixture();
  const before = metadata(root);
  for (const invalid of [
    '',
    '../escape',
    '/absolute',
    'two/parts',
    'has space',
    'Upper',
    'under_score',
    '-leading',
    'trailing-',
    'double--dash',
    '123',
    'a'.repeat(101),
  ]) {
    assert.throws(() => createService({ name: invalid, rootDir: root }), /Invalid service name/);
  }
  assert.deepEqual(metadata(root), before);
  assert.deepEqual(readdirSync(path.join(root, services)), [inventoryName]);
  assert.deepEqual(readdirSync(path.join(root, tests)), []);
});

test('formats short, numbered and maximum-length names', () => {
  const root = fixture();
  const oxfmt = path.join(path.dirname(requireRoot.resolve('oxfmt/package.json')), 'bin/oxfmt');
  for (const valid of ['a', 'notify-v2', 'z'.repeat(100)]) {
    const files = createService({ name: valid, rootDir: root });
    success(run(root, oxfmt, ['--check', ...files]));
  }
});

test('refuses existing directories, standalone files, tests, and legacy entries', () => {
  const root = fixture();
  const before = metadata(root);
  mkdirSync(path.join(root, services, 'directory'));
  writeFileSync(path.join(root, services, 'directory/index.ts'), 'keep source');
  writeFileSync(path.join(root, services, 'standalone.js'), 'keep legacy source');
  mkdirSync(path.join(root, tests, 'test-only'));
  writeFileSync(path.join(root, tests, 'test-only/index.test.ts'), 'keep test');
  symlinkSync('/missing/gx-service', path.join(root, services, 'dangling'));
  for (const existing of [
    'directory',
    'standalone',
    'test-only',
    'dangling',
    'existing',
    'limits',
    'legacy-service-inventory',
  ]) {
    assert.throws(
      () => createService({ name: existing, rootDir: root }),
      /already exists|is listed in .*legacy-service-inventory\.yaml/,
    );
  }
  assert.equal(read(root, `${services}/directory/index.ts`), 'keep source');
  assert.equal(read(root, `${services}/standalone.js`), 'keep legacy source');
  assert.equal(read(root, `${tests}/test-only/index.test.ts`), 'keep test');
  assert.deepEqual(metadata(root), before);
});

test('refuses a repeated generation without overwriting the service', () => {
  const root = fixture();
  const files = createService({ name, rootDir: root });
  writeFileSync(path.join(root, files[0]!), 'edited source');
  const before = metadata(root);
  assert.throws(() => createService({ name, rootDir: root }), /already exists/);
  assert.equal(read(root, files[0]!), 'edited source');
  assert.deepEqual(metadata(root), before);
});

test('reads the legacy inventory before writing and removes new directories after a write failure', () => {
  const root = fixture();
  const valid = read(root, inventoryPath);
  writeFileSync(path.join(root, inventoryPath), '[]');
  const before = metadata(root);
  assert.throws(() => createService({ name, rootDir: root }), /expected a services mapping/);
  assert.deepEqual(metadata(root), before);
  assert.deepEqual(readdirSync(path.join(root, services)), [inventoryName]);
  writeFileSync(path.join(root, inventoryPath), valid);
  rmSync(path.join(root, tests), { recursive: true });
  const restored = metadata(root);
  assert.throws(() => createService({ name, rootDir: root }), /ENOENT/);
  assert.deepEqual(metadata(root), restored);
  assert.deepEqual(readdirSync(path.join(root, services)), [inventoryName]);
});

test('gx routes service generation to its checkout and prints boot instructions', () => {
  const root = fixture();
  for (const file of ['cli.ts', 'create-service.ts', 'run-ghost-command.ts', 'package.json']) {
    copy(root, `tools/gx/${file}`);
  }
  copy(root, legacyReader);
  copy(root, 'tools/configs/oxlint/package.json');
  for (const modules of ['tools/gx/node_modules', 'tools/configs/oxlint/node_modules']) {
    symlinkSync(path.join(repo, modules), path.join(root, modules));
  }
  const cli = path.join(root, 'tools/gx/cli.ts');
  const result = run(tmpdir(), cli, ['generate', 'service', name]);
  success(result);
  assert.match(result.stdout, /ghost\/core\/boot\.js/);
  for (const line of bootLines(name)) {
    assert.ok(result.stdout.includes(line), line);
  }
  assert.match(result.stdout, /after its dependencies are ready/);
  assert.match(result.stdout, /ghost\/test\/unit\/boot\//);
  assert.match(result.stdout, /pnpm check/);
  assert.ok(result.stdout.includes(`pnpm gx services verify ${name}`));
  assert.match(result.stdout, /no inventory entry or lint registration/);
  for (const args of [[], ['Bad_Name'], ['valid', 'extra'], ['valid', '--unknown']]) {
    assert.equal(run(tmpdir(), cli, ['generate', 'service', ...args]).status, 1);
  }
  const help = run(tmpdir(), cli, ['generate', 'service', '--help']);
  success(help);
  assert.match(help.stdout, /Usage: pnpm gx generate service <name>/);
});

test('the boot call the generator prints and the guides show is the one services verify finds', () => {
  const phase = (lines: string[]) => `async function initServices() {\n${lines.join('\n')}\n}\n`;
  // One-word names, which can be reserved words, and digits still give a valid binding.
  for (const service of [name, 'new', 'tiers', 'oauth-2']) {
    const lines = bootLines(service);
    assert.doesNotThrow(() => new Script(phase(lines)), service);
    assert.equal(lines.length, 2, service);
    assert.ok(mutateBootInit(phase(lines), service), service);
  }
  const inline = /require\('[^']+'\)\.default\.init\(/;
  assert.equal(
    mutateBootInit(phase([`await require('./server/services/${name}').default.init();`]), name),
    undefined,
    'services verify does not follow an inline call, so nothing may tell an author to write one',
  );
  for (const [guide, service] of [
    ['ghost/core/server/services/README.md', name],
    ['ghost/core/kernel/README.md', 'example'],
  ] as const) {
    const source = readFileSync(path.join(repo, guide), 'utf8');
    assert.doesNotMatch(source, inline, guide);
    const blocks = [...source.matchAll(/```js\n([\s\S]*?)```/g)]
      .map((match) => match[1]!)
      .filter((block) => block.includes(`'./server/services/${service}'`));
    assert.equal(blocks.length, 1, `${guide} shows the boot call once`);
    assert.ok(mutateBootInit(phase(blocks[0]!.split('\n')), service), guide);
  }
});

test('generated output passes real lint, boundary and inventory checks with no registration, and they reject regressions', () => {
  const root = fixture();
  for (const file of [
    '.dependency-cruiser.cjs',
    'tools/scripts/ci/service-dependency-resolver.mjs',
    'ghost/core/kernel/define-service.ts',
    'ghost/eslint.config.mjs',
    'ghost/package.json',
    'ghost/tsconfig.json',
    'ghost/test/tsconfig.json',
    `${services}/README.md`,
    `${tests}/legacy-service-inventory.test.ts`,
  ]) {
    copy(root, file);
  }
  cpSync(path.join(repo, 'tools/configs/oxlint'), path.join(root, 'tools/configs/oxlint'), {
    recursive: true,
    filter: (source) => !source.includes('node_modules'),
  });
  symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'));
  symlinkSync(
    path.join(repo, 'tools/configs/oxlint/node_modules'),
    path.join(root, 'tools/configs/oxlint/node_modules'),
  );
  symlinkSync(path.join(repo, 'ghost/node_modules'), path.join(root, 'ghost/node_modules'));
  mkdirSync(path.join(root, 'apps'));
  writeFileSync(path.join(root, '.dependency-cruiser-known-violations.json'), '[]');
  // No legacy entries: the generated service is the only one, and it is not listed.
  writeFileSync(path.join(root, inventoryPath), inventory());
  createService({ name, rootDir: root });
  writeFileSync(
    path.join(root, 'ghost/vitest.config.mts'),
    `export default { test: { globals: true, setupFiles: ['./setup.cjs'], include: ['test/unit/**/*.test.ts'], maxWorkers: 1 } };\n`,
  );
  writeFileSync(path.join(root, 'ghost/setup.cjs'), "require('tsx/cjs');\n");
  const oxlint = path.join(path.dirname(requireRoot.resolve('oxlint/package.json')), 'bin/oxlint');
  const eslint = path.join(
    path.dirname(requireRoot.resolve('eslint/package.json')),
    'bin/eslint.js',
  );
  const depcruiseManifest =
    findPackageJSON('dependency-cruiser', import.meta.url) ??
    assert.fail('dependency-cruiser is not installed');
  const depcruise = path.join(
    path.dirname(depcruiseManifest),
    (JSON.parse(readFileSync(depcruiseManifest, 'utf8')) as { bin: { depcruise: string } }).bin
      .depcruise,
  );
  const vitest = path.join(path.dirname(requireRoot.resolve('vitest/package.json')), 'vitest.mjs');
  const tsc = path.join(
    path.dirname(
      createRequire(path.join(repo, 'ghost/package.json')).resolve(
        '@typescript/native/package.json',
      ),
    ),
    'bin/tsc',
  );
  const oxfmt = path.join(path.dirname(requireRoot.resolve('oxfmt/package.json')), 'bin/oxfmt');
  const source = `${services}/${name}`;
  const rootFile = `${source}/index.ts`;
  const implementation = `${source}/${name}-service.ts`;
  success(
    run(path.join(root, 'ghost'), eslint, [
      `core/server/services/${name}`,
      `test/unit/server/services/${name}`,
    ]),
  );
  success(run(root, oxlint, ['--deny-warnings', source, `${tests}/${name}`]));
  success(run(root, oxfmt, ['--check', source, `${tests}/${name}`]));
  const cruiseArgs = [source, '--config', '.dependency-cruiser.cjs', '--output-type', 'json'];
  const cruise = run(root, depcruise, cruiseArgs);
  success(cruise);
  const graph = JSON.parse(cruise.stdout);
  assert.deepEqual(graph.summary.violations, []);
  assert.ok(
    graph.modules.some((module: { source: string }) => module.source === implementation),
    'The implementation must actually be analyzed',
  );
  const boundaries = readDependencyBoundaries(root);
  assert.deepEqual(boundaries.newViolations, []);
  assert.deepEqual(boundaries.stale, []);
  success(run(path.join(root, 'ghost'), vitest, ['run', '--config', 'vitest.config.mts']));
  success(run(path.join(root, 'ghost'), tsc, ['--noEmit']));
  success(run(path.join(root, 'ghost'), tsc, ['--noEmit', '-p', 'test/tsconfig.json']));

  writeFileSync(
    path.join(root, rootFile),
    read(root, rootFile) + '\nexport const unexpected = true;\n',
  );
  const invalidRoot = run(root, oxlint, ['--deny-warnings', rootFile]);
  assert.equal(invalidRoot.status, 1, invalidRoot.stdout + invalidRoot.stderr);
  assert.match(invalidRoot.stdout, /service-root-shape/);
  writeFileSync(
    path.join(root, implementation),
    read(root, implementation) +
      "\nimport logging from '@tryghost/logging';\nlogging.info('hidden dependency');\n",
  );
  const invalidDependency = run(root, depcruise, [
    source,
    '--config',
    '.dependency-cruiser.cjs',
    '--output-type',
    'err',
  ]);
  assert.equal(invalidDependency.status, 1, invalidDependency.stdout + invalidDependency.stderr);
  assert.match(invalidDependency.stdout + invalidDependency.stderr, /service-dependencies/);
  assert.ok(
    readDependencyBoundaries(root).newViolations.some(
      (violation) =>
        violation.from === implementation && violation.rule.name === 'service-dependencies',
    ),
  );
  // The inventory test requires an index.ts root from anything that is not legacy.
  renameSync(path.join(root, rootFile), path.join(root, source, 'index.js'));
  const invalidInventory = run(path.join(root, 'ghost'), vitest, [
    'run',
    '--config',
    'vitest.config.mts',
    'legacy-service-inventory.test.ts',
  ]);
  assert.equal(invalidInventory.status, 1);
  assert.match(
    invalidInventory.stdout + invalidInventory.stderr,
    /not a legacy entry, so it must be a directory with an index\.ts root/,
  );
});
