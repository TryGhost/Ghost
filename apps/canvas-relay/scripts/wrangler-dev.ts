import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

async function main() {
  const vars = await readFile(new URL('../.dev.vars', import.meta.url), 'utf8');
  const line = vars.split('\n').find((value) => value.startsWith('SERVICE_ORIGIN='));
  if (!line) {
    throw new Error('Run setup:local before dev');
  }
  const service = new URL(JSON.parse(line.slice('SERVICE_ORIGIN='.length)));
  // Wrangler otherwise rewrites HTTPS Origin headers to the HTTP listener
  // protocol. Match its logical upstream to the configured browser origin.
  const child = spawn(
    'pnpm',
    [
      'exec',
      'wrangler',
      'dev',
      '--local',
      '--ip',
      '0.0.0.0',
      '--port',
      '8787',
      '--upstream-protocol',
      service.protocol.slice(0, -1),
      '--persist-to',
      '.wrangler/state',
    ],
    { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
  );
  process.once('SIGTERM', () => {
    child.kill('SIGTERM');
  });
  process.once('SIGINT', () => {
    child.kill('SIGINT');
  });
  child.once('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.once('exit', (code) => {
    process.exitCode = code ?? 1;
  });
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
