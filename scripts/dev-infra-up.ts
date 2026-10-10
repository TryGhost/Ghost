import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

// Starts the compose services Ghost runs against on the host (MySQL, Redis, Mailpit).
if (process.env.CODESPACES || process.env.REMOTE_CONTAINERS) {
  console.log('Skipping: the devcontainer brings these services up itself.');
  process.exit(0);
}

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const compose = (args: string[]) => {
  const result = spawnSync('docker', ['compose', '-f', 'compose.dev.yaml', ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

// The containerised flow's gateway publishes 2368, which the main checkout now uses
const port = process.env.GHOST_DEV_PORT ?? (await resolveGhostDevEnv()).GHOST_DEV_PORT;
const gateway = execFileSync(
  'docker',
  ['ps', '--filter', 'name=^ghost-dev-gateway$', '--format', '{{.Ports}}'],
  { encoding: 'utf8' },
);
if (gateway.includes(`:${port}->`)) {
  console.log(`Stopping the containerised Ghost and gateway, which hold port ${port}`);
  compose(['--profile', 'docker-dev', 'stop', 'ghost-dev', 'ghost-dev-gateway']);
}

compose(['up', '-d', '--wait', '--quiet-pull']);
