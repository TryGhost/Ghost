import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run Core-dependent tools with the checkout's existing development environment.
export function runGhostCommand(file: string, args: string[], source = false) {
  const ghostDir = fileURLToPath(new URL('../../ghost', import.meta.url));
  const runner = fileURLToPath(new URL('../scripts/with-ghost-dev-env.ts', import.meta.url));
  const command = fileURLToPath(new URL(file, import.meta.url));
  const child = spawn(
    process.execPath,
    [
      runner,
      process.execPath,
      ...(source ? ['--conditions=source'] : []),
      '--import',
      import.meta.resolve('tsx'),
      command,
      ...args,
    ],
    {
      cwd: ghostDir,
      stdio: 'inherit',
    },
  );
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => child.kill(signal));
  }
  child.on('error', (error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.removeAllListeners(signal);
      process.kill(process.pid, signal);
    } else {
      process.exitCode = code ?? 1;
    }
  });
}
