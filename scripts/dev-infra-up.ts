import { execFileSync, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { composeConfig, overlayArgs } from './lib/dev-compose.ts';
import { resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

// Starts the compose services Ghost runs against on the host: MySQL, Redis, Mailpit and
// whatever the DEV_COMPOSE_FILES overlays add. Ghost's own container and gateway stay down.
if (process.env.CODESPACES || process.env.REMOTE_CONTAINERS) {
  console.log('Skipping: the devcontainer brings these services up itself.');
  process.exit(0);
}

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const files = ['-f', 'compose.dev.yaml', ...overlayArgs()];
const compose = (args: string[]) => {
  const result = spawnSync('docker', ['compose', ...files, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};
const docker = (args: string[]) =>
  execFileSync('docker', args, { cwd: repoRoot, encoding: 'utf8' }).trim();

// The containerised flow's gateway publishes 2368, which the main checkout now uses
const port = process.env.GHOST_DEV_PORT ?? (await resolveGhostDevEnv()).GHOST_DEV_PORT;
const gateway = docker(['ps', '--filter', 'name=^ghost-dev-gateway$', '--format', '{{.Ports}}']);
if (gateway.includes(`:${port}->`)) {
  console.log(`Stopping the containerised Ghost and gateway, which hold port ${port}`);
  compose(['--profile', 'docker-dev', 'stop', 'ghost-dev', 'ghost-dev-gateway']);
}

const { services } = composeConfig(overlayArgs());
// Setup services such as tb-cli exit when they finish, which `up --wait` reports as a failure
const setup = new Set(
  Object.values(services).flatMap((service) =>
    Object.entries(service.depends_on ?? {})
      .filter(([, { condition }]) => condition === 'service_completed_successfully')
      .map(([name]) => name),
  ),
);
const infra = Object.entries(services)
  .filter(([, service]) => !service.profiles?.includes('docker-dev'))
  .map(([name]) => name);

// A stopped container can still point at a network compose has since recreated
compose(['rm', '-f', ...infra]);

const setupServices = infra.filter((name) => setup.has(name));
if (setupServices.length > 0) {
  compose(['up', '-d', '--build', '--quiet-pull', ...setupServices]);
  // `docker compose wait` misses containers that have already exited
  for (const service of setupServices) {
    const container = docker(['compose', ...files, 'ps', '-a', '-q', service]);
    const state = () =>
      docker(['inspect', '--format', '{{.State.Status}} {{.State.ExitCode}}', container]);
    let current = state();
    while (!current.startsWith('exited')) {
      await sleep(500);
      current = state();
    }
    if (current !== 'exited 0') {
      console.error(`${service} failed (${current}); see \`docker logs ${container}\``);
      process.exit(1);
    }
  }
}

// --no-deps, or compose runs the setup services again
compose([
  'up',
  '-d',
  '--build',
  '--wait',
  '--quiet-pull',
  '--no-deps',
  ...infra.filter((name) => !setup.has(name)),
]);
