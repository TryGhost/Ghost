import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ghostRoot = path.resolve(__dirname, '../../..');
const entrypoint = path.join(ghostRoot, 'index.js');

describe('Internal CLI entrypoints', function () {
  let directory: string;
  let preload: string;

  beforeAll(function () {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-cli-entrypoints-'));
    const contentPath = path.join(directory, 'content');
    fs.mkdirSync(contentPath);
    // Version lookup expects the command's working directory to be a package.
    fs.copyFileSync(path.join(ghostRoot, 'package.json'), path.join(directory, 'package.json'));
    // The child starts here, so config loading cannot find the checkout's
    // config.local files. No parent environment or database is inherited.
    fs.writeFileSync(
      path.join(directory, 'config.development.json'),
      JSON.stringify({
        url: 'http://example.test',
        paths: { contentPath },
        database: {
          client: 'better-sqlite3',
          connection: { filename: ':memory:' },
          useNullAsDefault: true,
        },
        sentry: { disabled: true },
        logging: { level: 'error', transports: ['stdout'] },
      }),
    );
    preload = path.join(directory, 'guard.cjs');
    fs.writeFileSync(
      preload,
      `
        require(${JSON.stringify(require.resolve('nock'))}).disableNetConnect();
        const net = require('node:net');
        const noNetwork = () => { throw new Error('CLI fixture must not use network sockets'); };
        net.Socket.prototype.connect = noNetwork;
        net.Server.prototype.listen = noNetwork;

        // A command must be dispatched without entering the normal server boot.
        const Module = require('node:module');
        const load = Module._load;
        Module._load = function (request, parent, isMain) {
          if (request === 'better-sqlite3') {
            return function () { throw new Error('CLI fixture must not open a database'); };
          }
          if (parent?.filename === ${JSON.stringify(entrypoint)} && request === './core/boot') {
            throw new Error('Internal CLI command entered server boot');
          }
          return load.call(this, request, parent, isMain);
        };
      `,
    );
  });

  afterAll(function () {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  function run(command: string, args: string[] = [], input?: string) {
    const result = spawnSync(
      process.execPath,
      ['--require', preload, entrypoint, command, ...args],
      {
        cwd: directory,
        env: {
          NODE_ENV: 'development',
          NODE_REPL_HISTORY: '',
          NO_COLOR: '1',
        },
        input,
        encoding: 'utf8',
        timeout: 5000,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null, result.stderr);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    return result.stdout;
  }

  for (const [command, description] of [
    ['repl', 'Launches a REPL environment'],
    ['timetravel', 'Updates the Ghost db and shifts all dates'],
  ]) {
    it(`${command} exposes its help through the real entrypoint without booting`, function () {
      // Help tests parsing and eager imports; it does not execute handle().
      const output = run(command, ['--help']);
      assert.ok(output.includes(description), output);
    });
  }

  it('prints the data generator dependencies without importing or booting', function () {
    const output = run('generate-data', ['--print-dependencies', '--tables', 'posts_tags']);
    assert.match(output, /Table dependencies:/);
    const tables = [...output.matchAll(/^info\s+(\w+):([^\n]*)$/gm)].map(
      ([, name, dependencies]) =>
        [name, dependencies.trim() ? dependencies.trim().split(', ') : []] as const,
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
        assert.ok(names.indexOf(dependency) < names.indexOf(name), `${dependency} before ${name}`);
      }
    }
  });

  it('loads the real models and database context before boot and restores it on REPL reset', function () {
    const output = run(
      'repl',
      [],
      [
        'console.log("CLI_CONTEXT", typeof models.User.findOne, models === m, typeof knex, knex === k)',
        'models = null; m = null; knex = null; k = null',
        '.clear',
        'console.log("CLI_RESET", typeof models.User.findOne, models === m, typeof knex, knex === k)',
        '.exit',
        '',
      ].join('\n'),
    );
    assert.match(output, /CLI_CONTEXT function true function true/);
    assert.match(output, /CLI_RESET function true function true/);
  });
});
