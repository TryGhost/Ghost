import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { devProcesses, parseEnviron, parsePs, type ProcessEntry } from '../lib/dev-processes.ts';

describe('parsePs', () => {
  it('reads each process and the environment `ps -E` appends to its command', () => {
    const output = [
      '  401     1   401  51824 Sat Oct 10 13:19:40 2026     node /store/vite.js build --watch HOME=/Users/me NX_INVOCATION_ROOT_PID=380 NX_WORKSPACE_ROOT=/Users/me/Application Support/Ghost npm_package_name=ghost-monorepo',
      '  402   401   401    656 Thu Oct  1 09:05:00 2026 /bin/sh -c vite',
      'garbage',
    ].join('\n');
    assert.deepEqual(parsePs(output), [
      {
        pid: 401,
        ppid: 1,
        pgid: 401,
        rss: 51824,
        started: new Date(2026, 9, 10, 13, 19, 40).getTime(),
        command: 'node /store/vite.js build --watch',
        env: {
          NX_INVOCATION_ROOT_PID: '380',
          NX_WORKSPACE_ROOT: '/Users/me/Application Support/Ghost',
          npm_package_name: 'ghost-monorepo',
        },
      },
      {
        pid: 402,
        ppid: 401,
        pgid: 401,
        rss: 656,
        started: new Date(2026, 9, 1, 9, 5, 0).getTime(),
        command: '/bin/sh -c vite',
        env: {},
      },
    ]);
  });
});

describe('parseEnviron', () => {
  it('keeps the variables that identify a Ghost dev process', () => {
    assert.deepEqual(
      parseEnviron('HOME=/root\0NX_WORKSPACE_ROOT=/work/a=b\0PNPM_PACKAGE_NAME=ghost-monorepo\0'),
      { NX_WORKSPACE_ROOT: '/work/a=b', PNPM_PACKAGE_NAME: 'ghost-monorepo' },
    );
  });
});

describe('devProcesses', () => {
  const entry = (
    pid: number,
    started: number,
    env: Record<string, string> = {},
    pgid = pid,
  ): ProcessEntry => ({ pid, ppid: 1, pgid, rss: 1024, command: `node ${pid}`, started, env });
  const nx = (owner: number, root: string, extra: Record<string, string> = {}) => ({
    NX_INVOCATION_ROOT_PID: String(owner),
    NX_WORKSPACE_ROOT: root,
    ...extra,
  });
  const exists = (path: string) => !path.includes('deleted');
  const summary = (procs: ReturnType<typeof devProcesses>) =>
    procs.map(({ pid, root, orphaned }) => ({ pid, root, orphaned }));

  it('finds the processes nx started in a checkout and whether that nx has exited', () => {
    const entries = [
      entry(10, 100),
      entry(11, 110, nx(10, '/work/a')),
      entry(12, 120, nx(99, '/work/a')),
      entry(13, 130),
    ];
    assert.deepEqual(summary(devProcesses(entries, ['/work/a'], exists)), [
      { pid: 11, root: '/work/a', orphaned: false },
      { pid: 12, root: '/work/a', orphaned: true },
    ]);
  });

  it('treats an owner pid that started later as reused', () => {
    const entries = [entry(10, 200), entry(11, 110, nx(10, '/work/a'))];
    assert.equal(devProcesses(entries, ['/work/a'], exists)[0]?.orphaned, true);
  });

  it('leaves out processes of other repositories', () => {
    const entries = [
      entry(11, 110, nx(99, '/other/repo')),
      entry(12, 120, nx(99, '/other/deleted', { npm_package_name: 'something-else' })),
      entry(13, 130, { NX_WORKSPACE_ROOT: '/work/a' }),
    ];
    assert.deepEqual(devProcesses(entries, ['/work/a'], exists), []);
  });

  it("keeps a deleted checkout's processes that pnpm ran for the Ghost monorepo", () => {
    const entries = [
      entry(11, 110, nx(99, '/work/deleted', { npm_package_name: 'ghost-monorepo' })),
      entry(12, 120, nx(99, '/work/deleted-too', { PNPM_PACKAGE_NAME: 'ghost-monorepo' })),
    ];
    assert.deepEqual(
      summary(devProcesses(entries, ['/work/a'], exists)).map(({ root }) => root),
      ['/work/deleted', '/work/deleted-too'],
    );
  });
});
