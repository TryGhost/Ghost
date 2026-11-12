import { spawn } from 'node:child_process';
import { isListening, resolveGhostDevEnv, secondGhostPort } from './lib/ghost-dev-env.ts';

// Runs a command, `pnpm dev:multi`'s Nx target, with a second Ghost behind the front door. Both
// Ghosts use the same database, Redis, Mailpit and content folder. The front door sends a
// request to the Ghost its `X-Ghost-Target` header names, 1 or 2, and otherwise has the two
// take turns. Values already in the environment win.

/**
 * What the command's environment gains. The public caches go to Redis so both Ghosts share
 * them, under the checkout's name because every checkout shares Redis.
 */
export function secondGhostEnv(name: string, backendPort: string): Record<string, string> {
  const cache = (key: string, prefix: string) => ({
    [`adapters__cache__${key}__adapter`]: 'Redis',
    [`adapters__cache__${key}__keyPrefix`]: `${name}:${prefix}:`,
    [`adapters__cache__${key}__ttl`]: '300',
  });
  return {
    GHOST_DEV_BACKEND_PORT_2: String(secondGhostPort(backendPort)),
    ...cache('postsPublic', 'posts-public'),
    hostSettings__postsPublicCache__enabled: 'true',
    ...cache('tagsPublic', 'tags-public'),
    hostSettings__tagsPublicCache__enabled: 'true',
    ...cache('imageSizes', 'image-sizes'),
  };
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    console.error('Usage: node tools/scripts/with-second-ghost.ts <command> [...args]');
    process.exit(1);
  }

  const assigned = await resolveGhostDevEnv();
  const frontDoorPort = process.env.GHOST_DEV_PORT ?? assigned.GHOST_DEV_PORT;
  const backendPort = process.env.GHOST_DEV_BACKEND_PORT ?? assigned.GHOST_DEV_BACKEND_PORT;
  const env = { ...secondGhostEnv(assigned.GHOST_DEV_NAME, backendPort), ...process.env };
  const second = env.GHOST_DEV_BACKEND_PORT_2;
  // Nx would join a `pnpm dev` already running here instead of starting the front door again
  for (const port of [frontDoorPort, backendPort, second].map(Number)) {
    if (await isListening(port)) {
      console.error(`Port ${port} is in use.`);
      console.error(
        "`pnpm dev:status` shows what's running; `pnpm dev:down` stops this checkout's Ghost.",
      );
      process.exit(1);
    }
  }

  console.log(`Running two Ghosts, on ports ${backendPort} and ${second}`);
  const child = spawn(command, args, { stdio: 'inherit', env });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => child.kill(signal));
  }
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
