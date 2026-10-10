import { spawn } from 'node:child_process';
import { closeSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import {
  checkoutSettings,
  devPorts,
  isListening,
  isReady,
  listeners,
  LOG_FILE,
  PID_FILE,
  processInfo,
  upGroup,
} from './lib/dev-stack.ts';
import { checkoutRoot, devUrl, resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

// Starts this checkout's `pnpm dev`, or the variant named, in the background and returns
// once Ghost answers through the front door
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { timeout: { type: 'string', default: '300' } },
});
const script = positionals[0] ?? 'dev';
const { scripts } = JSON.parse(readFileSync(join(checkoutRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const onHost = (name: string) => scripts[name]?.includes('ghost-monorepo:dev:host');
const command = scripts[script];
if (!command || !onHost(script)) {
  const names = Object.keys(scripts).filter(onHost);
  console.error(`\`${script}\` doesn't run Ghost on the host. Try one of: ${names.join(', ')}`);
  process.exit(1);
}

await resolveGhostDevEnv();
const env = checkoutSettings();
const group = upGroup();
const busy = (
  await Promise.all(devPorts(env).map(async (port) => ((await isListening(port)) ? port : 0)))
).find(Boolean);
if (group || busy) {
  const pid = busy ? listeners([busy]).get(busy) : undefined;
  const holder = pid ? processInfo(pid) : undefined;
  console.error(
    group
      ? `Ghost dev is already running in this checkout (pid ${group}).`
      : `Port ${busy} is in use${holder ? ` by pid ${holder.pid} (${holder.command.slice(0, 80)})` : ''}.`,
  );
  console.error(
    "`pnpm dev:status` shows what's running; `pnpm dev:down` stops this checkout's Ghost.",
  );
  process.exit(1);
}

const logFile = join(checkoutRoot, LOG_FILE);
const pidFile = join(checkoutRoot, PID_FILE);
const log = openSync(logFile, 'w');
// Its own process group, so it outlives this command and `pnpm dev:down` can signal all of it
const child = spawn('sh', ['-c', command], {
  cwd: checkoutRoot,
  detached: true,
  stdio: ['ignore', log, log],
  // Otherwise Nx leaves out what tasks that finished printed, failures included for agents
  env: { NX_DEFAULT_OUTPUT_STYLE: 'stream', ...process.env },
});
closeSync(log);
writeFileSync(pidFile, `${child.pid}\n`);
child.unref();
let exit: string | undefined;
child.once('exit', (code, signal) => {
  exit = signal ?? `code ${code}`;
});

const url = devUrl(env);
const timeout = Number(values.timeout);
const started = Date.now();
console.log(`Starting \`pnpm ${script}\` in the background (pid ${child.pid}, log ${logFile})`);
while (!(await isReady(url))) {
  if (exit || Date.now() - started > timeout * 1000) {
    console.error(
      exit
        ? `\`pnpm ${script}\` exited (${exit}). The end of its log:\n`
        : `Ghost didn't answer within ${timeout}s. The end of its log:\n`,
    );
    console.error(readFileSync(logFile, 'utf8').trimEnd().split('\n').slice(-40).join('\n'));
    if (exit) {
      rmSync(pidFile, { force: true });
    } else {
      console.error(
        '\nIt may still be starting: `pnpm dev:status` checks it, `pnpm dev:down` stops it.',
      );
    }
    process.exit(1);
  }
  await sleep(1000);
}
const seconds = Math.round((Date.now() - started) / 1000);
console.log(`Ghost dev is up after ${seconds}s: ${url}ghost/`);
console.log(
  `Ports ${env.GHOST_DEV_PORT} and ${env.GHOST_DEV_BACKEND_PORT}, database ${env.GHOST_DEV_DATABASE}. Stop it with \`pnpm dev:down\`.`,
);
