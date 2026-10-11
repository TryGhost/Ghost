import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
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
// run `pnpm dev`, found from each `.ghost-dev.env` and whether its ports answer. --watch redraws
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

async function snapshot() {
  const rows = (
    await Promise.all(
      checkouts().flatMap((root) => {
        const env = checkoutEnv(root);
        return env ? [status(root, env)] : [];
      }),
    )
  ).filter((row) => values.all || row.current || row.state !== 'stopped');

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
  return rows;
}

function table(rows: Awaited<ReturnType<typeof snapshot>>): string {
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
} else if (!values.watch) {
  console.log(table(await snapshot()));
} else {
  for (;;) {
    const output = table(await snapshot());
    console.clear();
    console.log(`${output}\n\n${new Date().toLocaleTimeString()}, Ctrl+C to stop`);
    await sleep(2000);
  }
}
