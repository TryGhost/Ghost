import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cp, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(join(import.meta.dirname, '../.gx-interactive-'));
  roots.push(root);
  for (const directory of [
    'tools/gx',
    'tools/scripts/lib',
    'ghost/core/server/data/db',
    'ghost/core/server/data/schema',
    'ghost/core/server/models',
  ]) {
    await mkdir(join(root, directory), { recursive: true });
  }
  for (const file of ['cli.ts', 'run-ghost-command.ts', 'repl.cts', 'shift-dates.cts']) {
    await cp(new URL(`../${file}`, import.meta.url), join(root, 'tools/gx', file));
  }
  await cp(
    new URL('../../scripts/with-ghost-dev-env.ts', import.meta.url),
    join(root, 'tools/scripts/with-ghost-dev-env.ts'),
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
export const resolveGhostDevEnv = async () => ({GHOST_DEV_NAME: 'fixture', GHOST_DEV_HOSTNAME: 'fixture.local', GHOST_DEV_PORT: '2400', GHOST_DEV_BACKEND_PORT: '2401', GHOST_DEV_DATABASE: 'fixture_db'});
`,
  );
  await writeFile(
    join(root, 'ghost/core/server/models/index.js'),
    'exports.User = {findOne: () => {}};',
  );
  await writeFile(
    join(root, 'ghost/core/server/data/schema/index.js'),
    `
exports.tables = {posts: {title: {type: 'string'}, created_at: {type: 'dateTime'}, updated_at: {type: 'dateTime'}}, members: {created_at: {type: 'dateTime'}}, roles: {name: {type: 'string'}}};
`,
  );
  await writeFile(
    join(root, 'ghost/core/server/data/db/index.js'),
    `
process.stdout.write('DB_LOADED\\n');
const knex = Object.assign(() => ({max: () => ({first: async () => ({created_at: process.env.NO_BASELINE ? null : new Date(Date.now() - 5 * 86400000)})})}), {
  fixtureEnv: {cwd: process.cwd(), database: process.env.database__connection__database, source: process.execArgv.includes('--conditions=source')},
  destroy: async () => process.stdout.write('DESTROYED\\n'),
  transaction: async (callback) => {
    process.stdout.write('BEGIN\\n');
    const transaction = Object.assign((table) => ({update: async (column, query) => {
      if (process.env.FAIL_SQL && table === 'members') throw new Error('fixture update failure');
      process.stdout.write(JSON.stringify({table, column, query}) + '\\n');
    }}), {raw: (query) => query});
    try { await callback(transaction); process.stdout.write('COMMIT\\n'); }
    catch (error) { process.stdout.write('ROLLBACK\\n'); throw error; }
  },
});
Object.defineProperty(exports, 'knex', {get: () => knex});
`,
  );
  return root;
}
function run(root: string, args: string[], input = '', env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [join(root, 'tools/gx/cli.ts'), ...args], {
    cwd: tmpdir(),
    input,
    encoding: 'utf8',
    timeout: 10000,
    env: { NODE_REPL_HISTORY: '', NO_COLOR: '1', ...env },
  });
}

test('REPL forwards input, exposes and restores context on reset, and closes the database on exit', async () => {
  const root = await fixture();
  const result = run(
    root,
    ['repl', '--color', 'red'],
    [
      'console.log("REPL_CONTEXT", typeof models.User.findOne, models === m, typeof knex, knex === k)',
      'console.log("REPL_ENV", JSON.stringify(knex.fixtureEnv))',
      'models = null; m = null; knex = null; k = null',
      '.clear',
      'console.log("REPL_RESET", typeof models.User.findOne, models === m, typeof knex, knex === k)',
      '.exit',
      '',
    ].join('\n'),
  );
  assert.equal(result.error, undefined, result.stdout + result.stderr);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /REPL_CONTEXT function true function true/);
  assert.match(result.stdout, /REPL_RESET function true function true/);
  const environment = result.stdout.match(/REPL_ENV ({[^\n]+})/);
  assert(environment?.[1], result.stdout);
  assert.deepEqual(JSON.parse(environment[1]), {
    cwd: await realpath(join(root, 'ghost')),
    database: 'fixture_db',
    source: true,
  });
  assert.match(result.stdout, /DESTROYED/);
});

test('interactive command help and rejected environments never load the database', async () => {
  const root = await fixture();
  for (const command of [['repl'], ['data', 'shift-dates']]) {
    const help = run(root, [...command, '--help']);
    assert.equal(help.status, 0, help.stdout + help.stderr);
    assert.match(help.stdout, new RegExp(`pnpm gx ${command.join(' ')}`));
    assert.doesNotMatch(help.stdout, /DB_LOADED/);
    const forbidden = run(root, command, '', { NODE_ENV: 'production' });
    assert.equal(forbidden.status, 2, forbidden.stdout + forbidden.stderr);
    assert.match(forbidden.stdout, /not permitted in production/);
    assert.doesNotMatch(forbidden.stdout, /DB_LOADED/);
  }
});

test('shift-dates updates only dateTime fields transactionally and force skips confirmation', async () => {
  const root = await fixture();
  const result = run(root, ['data', 'shift-dates', '--offset=-2', '--force']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const statements = result.stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));
  assert.deepEqual(statements, [
    { table: 'posts', column: 'created_at', query: 'DATE_ADD(created_at, interval -2 day)' },
    { table: 'posts', column: 'updated_at', query: 'DATE_ADD(updated_at, interval -2 day)' },
    { table: 'members', column: 'created_at', query: 'DATE_ADD(created_at, interval -2 day)' },
  ]);
  assert.match(result.stdout, /COMMIT/);
  assert.match(result.stdout, /DESTROYED/);
  assert.doesNotMatch(result.stdout, /Are you sure/);
});

test('shift-dates preserves confirmation cancellation without changing any rows', async () => {
  const root = await fixture();
  const result = run(root, ['data', 'shift-dates', '--offset', '2'], 'n\n');
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /Are you sure you want to continue/);
  assert.match(result.stdout, /Aborting/);
  assert.doesNotMatch(result.stdout, /BEGIN/);
  assert.match(result.stdout, /DESTROYED/);
});

test('shift-dates derives its default offset from logins and handles an empty baseline', async () => {
  const root = await fixture();
  const result = run(root, ['data', 'shift-dates', '--force']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /interval 5 day/);
  const empty = run(root, ['data', 'shift-dates', '--force'], '', { NO_BASELINE: '1' });
  assert.equal(empty.status, 0, empty.stdout + empty.stderr);
  assert.match(empty.stdout, /No data to use as baseline/);
  assert.doesNotMatch(empty.stdout, /BEGIN/);
  assert.match(empty.stdout, /DESTROYED/);
});

test('shift-dates rolls back and releases the connection if an update fails', async () => {
  const root = await fixture();
  const result = run(root, ['data', 'shift-dates', '--offset', '2', '--force'], '', {
    FAIL_SQL: '1',
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /fixture update failure/);
  assert.match(result.stdout, /ROLLBACK/);
  assert.doesNotMatch(result.stdout, /COMMIT/);
  assert.match(result.stdout, /DESTROYED/);
});
