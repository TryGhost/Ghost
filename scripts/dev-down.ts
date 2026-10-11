import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import {
  checkoutEnv,
  checkouts,
  checkoutSettings,
  devPorts,
  inCheckout,
  isListening,
  listeners,
  PID_FILE,
  processInfo,
  processTable,
  treeTargets,
  upGroup,
  worktreeList,
} from './lib/dev-stack.ts';
import { devProcesses, processEntries, stopOrphans } from './lib/dev-processes.ts';
import { checkoutRoot } from './lib/ghost-dev-env.ts';

// Stops this checkout's stack: whatever holds its ports, everything that started, and Nx tasks
// whose nx has exited. MySQL, Redis and Mailpit keep running for other checkouts.
// --all stops every checkout's stack, then the shared Docker services. --orphans stops only the
// tasks whose nx has exited, in every checkout or the checkouts named.
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: 'boolean', default: false },
    orphans: { type: 'boolean', default: false },
  },
});
if (positionals.length > 0 && !values.orphans) {
  console.error('Only --orphans takes checkout paths.');
  process.exit(1);
}
if (values.orphans) {
  const orphans = devProcesses(
    processEntries(),
    worktreeList().map(({ root }) => root),
  ).filter(
    (proc) => proc.orphaned && (positionals.length === 0 || positionals.includes(proc.root)),
  );
  const stopped = await Promise.all(
    [...new Set(orphans.map((proc) => proc.root))].map(async (root) => {
      const expected = orphans
        .filter((proc) => proc.root === root)
        .map((proc) => ({ pid: proc.pid, startedAt: new Date(proc.started).toISOString() }));
      return `Stopped ${await stopOrphans(root, expected)} orphaned processes in ${root}`;
    }),
  );
  console.log(stopped.length > 0 ? stopped.join('\n') : 'No orphaned Ghost dev processes.');
  process.exit(0);
}
const NX = /\bnx(\.js)? run\b/;
const roots = values.all ? checkouts().filter((root) => checkoutEnv(root)) : [checkoutRoot];
const table = processTable();
const running = new Set(table.map((proc) => proc.pid));
// Each description, and the pids whose process trees it stops
const targets = new Map<string, number[]>();
const ours: number[] = [];
for (const root of roots) {
  const env = root === checkoutRoot ? checkoutSettings() : (checkoutEnv(root) ?? {});
  const where = values.all ? ` in ${env.GHOST_DEV_NAME ?? basename(root)}` : '';
  const group = upGroup(root);
  if (group) {
    targets.set(`Ghost dev (process group ${group})${where}`, [group]);
  }
  for (const [port, pid] of listeners(devPorts(env))) {
    let proc = processInfo(pid);
    while (proc && !NX.test(proc.command) && proc.ppid > 1) {
      proc = processInfo(proc.ppid);
    }
    if (proc && NX.test(proc.command) && inCheckout(proc.pid, root)) {
      if (proc.pid !== group) {
        targets.set(`nx (pid ${proc.pid})${where}`, [proc.pid]);
      }
    } else if (inCheckout(pid, root)) {
      // From its group leader, which can restart it, as nodemon does Ghost
      const leader = processInfo(pid)?.pgid ?? pid;
      targets.set(`pid ${pid} on port ${port}, whose nx has exited${where}`, [
        inCheckout(leader, root) ? leader : pid,
      ]);
    } else {
      console.error(
        `Port ${port}${where} is held by pid ${pid}, which isn't ${values.all ? 'that' : 'this'} checkout's, so it stays.`,
      );
      process.exitCode = 1;
      continue;
    }
    ours.push(port);
  }
  // Nx starts each task in its own process group, which outlives an nx that's killed
  const strays = table
    .filter((proc) => proc.nxWorkspace === root && proc.nxRoot && !running.has(proc.nxRoot))
    .map((proc) => proc.pid);
  if (strays.length > 0) {
    targets.set(`Nx tasks whose nx has exited${where}`, strays);
  }
}

const send = (pid: number, signal: NodeJS.Signals | 0) => {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
};
const busy = async () => (await Promise.all(ours.map(isListening))).some(Boolean);
// Negative pids are process groups
const signalled = treeTargets(table, [...targets.values()].flat());
for (const what of targets.keys()) {
  console.log(`Stopping ${what}`);
}
for (const pid of signalled) {
  send(pid, 'SIGTERM');
}
// nx can stay up after its tasks have exited
const deadline = Date.now() + 10_000;
while (Date.now() < deadline && (signalled.some((pid) => send(pid, 0)) || (await busy()))) {
  await sleep(250);
}
const killed = signalled.filter((pid) => send(pid, 'SIGKILL'));
if (killed.length > 0) {
  const names = killed.map((pid) => (pid < 0 ? `process group ${-pid}` : `pid ${pid}`));
  console.log(`Killed ${names.join(', ')}, which outlived SIGTERM`);
}
for (let attempt = 0; attempt < 8 && (await busy()); attempt++) {
  await sleep(250);
}
for (const root of roots) {
  rmSync(join(root, PID_FILE), { force: true });
}

if (await busy()) {
  console.error(`Port ${ours.join(' or ')} is still in use.`);
  process.exitCode = 1;
} else if (!process.exitCode && !values.all) {
  const ports = devPorts(checkoutSettings());
  console.log(
    targets.size > 0
      ? `Stopped. Ports ${ports.join(' and ')} are free.`
      : "Ghost dev isn't running in this checkout.",
  );
}

if (values.all) {
  if (process.env.CODESPACES || process.env.REMOTE_CONTAINERS) {
    console.log("Leaving the Docker services to the devcontainer's own lifecycle.");
  } else {
    const result = spawnSync(
      'docker',
      ['compose', '-f', 'compose.dev.yaml', '--profile', '*', 'down', '--remove-orphans'],
      { cwd: checkoutRoot, stdio: 'inherit' },
    );
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
    } else if (!process.exitCode) {
      console.log("Stopped every checkout's Ghost dev and the Docker services.");
    }
  }
}
