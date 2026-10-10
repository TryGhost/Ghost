import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkoutOf,
  devProcesses,
  parseElapsed,
  parseProcesses,
  parseProcFiles,
  type Proc,
  unusedDatabases,
} from '../lib/dev-stack.ts';
import { worktreeDatabases } from '../lib/ghost-dev-env.ts';

const main = '/src/Ghost';
const worktree = '/src/Ghost/.claude/worktrees/feature';
const other = '/src/other';
const roots = [main, worktree, other];

function proc(pid: number, ppid: number, command: string, cwd?: string): Proc {
  return { pid, ppid, pgid: pid, rss: 1024, elapsed: 60, state: 'S', command, cwd };
}

// `pnpm dev` in the worktree, started by an agent's shell
const agentShell = proc(10, 1, '/bin/zsh -c pnpm dev', worktree);
const stack = [
  agentShell,
  proc(11, 10, 'node /usr/local/bin/pnpm dev', worktree),
  proc(12, 11, '/cache/pnpm-native dev', worktree),
  proc(
    13,
    12,
    "sh -c trap 'trap - INT; kill -s INT $$' INT; pnpm nx run ghost-monorepo:dev:host",
    worktree,
  ),
  proc(14, 13, 'node /usr/local/bin/pnpm nx run ghost-monorepo:dev:host', worktree),
  proc(15, 14, '/cache/pnpm-native nx run ghost-monorepo:dev:host', worktree),
  proc(16, 15, 'node /store/nx/dist/bin/nx.js run ghost-monorepo:dev:host', worktree),
  proc(17, 16, 'node /store/vite/bin/vite.js', `${worktree}/apps/admin`),
  proc(
    18,
    16,
    'node /store/vite/bin/vite.js build --watch --mode development',
    `${worktree}/apps/portal`,
  ),
  proc(19, 16, 'node ../scripts/with-ghost-dev-env.ts nodemon index.js', `${worktree}/ghost`),
  proc(20, 19, 'node /store/nodemon/bin/nodemon.js index.js', `${worktree}/ghost`),
  proc(21, 20, 'node --conditions=source --import=tsx index.js', `${worktree}/ghost`),
];
const pids = (procs: Proc[]) => procs.map((p) => p.pid).sort((a, b) => a - b);

describe('parseElapsed', () => {
  it('reads every `ps` etime form', () => {
    assert.equal(parseElapsed('05:03'), 303);
    assert.equal(parseElapsed('01:02:03'), 3723);
    assert.equal(parseElapsed('2-01:00:00'), 2 * 86400 + 3600);
  });
});

describe('parseProcesses', () => {
  it('parses `ps -o pid=,ppid=,pgid=,rss=,etime=,stat=,command=` output', () => {
    const output = `  123     1   123  52640    04:02:19 Ss   node /store/vite/bin/vite.js build --watch\n 4567   123   123   1040       11:24 S+   sh -c nodemon index.js\n`;
    assert.deepEqual(parseProcesses(output), [
      {
        pid: 123,
        ppid: 1,
        pgid: 123,
        rss: 52640,
        elapsed: 4 * 3600 + 2 * 60 + 19,
        state: 'Ss',
        command: 'node /store/vite/bin/vite.js build --watch',
      },
      {
        pid: 4567,
        ppid: 123,
        pgid: 123,
        rss: 1040,
        elapsed: 684,
        state: 'S+',
        command: 'sh -c nodemon index.js',
      },
    ]);
  });
});

describe('parseProcFiles', () => {
  it('reads a process from /proc, including a command name with spaces', () => {
    const stat =
      '4242 (node (vite)) S 1 4242 4242 0 -1 4194560 2000 0 0 0 150 30 0 0 20 0 11 0 50000 1000000 30000 18446744073709551615';
    const status = 'Name:\tnode\nVmPeak:\t  1200 kB\nVmRSS:\t   98304 kB\n';
    const cmdline = 'node\0/store/vite/bin/vite.js\0build\0--watch\0';
    assert.deepEqual(parseProcFiles(4242, { stat, cmdline, status }, 800), {
      pid: 4242,
      ppid: 1,
      pgid: 4242,
      rss: 98304,
      elapsed: 300,
      state: 'S',
      command: 'node /store/vite/bin/vite.js build --watch',
    });
  });
});

describe('checkoutOf', () => {
  it('picks the deepest checkout, as worktrees can live inside the main one', () => {
    assert.equal(checkoutOf(`${worktree}/ghost`, roots), worktree);
    assert.equal(checkoutOf(`${main}/ghost`, roots), main);
    assert.equal(checkoutOf(main, roots), main);
    assert.equal(checkoutOf('/src/Ghost-old', roots), undefined);
  });
});

describe('devProcesses', () => {
  it('finds a running stack from nx and the pnpm processes in front of it', () => {
    const found = devProcesses(stack, worktree, roots, 999);
    assert.deepEqual(pids(found.stack), [13, 14, 15, 16, 17, 18, 19, 20, 21]);
    assert.deepEqual(found.leftovers, []);
  });

  it('leaves out the calling process and its ancestors', () => {
    const devEnv = proc(30, 16, 'node scripts/ghost-dev-env.ts', worktree);
    const found = devProcesses([...stack, devEnv], worktree, roots, devEnv.pid);
    assert.deepEqual(found.stack, []);
    assert.deepEqual(found.leftovers, []);
  });

  it('only counts processes in that checkout', () => {
    assert.deepEqual(devProcesses(stack, main, roots, 999), { stack: [], leftovers: [] });
  });

  it('finds what a stack left behind once nx died', () => {
    const orphans = [
      proc(17, 1, 'node /store/vite/bin/vite.js', `${worktree}/apps/admin`),
      proc(
        18,
        1,
        'node /store/vite/bin/vite.js build --watch --mode development',
        `${worktree}/apps/portal`,
      ),
      proc(19, 1, 'node ../scripts/with-ghost-dev-env.ts pnpm dev', `${worktree}/ghost`),
      proc(20, 19, 'node /usr/local/bin/pnpm dev', `${worktree}/ghost`),
      proc(21, 20, 'node --conditions=source --import=tsx index.js', `${worktree}/ghost`),
      proc(
        22,
        1,
        'node /store/concurrently/dist/bin/concurrently.js pnpm build --watch --emptyOutDir=false',
        `${worktree}/koenig/koenig-lexical`,
      ),
    ];
    const found = devProcesses(orphans, worktree, roots, 999);
    assert.deepEqual(found.stack, []);
    assert.deepEqual(pids(found.leftovers), [17, 18, 19, 20, 21, 22]);
  });

  it('leaves dev commands that something still owns, and commands that only mention nx', () => {
    const procs = [
      agentShell,
      proc(31, 10, 'node /store/vite/bin/vite.js build --watch', `${worktree}/apps/shade`),
      proc(32, 1, 'claude -p "stop pnpm nx run ghost-monorepo:dev:host and fix it"', worktree),
      proc(33, 1, 'node /store/vite/bin/vite.js build', `${worktree}/apps/admin`),
      proc(34, 1, 'node /store/vite/bin/vite.js build --watch', `${other}/apps/portal`),
    ];
    assert.deepEqual(devProcesses(procs, worktree, roots, 999), { stack: [], leftovers: [] });
  });
});

describe('unusedDatabases', () => {
  it('lists dev_ databases no existing worktree can be using', () => {
    const databases = [
      'ghost_dev',
      'ghost_e2e_base',
      'dev_feature',
      'dev_removed',
      'dev_no_env_file',
      ...worktreeDatabases('/src/wt/hashed').slice(1),
    ];
    const worktrees = [
      { root: worktree, env: { GHOST_DEV_DATABASE: 'dev_feature' } },
      { root: '/src/wt/no-env-file' },
      { root: '/src/wt/hashed' },
    ];
    assert.deepEqual(unusedDatabases(databases, worktrees), ['dev_removed']);
  });
});

describe('worktreeDatabases', () => {
  it('names the database after the folder, or the folder and a hash', () => {
    const [plain, hashed] = worktreeDatabases('/Users/dev/.codex/worktrees/1c3f/Ghost');
    assert.equal(plain, 'dev_ghost');
    assert.match(hashed ?? '', /^dev_ghost_[0-9a-f]{6}$/);
  });
});
