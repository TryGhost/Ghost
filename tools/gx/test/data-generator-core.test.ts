import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('Core commands load real generator, REPL and rebuild modules without database or network access', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gx-data-core-'));
  try {
    const contentPath = join(directory, 'content');
    await mkdir(contentPath);
    await cp(
      new URL('../../../ghost/package.json', import.meta.url),
      join(directory, 'package.json'),
    );
    await writeFile(
      join(directory, 'config.development.json'),
      JSON.stringify({
        url: 'http://example.test',
        paths: { contentPath },
        database: {
          client: 'better-sqlite3',
          connection: { filename: ':memory:' },
          useNullAsDefault: true,
        },
        createInDevelopmentTables: false,
        sentry: { disabled: true },
        logging: { level: 'error', transports: ['stdout'] },
      }),
    );
    const guard = join(directory, 'guard.cjs');
    await writeFile(
      guard,
      `
const forbid = (message) => { process.stderr.write(message + '\\n'); process.exit(97); };
const net = require('node:net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof options === 'string' || options?.path) return connect.apply(this, args);
  forbid('must not open network connections');
};
net.Server.prototype.listen = () => forbid('must not listen for connections');
const Module = require('node:module');
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'better-sqlite3') return function () { forbid('must not open a database'); };
  return load.call(this, request, parent, isMain);
};
`,
    );
    // Loading real Core models/importers can take longer on a cold TypeScript loader.
    const result = spawnSync(
      process.execPath,
      [
        '--require',
        guard,
        '--import',
        import.meta.resolve('tsx'),
        fileURLToPath(new URL('../generate-data.ts', import.meta.url)),
        '--print-dependencies',
        '--tables',
        'posts_tags',
      ],
      {
        cwd: directory,
        env: { NODE_ENV: 'development', NO_COLOR: '1' },
        encoding: 'utf8',
        timeout: 15000,
      },
    );
    assert.equal(result.error, undefined, result.stdout + result.stderr);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /Table dependencies:/);
    const tables = [...result.stdout.matchAll(/^info\s+(\w+):([^\n]*)$/gm)].map<[string, string[]]>(
      ([, name, dependencies = '']) => {
        assert(name);
        return [name, dependencies.trim() ? dependencies.trim().split(', ') : []];
      },
    );
    assert.deepEqual(Object.fromEntries(tables), {
      newsletters: [],
      posts: ['newsletters'],
      users: [],
      tags: ['users'],
      posts_tags: ['posts', 'tags'],
    });
    const names = tables.map(([name]) => name);
    for (const [name, dependencies] of tables) {
      for (const dependency of dependencies) {
        assert(names.indexOf(dependency) < names.indexOf(name));
      }
    }
    const repl = spawnSync(
      process.execPath,
      [
        '--require',
        guard,
        '--import',
        import.meta.resolve('tsx'),
        fileURLToPath(new URL('../repl.ts', import.meta.url)),
      ],
      {
        cwd: directory,
        env: { NODE_ENV: 'development', NODE_REPL_HISTORY: '', NO_COLOR: '1' },
        encoding: 'utf8',
        timeout: 15000,
        input: [
          'console.log("CORE_CONTEXT", typeof models.User.findOne, models === m, typeof knex, knex === k)',
          'models = null; m = null; knex = null; k = null',
          '.clear',
          'console.log("CORE_RESET", typeof models.User.findOne, models === m, typeof knex, knex === k)',
          '.exit',
          '',
        ].join('\n'),
      },
    );
    assert.equal(repl.error, undefined, repl.stdout + repl.stderr);
    assert.equal(repl.status, 0, repl.stdout + repl.stderr);
    assert.match(repl.stdout, /CORE_CONTEXT function true function true/);
    assert.match(repl.stdout, /CORE_RESET function true function true/);
    const rebuild = spawnSync(
      process.execPath,
      [
        '--require',
        guard,
        '--import',
        import.meta.resolve('tsx'),
        fileURLToPath(new URL('../rebuild-in-development-tables.ts', import.meta.url)),
      ],
      {
        cwd: directory,
        env: { NODE_ENV: 'development', logging__level: 'warn', NO_COLOR: '1' },
        encoding: 'utf8',
        timeout: 15000,
      },
    );
    assert.equal(rebuild.error, undefined, rebuild.stdout + rebuild.stderr);
    assert.equal(rebuild.status, 0, rebuild.stdout + rebuild.stderr);
    assert.match(rebuild.stdout, /In-development tables are disabled/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
