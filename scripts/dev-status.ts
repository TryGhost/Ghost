import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  checkoutEnv,
  checkouts,
  devProcesses,
  isReady,
  LOG_FILE,
  readPid,
  scanProcesses,
  stackLeader,
} from './lib/dev-stack.ts';
import { checkoutRoot, devUrl } from './lib/ghost-dev-env.ts';

// This checkout's dev stack and every other one with something running, or with --all every
// checkout that has run `pnpm dev`: where it is, whether it's running, and what it uses
const { values } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

const roots = checkouts();
const procs = scanProcesses();
const rows = (
  await Promise.all(
    roots.flatMap((root) => {
      const env = checkoutEnv(root);
      return env ? [status(root, env)] : [];
    }),
  )
).filter((row) => values.all || row.current || row.state !== 'stopped');

async function status(root: string, env: Record<string, string>) {
  const { stack, leftovers } = devProcesses(procs, root, roots);
  const leader = stackLeader(stack, readPid(root));
  const owned = [...stack, ...leftovers];
  const ready = await isReady(devUrl(env), 2000);
  let state = ready ? 'running' : 'stopped';
  if (leader) {
    state = ready ? 'running' : 'starting';
  } else if (leftovers.length > 0) {
    state = 'leftovers';
  }
  const log = join(root, LOG_FILE);
  return {
    name: env.GHOST_DEV_NAME ?? basename(root),
    root,
    current: root === checkoutRoot,
    state,
    url: `${devUrl(env)}ghost/`,
    ports: [Number(env.GHOST_DEV_PORT), Number(env.GHOST_DEV_BACKEND_PORT)],
    database: env.GHOST_DEV_DATABASE,
    pid: leader?.pid ?? null,
    uptime: leader?.elapsed ?? null,
    memory: owned.reduce((total, proc) => total + proc.rss * 1024, 0),
    processes: owned.length,
    log: existsSync(log) ? log : null,
  };
}

if (values.json) {
  console.log(JSON.stringify(rows, null, 2));
} else if (rows.length === 0) {
  console.log('No checkout is running Ghost dev.');
} else {
  const order = ['running', 'starting', 'leftovers', 'stopped'];
  rows.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state));
  const header = ['', 'NAME', 'STATE', 'URL', 'PORTS', 'DATABASE', 'PID', 'UPTIME', 'MEMORY'];
  const lines = rows.map((row) => [
    row.current ? '*' : '',
    row.name,
    row.state,
    row.url,
    row.ports.join('/'),
    row.database ?? '',
    String(row.pid ?? ''),
    row.uptime === null ? '' : duration(row.uptime),
    row.processes > 0 ? `${Math.round(row.memory / 1024 ** 2)} MB` : '',
  ]);
  const widths = header.map((title, column) =>
    Math.max(title.length, ...lines.map((cells) => cells[column]?.length ?? 0)),
  );
  for (const cells of [header, ...lines]) {
    console.log(
      cells
        .map((cell, column) => cell.padEnd(widths[column] ?? 0))
        .join('  ')
        .trimEnd(),
    );
  }
}

function duration(seconds: number): string {
  if (seconds < 3600) {
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
  }
  const hours = Math.floor(seconds / 3600);
  return hours < 24
    ? `${hours}h ${Math.floor((seconds % 3600) / 60)}m`
    : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
