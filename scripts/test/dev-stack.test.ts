import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  gitOperation,
  gitState,
  parseLsofListeners,
  parseProc,
  parseProcNetTcp,
  parseWorktrees,
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

  it('finds the rest of the process group of a leader that has exited', () => {
    // Its children are reparented, so only its group still ties the watcher to it
    const orphans = table.slice(1).map((proc) => (proc.ppid === 100 ? { ...proc, ppid: 1 } : proc));
    assert.deepEqual(treeTargets(orphans, [100]), [-100]);
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

describe('parseWorktrees', () => {
  it('reads each checkout and its branch, which a detached checkout lacks', () => {
    const output = [
      'worktree /src/ghost\nHEAD 77c87d9e\nbranch refs/heads/main',
      'worktree /src/wt/feature\nHEAD d145cc89\nbranch refs/heads/slars/feature',
      'worktree /src/wt/detached\nHEAD 0a1b2c3d\ndetached',
      '',
    ].join('\n\n');
    assert.deepEqual(parseWorktrees(output), [
      { root: '/src/ghost', branch: 'main' },
      { root: '/src/wt/feature', branch: 'slars/feature' },
      { root: '/src/wt/detached', branch: null },
    ]);
  });
});

describe('gitOperation', () => {
  it("finds an unfinished operation in a linked worktree's git directory", () => {
    const root = mkdtempSync(join(tmpdir(), 'git-operation-'));
    const gitDir = join(root, 'repo-git', 'worktrees', 'feature');
    mkdirSync(join(gitDir, 'rebase-merge'), { recursive: true });
    writeFileSync(join(root, '.git'), 'gitdir: repo-git/worktrees/feature\n');
    assert.deepEqual(gitOperation(root), { kind: 'rebase', conflicts: 0 });
  });

  it('finds nothing in a checkout without one', () => {
    const root = mkdtempSync(join(tmpdir(), 'git-operation-'));
    mkdirSync(join(root, '.git'));
    assert.equal(gitOperation(root), undefined);
    assert.equal(gitOperation(join(root, 'deleted')), undefined);
  });
});

describe('gitState', () => {
  const repo = () => {
    const root = mkdtempSync(join(tmpdir(), 'git-state-'));
    const git = (...args: string[]) =>
      execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], {
        cwd: root,
      });
    git('init', '-q');
    git('commit', '-q', '--allow-empty', '--no-gpg-sign', '-m', 'base');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    return { root, git };
  };

  it("counts a checkout's commits beyond origin/main and its uncommitted changes", async () => {
    const { root, git } = repo();
    assert.deepEqual(await gitState(root), { ahead: 0, dirty: 0 });
    git('commit', '-q', '--allow-empty', '--no-gpg-sign', '-m', 'work');
    writeFileSync(join(root, 'new.txt'), '');
    assert.deepEqual(await gitState(root), { ahead: 1, dirty: 1 });
  });

  it("finds nothing for a deleted checkout, even if a folder's left inside another", async () => {
    const { root } = repo();
    mkdirSync(join(root, 'leftover'));
    assert.equal(await gitState(join(root, 'leftover')), undefined);
    assert.equal(await gitState(join(root, 'deleted')), undefined);
  });
});
