import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  checkoutEnv,
  checkouts,
  devPorts,
  isListening,
  listeners,
  LOG_FILE,
  processInfo,
  upGroup,
} from './lib/dev-stack.ts';
import { checkoutRoot, devUrl } from './lib/ghost-dev-env.ts';

// This checkout's dev stack and every other running one, or with --all every checkout that has
// run `pnpm dev`, found from each `.ghost-dev.env` and whether its ports answer
const { values } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

const rows = (
  await Promise.all(
    checkouts().flatMap((root) => {
      const env = checkoutEnv(root);
      return env ? [status(root, env)] : [];
    }),
  )
).filter((row) => values.all || row.current || row.state !== 'stopped');

async function status(root: string, env: Record<string, string>) {
  const ports = devPorts(env);
  const listening = (await Promise.all(ports.map(isListening))).some(Boolean);
  const group = upGroup(root);
  return {
    name: env.GHOST_DEV_NAME ?? basename(root),
    root,
    current: root === checkoutRoot,
    state: listening ? 'running' : group ? 'starting' : 'stopped',
    url: `${devUrl(env)}ghost/`,
    ports,
    database: env.GHOST_DEV_DATABASE ?? null,
    pid: group ?? null,
    memory: null as number | null,
    log: existsSync(join(root, LOG_FILE)) ? join(root, LOG_FILE) : null,
  };
}

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

if (values.json) {
  console.log(JSON.stringify(rows, null, 2));
} else if (rows.length === 0) {
  console.log('No checkout is running Ghost dev.');
} else {
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
  for (const cells of [header, ...lines]) {
    console.log(
      cells
        .map((cell, column) => cell.padEnd(widths[column] ?? 0))
        .join('  ')
        .trimEnd(),
    );
  }
}
