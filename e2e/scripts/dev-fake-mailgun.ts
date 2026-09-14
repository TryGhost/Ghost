import { ChildProcess, spawn } from 'child_process';
import { FakeMailgunServer } from '@/helpers/services/mailgun/fake-mailgun-server';
import { fileURLToPath } from 'node:url';

// Keep the fake in this workspace so development and E2E use the same Mailgun API.
const server = new FakeMailgunServer({ mailpitUrl: 'http://localhost:8025' });
await server.start();

const cwd = fileURLToPath(new URL('../../', import.meta.url));
const env = {
  ...process.env,
  DEV_COMPOSE_FILES: '-f compose.dev.fake-mailgun.yaml',
  FAKE_MAILGUN_PORT: String(server.port),
};

process.stdout.write(
  `Fake Mailgun listening on port ${server.port}; bulk email goes to Mailpit.\n`,
);
process.stdout.write(
  'Open http://localhost:8025 to read email. Press Ctrl+C to stop everything.\n',
);

// A separate process group lets shutdown reach Nx's watchers and build processes,
// including when the launcher receives SIGTERM instead of a terminal Ctrl+C.
const dev = spawn('pnpm', ['nx', 'run', 'ghost-monorepo:docker:dev'], {
  cwd,
  env,
  stdio: 'inherit',
  detached: true,
});

function stopDev() {
  if (dev.pid) {
    try {
      process.kill(-dev.pid, 'SIGTERM');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
        throw error;
      }
    }
  }
}

for (const [signal, code] of [
  ['SIGINT', 130],
  ['SIGTERM', 143],
  ['SIGHUP', 129],
] as const) {
  process.on(signal, () => {
    process.exitCode = code;
    stopDev();
  });
}

function waitForExit(child: ChildProcess): Promise<number | null> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
}

try {
  const code = await waitForExit(dev);
  process.exitCode ??= code ?? 1;
} finally {
  stopDev();
  // Nx's log task may not have started if a build failed or startup was interrupted.
  // Explicitly stop Compose as well, preserving the database and content volumes.
  const down = spawn(
    'docker',
    ['compose', '-f', 'compose.dev.yaml', '-f', 'compose.dev.fake-mailgun.yaml', 'down'],
    {
      cwd,
      env,
      stdio: 'inherit',
    },
  );
  try {
    const code = await waitForExit(down);
    if (code) {
      process.exitCode = code;
    }
  } finally {
    await server.stop();
  }
}
