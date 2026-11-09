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
  const root = await mkdtemp(join(import.meta.dirname, '../.gx-benchmark-'));
  roots.push(root);
  for (const dir of [
    'tools/gx',
    'tools/scripts/lib',
    'node_modules/knex',
    'node_modules/knex-migrator',
    'ghost/core/server/data/db',
    'ghost/core/server/models',
    'ghost/core/server/services/email-service',
  ]) {
    await mkdir(join(root, dir), { recursive: true });
  }
  for (const file of ['cli.ts', 'run-ghost-command.ts', 'benchmark-recipient-preparation.ts']) {
    await cp(new URL(`../${file}`, import.meta.url), join(root, 'tools/gx', file));
  }
  await cp(
    new URL('../../scripts/with-ghost-dev-env.ts', import.meta.url),
    join(root, 'tools/scripts/with-ghost-dev-env.ts'),
  );
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  await writeFile(join(root, 'ghost/package.json'), '{"type":"commonjs"}');
  for (const name of ['knex', 'knex-migrator']) {
    await writeFile(
      join(root, 'node_modules', name, 'package.json'),
      JSON.stringify({ name, main: 'index.cjs' }),
    );
  }
  await writeFile(
    join(root, 'tools/scripts/lib/dev-compose.ts'),
    `export const overlayArgs=()=>[];export const composeConfig=()=>{throw new Error('Unexpected compose');};export const hostOverlayEnv=()=>({});`,
  );
  await writeFile(
    join(root, 'tools/scripts/lib/ghost-dev-env.ts'),
    `export const parseEnv=()=>({});export const resolveGhostDevEnv=async()=>({GHOST_DEV_NAME:'fixture',GHOST_DEV_HOSTNAME:'fixture.local',GHOST_DEV_PORT:'2400',GHOST_DEV_BACKEND_PORT:'2401',GHOST_DEV_DATABASE:'developer_database'});`,
  );
  await writeFile(
    join(root, 'node_modules/knex/index.cjs'),
    `
exports.knex = (options) => {
  const admin = !options.connection.database;
  const listeners = {};
  if (admin) console.log('ADMIN', JSON.stringify(options.connection));
  const knex = (table) => ({
    first: async () => ({id:'newsletter'}),
    insert: async (rows) => { if (table === 'members') console.log('MEMBERS', rows.length); },
    where: () => ({update: async () => console.log('RESET_PREPARATION')}),
  });
  knex.raw = async (sql, bindings) => {
    if (sql.startsWith('CREATE')) { console.log('CREATE_DATABASE', bindings[0]); if (process.env.FAIL_CREATE) throw new Error('create failed'); }
    if (sql.startsWith('DROP')) console.log('DROP_DATABASE', bindings[0]);
    return [[{version:'fixture-mysql'}]];
  };
  knex.on = (name, callback) => {listeners[name] = callback;};
  knex.emit = (name, ...args) => listeners[name]?.(...args);
  knex.destroy = async () => console.log(admin ? 'ADMIN_DESTROYED' : 'DB_DESTROYED');
  return knex;
};
module.exports = exports.knex;
module.exports.knex = module.exports;
module.exports.default = module.exports;
`,
  );
  await writeFile(
    join(root, 'node_modules/knex-migrator/index.cjs'),
    `module.exports = class {
  constructor(options) { console.log('MIGRATOR', JSON.stringify(options)); }
  async init() { if (process.env.FAIL_INIT) throw new Error('init failed'); }
};`,
  );
  await writeFile(join(root, 'ghost/core/server/overrides.js'), '');
  await writeFile(
    join(root, 'ghost/core/server/data/db/index.js'),
    `
const knex = require('knex').knex({connection:{database:process.env.database__connection__database}});
Object.defineProperty(exports,'knex',{get:()=>knex});
`,
  );
  await writeFile(
    join(root, 'ghost/core/server/models/index.js'),
    `exports.Email = {add:async (data)=>({id:'email',get:(key)=>key === 'candidate_count' ? data.email_count : data[key],refresh:async()=>{}})};`,
  );
  await writeFile(
    join(root, 'ghost/core/server/services/email-service/email-segmenter.js'),
    'module.exports = class {};',
  );
  await writeFile(
    join(root, 'ghost/core/server/services/email-service/batch-sending-service.js'),
    `
const logging = require('@tryghost/logging');
module.exports = class {
  constructor(options) {
    this.options = options;
    console.log('CONTEXT', JSON.stringify({cwd:process.cwd(),env:process.env.NODE_ENV,database:process.env.database__connection__database,port:process.env.database__connection__port,source:process.execArgv.includes('--conditions=source'),gc:typeof global.gc,concurrency:options.batchCreationConcurrency}));
  }
  async createBatches() {
    if (process.env.FAIL_PREPARE) throw new Error('prepare failed');
    const query = {sql:'select \`uuid\` from \`members\`',__knexQueryUid:'lookup'};
    this.options.db.knex.emit('query',query);
    this.options.db.knex.emit('query-response',[{},{}],query);
    logging.info({event:{name:'email.batches.created'},batches_total:2});
    logging.info({event:{name:'email.preparation.swept'},duration_ms:3});
    logging.info({event:{name:'email.preparation.discarded'}});
    return [];
  }
};`,
  );
  return root;
}
function run(root: string, args: string[], env: Record<string, string> = {}) {
  return spawnSync(
    process.execPath,
    [join(root, 'tools/gx/cli.ts'), 'benchmark', 'recipient-preparation', ...args],
    {
      cwd: tmpdir(),
      encoding: 'utf8',
      timeout: 15000,
      env: {
        NO_COLOR: '1',
        database__connection__host: '127.0.0.1',
        database__connection__port: '3333',
        ...env,
      },
    },
  );
}

test('benchmark forwards options, enables source/GC, reports each phase and drops only its own database', async () => {
  const root = await fixture();
  const result = run(root, ['10', '3']);
  assert.equal(result.error, undefined, result.stdout + result.stderr);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const contextLine = result.stdout.split('\n').find((line) => line.startsWith('CONTEXT '));
  assert(contextLine, result.stdout);
  const context = JSON.parse(contextLine.slice('CONTEXT '.length));
  assert.match(context.database, /^ghost_preparation_bench_\d+_[a-f0-9]{6}$/);
  assert.deepEqual(context, {
    cwd: await realpath(join(root, 'ghost')),
    env: 'testing-mysql',
    database: context.database,
    port: '3333',
    source: true,
    gc: 'function',
    concurrency: 3,
  });
  assert.match(result.stdout, /ADMIN .*"port":3333/);
  assert.match(result.stdout, /MEMBERS 10/);
  const phases = result.stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    phases.map((phase) => phase.phase),
    ['database', 'prepare:all', 'discard-and-rebuild:all', 'prepare:label:benchmark-label'],
  );
  for (const phase of phases.slice(1)) {
    assert.equal(phase.size, 10);
    assert.equal(phase.concurrency, 3);
    assert.equal(phase.batches, 2);
    assert.equal(phase.sweep_ms, 3);
    assert.equal(phase.member_lookup_queries, 1);
    assert.equal(phase.member_lookup_rows, 2);
    assert.equal(phase.prepared, phase.phase.endsWith('benchmark-label') ? 2 : 10);
  }
  assert(result.stdout.indexOf('DB_DESTROYED') < result.stdout.indexOf('DROP_DATABASE'));
  assert(result.stdout.includes('DROP_DATABASE ' + context.database));
  assert.match(result.stdout, /ADMIN_DESTROYED/);
  assert.doesNotMatch(result.stdout, /DROP_DATABASE developer_database/);
});

test('benchmark validates help and arguments before opening a database', async () => {
  const root = await fixture();
  const help = run(root, ['--help']);
  assert.equal(help.status, 0, help.stdout + help.stderr);
  assert.match(help.stdout, /members=500000.*concurrency=2/);
  assert.doesNotMatch(help.stdout, /ADMIN|CREATE_DATABASE/);
  for (const args of [['0'], ['1.5'], ['10', '-1'], ['nope']]) {
    const result = run(root, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: pnpm gx benchmark recipient-preparation/);
    assert.doesNotMatch(result.stdout, /ADMIN|CREATE_DATABASE/);
  }
});

for (const failure of ['CREATE', 'INIT', 'PREPARE']) {
  test(`benchmark closes connections and cleans up after ${failure.toLowerCase()} failure`, async () => {
    const root = await fixture();
    const result = run(root, ['10'], { ['FAIL_' + failure]: '1' });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, new RegExp(failure.toLowerCase() + ' failed'));
    assert.match(result.stdout, /ADMIN_DESTROYED/);
    assert.equal(result.stdout.includes('DROP_DATABASE'), failure !== 'CREATE');
    assert.equal(result.stdout.includes('DB_DESTROYED'), failure === 'PREPARE');
  });
}
