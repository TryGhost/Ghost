import { execFileSync, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

// Starts the services Ghost depends on in the dev compose files (the ghost-dev
// service's depends_on, overlays included) without Ghost's own container. One-off
// setup services run to completion first: `up --wait` never returns for them.
if (process.env.CODESPACES || process.env.REMOTE_CONTAINERS) {
  console.log('Skipping: the devcontainer brings these services up itself.');
  process.exit(0);
}

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const files = [
  '-f',
  'compose.dev.yaml',
  ...(process.env.DEV_COMPOSE_FILES ?? '').split(/\s+/).filter(Boolean),
];

function compose(args: string[]) {
  const result = spawnSync('docker', ['compose', ...files, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

interface ComposeConfig {
  services: Record<string, { depends_on?: Record<string, { condition: string }> }>;
}

const config = JSON.parse(
  execFileSync(
    'docker',
    ['compose', ...files, '--profile', 'docker-dev', 'config', '--format', 'json'],
    { cwd: repoRoot, encoding: 'utf8' },
  ),
) as ComposeConfig;

// Optional dependencies (required: false) are absent unless their profile is active
const dependencies = Object.entries(config.services['ghost-dev']?.depends_on ?? {}).filter(
  ([name]) => config.services[name],
);
const runToCompletion = dependencies
  .filter(([, { condition }]) => condition === 'service_completed_successfully')
  .map(([name]) => name);
const longRunning = dependencies
  .filter(([, { condition }]) => condition !== 'service_completed_successfully')
  .map(([name]) => name);

const docker = (args: string[]) =>
  execFileSync('docker', args, { cwd: repoRoot, encoding: 'utf8' }).trim();

if (runToCompletion.length > 0) {
  compose(['up', '-d', '--quiet-pull', ...runToCompletion]);
  // `docker compose wait` misses containers that have already exited
  for (const service of runToCompletion) {
    const container = docker(['compose', ...files, 'ps', '-a', '-q', service]);
    let state = docker(['inspect', '--format', '{{.State.Status}} {{.State.ExitCode}}', container]);
    while (!state.startsWith('exited')) {
      await sleep(500);
      state = docker(['inspect', '--format', '{{.State.Status}} {{.State.ExitCode}}', container]);
    }
    if (state !== 'exited 0') {
      console.error(`${service} failed (${state}); see \`docker logs ${container}\``);
      process.exit(1);
    }
  }
}
compose(['up', '-d', '--wait', '--quiet-pull', ...longRunning]);
