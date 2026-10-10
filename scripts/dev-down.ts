import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  checkoutSettings,
  devPorts,
  inCheckout,
  isListening,
  listeners,
  PID_FILE,
  processInfo,
  upGroup,
} from './lib/dev-stack.ts';
import { checkoutRoot } from './lib/ghost-dev-env.ts';

// Stops what holds this checkout's ports: the nx process running the stack, which stops its
// tasks, or a task that outlived nx. MySQL, Redis and Mailpit keep running for other checkouts.
const NX = /\bnx(\.js)? run\b/;
const ports = devPorts(checkoutSettings());
// Negative pids are process groups
const targets = new Map<number, string>();
const group = upGroup();
if (group) {
  targets.set(-group, `Ghost dev (process group ${group})`);
}
const ours: number[] = [];
for (const [port, pid] of listeners(ports)) {
  let proc = processInfo(pid);
  while (proc && !NX.test(proc.command) && proc.ppid > 1) {
    proc = processInfo(proc.ppid);
  }
  if (proc && NX.test(proc.command) && inCheckout(proc.pid)) {
    if (proc.pid !== group) {
      targets.set(proc.pid, `nx (pid ${proc.pid})`);
    }
  } else if (inCheckout(pid)) {
    targets.set(
      -(processInfo(pid)?.pgid ?? pid),
      `pid ${pid} on port ${port}, whose nx has exited`,
    );
  } else {
    console.error(`Port ${port} is held by pid ${pid}, which isn't this checkout's, so it stays.`);
    process.exitCode = 1;
    continue;
  }
  ours.push(port);
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
for (const [pid, what] of targets) {
  console.log(`Stopping ${what}`);
  send(pid, 'SIGTERM');
}
// nx can stay up after its tasks have exited
const deadline = Date.now() + 10_000;
while (
  Date.now() < deadline &&
  ([...targets.keys()].some((pid) => send(pid, 0)) || (await busy()))
) {
  await sleep(250);
}
for (const [pid, what] of targets) {
  if (send(pid, 'SIGKILL')) {
    console.log(`Killed ${what}, which outlived SIGTERM`);
  }
}
for (let attempt = 0; attempt < 8 && (await busy()); attempt++) {
  await sleep(250);
}
rmSync(join(checkoutRoot, PID_FILE), { force: true });

if (await busy()) {
  console.error(`Port ${ours.join(' or ')} is still in use.`);
  process.exitCode = 1;
} else if (!process.exitCode) {
  console.log(
    targets.size > 0
      ? `Stopped. Ports ${ports.join(' and ')} are free.`
      : "Ghost dev isn't running in this checkout.",
  );
}
