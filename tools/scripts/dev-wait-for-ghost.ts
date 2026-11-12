import { setTimeout as sleep } from 'node:timers/promises';
import { resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

// Holds back `pnpm dev:multi`'s second Ghost until the first answers, so the first alone sets up
// the database and runs any migrations. Started together, the loser exits. As in the front door,
// Ghost answers 503 until it has booted, and an https url redirects this plain request.
if (!process.env.GHOST_DEV_BACKEND_PORT_2) {
  console.error('Start the second Ghost with `pnpm dev:multi`, which gives it its port.');
  process.exit(1);
}
const assigned = await resolveGhostDevEnv();
const port = process.env.GHOST_DEV_BACKEND_PORT ?? assigned.GHOST_DEV_BACKEND_PORT;
const site = `http://127.0.0.1:${port}/ghost/api/admin/site/`;
const isUp = () =>
  fetch(site, { redirect: 'manual' }).then(
    (res) => res.status < 500,
    () => false,
  );

// Nx starts tasks in their own sessions and can exit without stopping them, e.g. when its
// terminal closes
const nx = Number(process.env.NX_INVOCATION_ROOT_PID);
const nxExited = () => {
  try {
    process.kill(nx, 0);
    return false;
  } catch {
    return true;
  }
};
console.log(`Waiting for the first Ghost, on port ${port}`);
while (!(await isUp())) {
  if (nx && nxExited()) {
    process.exit(1);
  }
  await sleep(500);
}
