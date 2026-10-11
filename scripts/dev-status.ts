import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import {
  checkoutEnv,
  devPorts,
  gitOperation,
  gitState,
  isListening,
  listeners,
  LOG_FILE,
  processInfo,
  processStart,
  upGroup,
  worktreeList,
} from './lib/dev-stack.ts';
import { type DevProcess, devProcesses, processEntries } from './lib/dev-processes.ts';
import { browse, type DevStatus } from './lib/dev-status-view.ts';
import { checkoutRoot, devUrl } from './lib/ghost-dev-env.ts';
import { BASE_BRANCHES, pullRequests } from './lib/pull-requests.ts';

// This checkout's dev stack and every other running one, or with --all every checkout that has
// run `pnpm dev`, found from each `.ghost-dev.env` and whether its ports answer, plus every
// checkout, deleted or not, with processes whose nx has exited. In a terminal
// the list stays open, with keys to open, start and stop each checkout's Ghost. --watch redraws
// the table every two seconds. --json --prs adds each branch's pull request, or leaves `pr` out
// when `gh` fails. --json --git, which runs git in every checkout, adds each one's `ahead` and
// `dirty`, or nulls when git fails.
const { values } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    git: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    prs: { type: 'boolean', default: false },
    watch: { type: 'boolean', short: 'w', default: false },
  },
});
if (values.json && values.watch) {
  console.error("--json and --watch can't be combined.");
  process.exit(1);
}
if ((values.prs || values.git) && !values.json) {
  console.error('--prs and --git only work with --json.');
  process.exit(1);
}

async function status(
  root: string,
  branch: string | null,
  env: Record<string, string> | undefined,
  procs: DevProcess[],
): Promise<DevStatus> {
  const ports = env ? devPorts(env) : [];
  const listening = (await Promise.all(ports.map(isListening))).some(Boolean);
  const group = upGroup(root);
  const mine = procs.filter((proc) => proc.root === root).sort((a, b) => a.started - b.started);
  const orphaned = mine.some((proc) => proc.orphaned);
  return {
    name: env?.GHOST_DEV_NAME ?? basename(root),
    root,
    branch,
    operation: gitOperation(root) ?? null,
    current: root === checkoutRoot,
    state: listening ? 'running' : group ? 'starting' : orphaned ? 'orphaned' : 'stopped',
    url: env ? `${devUrl(env)}ghost/` : null,
    ports,
    database: env?.GHOST_DEV_DATABASE ?? null,
    pid: group ?? null,
    memory: null,
    startedAt: null,
    log: existsSync(join(root, LOG_FILE)) ? join(root, LOG_FILE) : null,
    processes: mine.map((proc) => ({
      pid: proc.pid,
      pgid: proc.pgid,
      command: proc.command,
      memory: proc.rss * 1024,
      startedAt: new Date(proc.started).toISOString(),
      orphaned: proc.orphaned,
    })),
  };
}

/** `keep` lists checkouts to include even when they're stopped */
async function snapshot(keep = new Set<string>()): Promise<DevStatus[]> {
  const worktrees = worktreeList();
  const devProcs = devProcesses(
    processEntries(),
    worktrees.map(({ root }) => root),
  );
  // A checkout without `.ghost-dev.env`, or one deleted since, is only listed for its orphans
  const orphaned = new Set(devProcs.filter((proc) => proc.orphaned).map((proc) => proc.root));
  const checkouts = [
    ...worktrees,
    ...[...orphaned]
      .filter((root) => !worktrees.some((worktree) => worktree.root === root))
      .map((root) => ({ root, branch: null })),
  ];
  const rows = (
    await Promise.all(
      checkouts.flatMap(({ root, branch }) => {
        const env = checkoutEnv(root);
        return env || orphaned.has(root) ? [status(root, branch, env, devProcs)] : [];
      }),
    )
  ).filter((row) => values.all || row.current || row.state !== 'stopped' || keep.has(row.root));

  // The processes listening on a running stack's ports give its pid and memory
  const running = rows.filter((row) => row.state === 'running');
  const pids = listeners(running.flatMap((row) => row.ports));
  for (const row of running) {
    const procs = row.ports.flatMap((port) => {
      const pid = pids.get(port);
      return (pid && processInfo(pid)) || [];
    });
    row.pid = procs[0]?.pid ?? null;
    row.memory = procs.reduce((total, proc) => total + proc.rss * 1024, 0);
  }
  for (const row of rows.filter((candidate) => candidate.state === 'orphaned')) {
    const orphans = row.processes.filter((proc) => proc.orphaned);
    row.pid = orphans[0]?.pid ?? null;
    row.memory = orphans.reduce((total, proc) => total + proc.memory, 0);
  }
  for (const row of rows) {
    const started = row.pid && processStart(row.pid);
    row.startedAt = started ? new Date(started).toISOString() : null;
  }
  return rows;
}

function table(rows: DevStatus[]): string {
  if (rows.length === 0) {
    return 'No checkout is running Ghost dev.';
  }
  const header = ['', 'NAME', 'STATE', 'URL', 'PORTS', 'DATABASE', 'PID', 'MEMORY'];
  const lines = rows.map((row) => [
    row.current ? '*' : '',
    row.name,
    row.state,
    row.url ?? '',
    row.ports.join('/'),
    row.database ?? '',
    String(row.pid ?? ''),
    row.memory === null ? '' : `${Math.round(row.memory / 1024 ** 2)} MB`,
  ]);
  const widths = header.map((title, column) =>
    Math.max(title.length, ...lines.map((cells) => cells[column]?.length ?? 0)),
  );
  return [header, ...lines]
    .map((cells) =>
      cells
        .map((cell, column) => cell.padEnd(widths[column] ?? 0))
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
}

if (values.json) {
  const rows = await snapshot();
  if (values.git) {
    await Promise.all(
      rows.map(async (row) => {
        const state = await gitState(row.root);
        Object.assign(row, { ahead: state?.ahead ?? null, dirty: state?.dirty ?? null });
      }),
    );
  }
  if (values.prs) {
    const branches = rows.flatMap(({ branch }) =>
      branch && !BASE_BRANCHES.has(branch) ? [branch] : [],
    );
    try {
      const prs = await pullRequests([...new Set(branches)], checkoutRoot);
      for (const row of rows) {
        Object.assign(row, { pr: (row.branch && prs.get(row.branch)) || null });
      }
    } catch (error) {
      const { stderr, message } = error as { stderr?: string; message: string };
      console.error(
        `Couldn't look up pull requests: ${(stderr?.trim() || message).split('\n')[0]}`,
      );
    }
  }
  console.log(JSON.stringify(rows, null, 2));
} else if (values.watch) {
  for (;;) {
    const output = table(await snapshot());
    console.clear();
    console.log(`${output}\n\n${new Date().toLocaleTimeString()}, Ctrl+C to stop`);
    await sleep(2000);
  }
} else {
  const rows = await snapshot();
  const interactive = process.stdin.isTTY && process.stdout.isTTY && rows.length > 0;
  console.log(table(interactive ? await browse(rows, snapshot) : rows));
}
