import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { tmpdir } from 'node:os';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(import.meta.dirname, '../.gx-data-'));
  roots.push(root);
  for (const dir of [
    'tools/gx',
    'tools/scripts/lib',
    'ghost/core/server/data/seeders',
    'ghost/core/server/data/schema',
    'ghost/core/server/data/db',
    'ghost/core/shared/config',
  ]) {
    await mkdir(join(root, dir), { recursive: true });
  }
  for (const file of [
    'cli.ts',
    'run-ghost-command.ts',
    'generate-data.ts',
    'multi-sub-scenarios.ts',
  ]) {
    await cp(new URL(`../${file}`, import.meta.url), join(root, 'tools/gx', file));
  }
  await cp(
    new URL('../../scripts/with-ghost-dev-env.ts', import.meta.url),
    join(root, 'tools/scripts/with-ghost-dev-env.ts'),
  );
  await cp(
    new URL('../../../ghost/core/server/data/seeders/schema.ts', import.meta.url),
    join(root, 'ghost/core/server/data/seeders/schema.ts'),
  );
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  await writeFile(join(root, 'ghost/package.json'), '{"type":"commonjs","version":"6.0.0"}');
  await writeFile(
    join(root, 'tools/scripts/lib/dev-compose.ts'),
    `
export const overlayArgs = () => [];
export const composeConfig = () => { throw new Error('Unexpected compose invocation'); };
export const hostOverlayEnv = () => ({});
`,
  );
  await writeFile(
    join(root, 'tools/scripts/lib/ghost-dev-env.ts'),
    `
export const parseEnv = () => ({});
export const resolveGhostDevEnv = async () => ({
  GHOST_DEV_NAME: 'fixture', GHOST_DEV_HOSTNAME: 'fixture.local',
  GHOST_DEV_PORT: '2400', GHOST_DEV_BACKEND_PORT: '2401', GHOST_DEV_DATABASE: 'fixture_db',
});
`,
  );
  await writeFile(
    join(root, 'ghost/core/shared/config/index.ts'),
    `
module.exports = { getSiteUrl: () => process.env.url, get: () => ({client: 'mysql2'}) };
`,
  );
  await writeFile(
    join(root, 'ghost/core/server/data/schema/index.js'),
    'exports.tables = { members: {} };',
  );
  await writeFile(
    join(root, 'ghost/core/server/data/db/index.js'),
    `
process.stdout.write('DB_LOADED\\n');
const knex = Object.assign(() => ({ where: () => ({ first: async () => undefined }) }), {
  destroy: async () => process.stdout.write('DESTROYED\\n'),
});
Object.defineProperty(exports, 'knex', {get: () => knex});
`,
  );
  await writeFile(
    join(root, 'ghost/core/server/data/seeders/data-generator.js'),
    `
module.exports = class DataGenerator {
  constructor(options) {
    if (process.env.FAIL_GENERATOR_SETUP) { throw new Error('fixture setup failure'); }
    this.options = options;
  }
  async importData() {
    const { knex, logger, ...options } = this.options;
    logger.log('GENERATOR_LOG');
    process.stdout.write(JSON.stringify({ options, connection: typeof knex, cwd: process.cwd(), env: process.env.NODE_ENV,
      database: process.env.database__connection__database,
      port: process.env.database__connection__port,
      infile: process.env.REQUIRE_INFILE_STREAM,
      source: process.execArgv.includes('--conditions=source'),
    }) + '\\n');
    if (process.env.FAIL_GENERATOR) { throw new Error('fixture import failure'); }
  }
};
`,
  );
  return root;
}

function run(root: string, args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [join(root, 'tools/gx/cli.ts'), 'data', ...args], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: { NO_COLOR: '1', database__connection__port: '3333', ...env },
    timeout: 10000,
  });
}

// A compiled installed tree with only its production schema dependency: no gx or source loader.
async function installedFixture(root: string) {
  const installed = await mkdtemp(join(tmpdir(), 'ghost-data-installed-'));
  roots.push(installed);
  for (const file of ['bin/generate-data.ts', 'core/server/data/seeders/schema.ts']) {
    const source = await readFile(new URL(`../../../ghost/${file}`, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2024,
        esModuleInterop: true,
      },
    });
    const output = join(installed, file.replace(/\.ts$/, '.js'));
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, outputText);
  }
  for (const file of [
    'package.json',
    'core/server/data/db/index.js',
    'core/server/data/schema/index.js',
    'core/server/data/seeders/data-generator.js',
  ]) {
    const output = join(installed, file);
    await mkdir(dirname(output), { recursive: true });
    await cp(join(root, 'ghost', file), output);
  }
  await mkdir(join(installed, 'core/shared/config'), { recursive: true });
  await cp(
    join(root, 'ghost/core/shared/config/index.ts'),
    join(installed, 'core/shared/config/index.js'),
  );
  await cp(
    dirname(fileURLToPath(import.meta.resolve('zod/package.json'))),
    join(installed, 'node_modules/zod'),
    { recursive: true },
  );
  return installed;
}

function runInstalled(root: string, args: string[]) {
  return spawnSync(process.execPath, [join(root, 'bin/generate-data.js'), ...args], {
    cwd: root,
    env: { NODE_ENV: 'testing', NO_COLOR: '1', url: 'http://fixture.local:2400/' },
    encoding: 'utf8',
    timeout: 10000,
  });
}

function generatedOptions(stdout: string) {
  const output = stdout.split('\n').find((line) => line.startsWith('{'));
  assert(output, stdout);
  return JSON.parse(output).options;
}

test('data generate forwards all options and uses the checkout environment from another directory', async () => {
  const root = await fixture();
  const result = run(root, [
    'generate',
    '--base-data-pack',
    '/tmp/example.json',
    '--clear-database',
    '--tables',
    'members:7,posts',
    '--quantities',
    'posts:3',
    '--with-default',
    '--print-dependencies',
    '--seed',
    '123',
  ]);
  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout.split('\n').find((line) => line.startsWith('{'));
  assert(output, result.stdout);
  assert.deepEqual(JSON.parse(output), {
    options: {
      baseDataPack: '/tmp/example.json',
      baseUrl: 'http://fixture.local:2400/',
      clearDatabase: true,
      tables: [{ name: 'members', quantity: 7 }, { name: 'posts' }],
      schemaTables: { members: {} },
      withDefault: true,
      printDependencies: true,
      quantities: { posts: 3 },
      seed: 123,
    },
    connection: 'function',
    cwd: await realpath(join(root, 'ghost')),
    env: 'development',
    database: 'fixture_db',
    port: '3333',
    infile: '1',
    source: true,
  });
  assert.match(result.stdout, /GENERATOR_LOG/);
  assert.match(result.stdout, /DESTROYED/);
});

test('data generate preserves allowed environments and cleans up after an import error', async () => {
  const root = await fixture();
  for (const env of ['local', 'staging', 'production']) {
    const result = run(root, ['generate'], { NODE_ENV: env });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, new RegExp(`"env":"${env}"`));
    assert.match(result.stdout, /DESTROYED/);
  }
  const result = run(root, ['generate'], { FAIL_GENERATOR: '1' });
  // Preserve the existing generator's log-and-return behavior on import failure.
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /fixture import failure/);
  assert.match(result.stdout, /DESTROYED/);
});

test('data generate shows its own help and rejects options/environments before loading the database', async () => {
  const root = await fixture();
  const help = run(root, ['generate', '--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /pnpm gx data generate/);
  assert.match(help.stdout, /--quantities/);
  assert.doesNotMatch(help.stdout, /DB_LOADED/);
  const invalid = run(root, ['generate', '--unknown-option']);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stdout + invalid.stderr, /Unknown/);
  assert.doesNotMatch(invalid.stdout, /DB_LOADED/);
  const rejected = run(root, ['generate'], { NODE_ENV: 'testing' });
  assert.equal(rejected.status, 2);
  assert.match(rejected.stdout, /not permitted in testing/);
  assert.doesNotMatch(rejected.stdout, /DB_LOADED/);
});

test('multi-sub-scenarios reports missing prerequisites and propagates failure with cleanup', async () => {
  const root = await fixture();
  const result = run(root, ['multi-sub-scenarios']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Could not find a paid product/);
  assert.match(result.stdout, /DESTROYED/);
});

test('multi-sub-scenarios help and invalid options do not load the database', async () => {
  const root = await fixture();
  const help = run(root, ['multi-sub-scenarios', '--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage: pnpm gx data multi-sub-scenarios/);
  assert.doesNotMatch(help.stdout, /DB_LOADED/);
  const invalid = run(root, ['multi-sub-scenarios', '--unknown']);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Unknown option/);
  assert.doesNotMatch(invalid.stdout, /DB_LOADED/);
});

test('data generate validates quantities before Core setup and releases the connection on setup failure', async () => {
  const root = await fixture();
  const invalid = run(root, ['generate', '--quantities', 'posts:invalid']);
  assert.match(invalid.stdout, /Invalid quantity override: posts:invalid/);
  assert.doesNotMatch(invalid.stdout, /DB_LOADED/);
  const failed = run(root, ['generate'], { FAIL_GENERATOR_SETUP: '1' });
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /fixture setup failure/);
  assert.match(failed.stdout, /DESTROYED/);
});

test('gx and the compiled installed entrypoint share defaults, options and zero quantities', async () => {
  const root = await fixture();
  const installed = await installedFixture(root);
  for (const args of [
    [],
    ['--tables=members:0,posts', '--quantities=posts:0', '--seed=0'],
    [
      '--base-data-pack=/tmp/example.json',
      '--clear-database',
      '--tables=members:7,posts',
      '--quantities=posts:3',
      '--with-default',
      '--print-dependencies',
      '--seed=123',
    ],
  ]) {
    const gx = run(root, ['generate', ...args]);
    const bin = runInstalled(installed, args);
    assert.equal(gx.status, 0, gx.stdout + gx.stderr);
    assert.equal(bin.status, 0, bin.stdout + bin.stderr);
    assert.deepEqual(generatedOptions(bin.stdout), generatedOptions(gx.stdout));
    assert.match(bin.stdout, /"env":"testing"/);
    assert.match(bin.stdout, /DESTROYED/);
  }
  const zero = runInstalled(installed, ['--tables=members:0', '--quantities=posts:0', '--seed=0']);
  assert.equal(zero.status, 0, zero.stdout + zero.stderr);
  const options = generatedOptions(zero.stdout);
  assert.deepEqual(options.tables, [{ name: 'members', quantity: 0 }]);
  assert.deepEqual(options.quantities, { posts: 0 });
  assert.equal(options.seed, 0);
});

test('both entrypoints reject invalid quantities and seeds before loading the database', async () => {
  const root = await fixture();
  const installed = await installedFixture(root);
  for (const args of [
    ['--quantities=posts:invalid'],
    ['--quantities=posts'],
    ['--tables=members:invalid'],
    ['--tables=members:'],
    ['--tables=members:1:bad'],
    ['--quantities=posts:1:bad'],
    ['--tables=:1'],
    ['--quantities=:1'],
    ['--quantities=posts:10k'],
    ['--quantities=posts:-5'],
    ['--quantities=posts:1.5'],
    ['--tables=members:10k'],
    ['--tables=members:-5'],
    ['--tables=members:1.5'],
    ['--quantities=posts:9007199254740992'],
    ['--tables=members:9007199254740992'],
    ['--seed=invalid'],
  ]) {
    for (const result of [run(root, ['generate', ...args]), runInstalled(installed, args)]) {
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.doesNotMatch(result.stdout, /DB_LOADED/);
    }
  }
});
