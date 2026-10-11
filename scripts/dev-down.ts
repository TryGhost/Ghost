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
} from './lib/dev-stack.ts';
import { checkoutRoot } from './lib/ghost-dev-env.ts';

// Stops what holds this checkout's ports, the nx process running the stack or a task that
// outlived nx, with all they started, and Nx tasks whose nx has exited. MySQL, Redis and
// Mailpit keep running for other checkouts.
// --all stops every checkout's stack, then the shared Docker services.
const { values } = parseArgs({ options: { all: { type: 'boolean', default: false } } });
const NX = /\bnx(\.js)? run\b/;
const roots = values.all ? checkouts().filter((root) => checkoutEnv(root)) : [checkoutRoot];
const table = processTable();
const running = new Set(table.map((proc) => proc.pid));
// What's stopping, and the pids whose process trees it is
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
      targets.set(`pid ${pid} on port ${port}, whose nx has exited${where}`, [pid]);
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
    .filter((proc) => proc.nxRoot && !running.has(proc.nxRoot) && inCheckout(proc.pid, root))
    .map((proc) => proc.pid);
  if (strays.length > 0) {
    targets.set(`Nx tasks whose nx has exited (pid ${strays.join(', ')})${where}`, strays);
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
