import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  checkouts,
  checkoutSettings,
  devProcesses,
  formatProcess,
  isListening,
  PID_FILE,
  portInUse,
  readPid,
  scanProcesses,
  stackLeader,
  stop,
} from './lib/dev-stack.ts';
import { checkoutRoot } from './lib/ghost-dev-env.ts';

// Stops this checkout's dev stack however it was started, and whatever earlier ones left
// behind. MySQL, Redis and Mailpit keep running for the other checkouts.
const pid = readPid();
const { stack, leftovers } = devProcesses(scanProcesses(), checkoutRoot, checkouts());
const leader = stackLeader(stack, pid);
if (leader) {
  console.log(`Stopping Ghost dev (pid ${leader.pid}, ${stack.length} processes)`);
}
if (leftovers.length > 0) {
  console.log('Stopping processes an earlier `pnpm dev` left behind:');
  for (const proc of leftovers) {
    console.log(`  ${formatProcess(proc)}`);
  }
}
const killed = await stop([...stack, ...leftovers], leader?.pid === pid ? pid : undefined);
for (const proc of killed) {
  console.log(`Killed after it ignored SIGTERM: ${formatProcess(proc)}`);
}
rmSync(join(checkoutRoot, PID_FILE), { force: true });

const env = checkoutSettings();
const ports = [env.GHOST_DEV_PORT, env.GHOST_DEV_BACKEND_PORT].filter(Boolean).map(Number);
for (let attempt = 0; attempt < 20; attempt++) {
  const busy = await Promise.all(ports.map(isListening));
  if (!busy.includes(true)) {
    break;
  }
  await sleep(250);
}
for (const port of ports) {
  if (await isListening(port)) {
    console.error(`${portInUse(port)}.`);
    process.exitCode = 1;
  }
}
if (!process.exitCode) {
  console.log(
    leader || leftovers.length > 0
      ? `Stopped. Ports ${ports.join(' and ')} are free.`
      : "Ghost dev isn't running in this checkout.",
  );
}
