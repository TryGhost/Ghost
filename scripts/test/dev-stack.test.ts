import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseLsofListeners,
  parseProc,
  parseProcNetTcp,
  parsePsTable,
  treeTargets,
  unusedDatabases,
} from '../lib/dev-stack.ts';
import { worktreeDatabases } from '../lib/ghost-dev-env.ts';

describe('parseProc', () => {
  it('reads a process from /proc, including a command name with spaces', () => {
    const stat =
      '4242 (node (vite)) S 1 4242 4242 0 -1 4194560 2000 0 0 0 150 30 0 0 20 0 11 0 50000 1000000 30000';
    const status = 'Name:\tnode\nVmPeak:\t  1200 kB\nVmRSS:\t   98304 kB\n';
    const cmdline = 'node\0/store/vite/bin/vite.js\0build\0--watch\0';
    assert.deepEqual(parseProc(4242, { stat, cmdline, status }), {
      pid: 4242,
      ppid: 1,
      pgid: 4242,
      rss: 98304,
      command: 'node /store/vite/bin/vite.js build --watch',
    });
  });
});

describe('parseLsofListeners', () => {
  it('maps each listening port to its pid', () => {
    const output = 'p95954\nf28\nn*:2754\np96760\nf85\nn127.0.0.1:2755\nf86\nn[::1]:2755\n';
    assert.deepEqual(
      parseLsofListeners(output),
      new Map([
        [2754, 95954],
        [2755, 96760],
      ]),
    );
  });
});

describe('parseProcNetTcp', () => {
  it('maps the inode of each listening socket to its port', () => {
    const table = [
      '  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode',
      '   0: 0100007F:09F1 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 41001 1',
      '   1: 0100007F:09F1 0100007F:C350 01 00000000:00000000 00:00000000 00000000  1000        0 41002 1',
      '   0: 00000000000000000000000000000000:09F0 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 41003 1',
    ].join('\n');
    assert.deepEqual(
      parseProcNetTcp(table),
      new Map([
        ['41001', 2545],
        ['41003', 2544],
      ]),
    );
  });
});

describe('parsePsTable', () => {
  it('reads each process and the Nx run from its environment', () => {
    const output = [
      '    1     0     1 /sbin/launchd',
      '38393     1 38393 node /w/vite.js build --watch NX_INVOCATION_ROOT_PID=38374 PWD=/w/apps/portal',
      '60928 26078 60928 grep NX_INVOCATION_ROOT_PID=38374x',
      'continued environment value',
    ].join('\n');
    assert.deepEqual(parsePsTable(output), [
      { pid: 1, ppid: 0, pgid: 1, nxRoot: undefined },
      { pid: 38393, ppid: 1, pgid: 38393, nxRoot: 38374 },
      { pid: 60928, ppid: 26078, pgid: 60928, nxRoot: undefined },
    ]);
  });
});

describe('treeTargets', () => {
  // nx 100 leads the stack's group with a watcher, and starts tasks 110 and 120 in groups of their own
  const table = [
    { pid: 100, ppid: 1, pgid: 100 },
    { pid: 101, ppid: 100, pgid: 100 },
    { pid: 110, ppid: 100, pgid: 110 },
    { pid: 111, ppid: 110, pgid: 110 },
    { pid: 120, ppid: 100, pgid: 120 },
    { pid: 121, ppid: 120, pgid: 120 },
    { pid: 122, ppid: 121, pgid: 120 },
    { pid: 200, ppid: 1, pgid: 200 },
    { pid: 201, ppid: 200, pgid: 200 },
  ];

  it('signals every process group in the tree', () => {
    assert.deepEqual(treeTargets(table, [100]), [-100, -110, -120]);
  });

  it('finds the process group of a leader that has exited', () => {
    assert.deepEqual(treeTargets(table.slice(1), [100]), [-100, -110, -120]);
  });

  it('signals processes alone in a process group led from outside the tree', () => {
    // nx 201 runs in its shell's process group, so only nx and its tasks stop
    const shell = [...table, { pid: 210, ppid: 201, pgid: 210 }];
    assert.deepEqual(treeTargets(shell, [201]), [201, -210]);
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
      { root: '/src/wt/feature', env: { GHOST_DEV_DATABASE: 'dev_feature' } },
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
