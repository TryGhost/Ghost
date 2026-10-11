import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkoutRoot, devUrl, resolveGhostDevEnv } from './lib/ghost-dev-env.ts';

// The theme submodules: `pnpm bootstrap` initialises them, but a checkout may not have run it
const missing = execFileSync(
  'git',
  ['config', '-f', '.gitmodules', '--get-regexp', '^submodule\\..*\\.path$'],
  { cwd: checkoutRoot, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .map((line) => line.slice(line.indexOf(' ') + 1))
  .filter((path) => {
    const dir = join(checkoutRoot, path);
    return !existsSync(dir) || readdirSync(dir).length === 0;
  });
if (missing.length > 0) {
  spawnSync('bash', ['scripts/init-submodules.sh', ...missing], {
    cwd: checkoutRoot,
    stdio: 'inherit',
  });
}

const env = await resolveGhostDevEnv();
console.log(
  `Ghost dev: ${devUrl({ ...env })}ghost/ (Ghost on port ${env.GHOST_DEV_BACKEND_PORT}, database ${env.GHOST_DEV_DATABASE})`,
);
