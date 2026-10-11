import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import {
  checkoutEnv,
  devPorts,
  gitOperation,
  isListening,
  listeners,
  LOG_FILE,
  processInfo,
  processStart,
  upGroup,
  worktreeList,
} from './lib/dev-stack.ts';
import { browse, type DevStatus } from './lib/dev-status-view.ts';
import { checkoutRoot, devUrl } from './lib/ghost-dev-env.ts';

// This checkout's dev stack and every other running one, or with --all every checkout that has
// run `pnpm dev`, found from each `.ghost-dev.env` and whether its ports answer. In a terminal
// the list stays open, with keys to open, start and stop each checkout's Ghost. --watch redraws
// the table every two seconds.
const { values } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    watch: { type: 'boolean', short: 'w', default: false },
  },
});
if (values.json && values.watch) {
  console.error("--json and --watch can't be combined.");
  process.exit(1);
}

async function status(
  root: string,
  branch: string | null,
  env: Record<string, string>,
): Promise<DevStatus> {
  const ports = devPorts(env);
  const listening = (await Promise.all(ports.map(isListening))).some(Boolean);
  const group = upGroup(root);
  return {
    name: env.GHOST_DEV_NAME ?? basename(root),
    root,
    branch,
    operation: gitOperation(root) ?? null,
    current: root === checkoutRoot,
    state: listening ? 'running' : group ? 'starting' : 'stopped',
    url: `${devUrl(env)}ghost/`,
    ports,
    database: env.GHOST_DEV_DATABASE ?? null,
    pid: group ?? null,
    memory: null,
    startedAt: null,
    log: existsSync(join(root, LOG_FILE)) ? join(root, LOG_FILE) : null,
  };
}

/** `keep` lists checkouts to include even when they're stopped */
async function snapshot(keep = new Set<string>()): Promise<DevStatus[]> {
  const rows = (
    await Promise.all(
      worktreeList().flatMap(({ root, branch }) => {
        const env = checkoutEnv(root);
        return env ? [status(root, branch, env)] : [];
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
    row.url,
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
  console.log(JSON.stringify(await snapshot(), null, 2));
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
