import { existsSync } from 'node:fs';
import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BACKEND_KEY_VARIABLE, keyFile, readBackendKey } from '../tooling/keys.ts';

const WRANGLER_CONFIGS = ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml'];

const DEV_VARS = '.dev.vars';

/**
 * Gives a Cloudflare Workers project's backend the development backend key in `vite dev`, as
 * `GHOST_APP_BACKEND_KEY` in `.dev.vars`, so the Worker answers Ghost's challenge in development
 * as it does in production. Returns what to tell the developer, if anything.
 */
export async function provideDevBackendKey(
  root: string,
): Promise<{ level: 'info' | 'warn'; message: string } | undefined> {
  const there = (file: string) => existsSync(join(root, file));
  if (!WRANGLER_CONFIGS.some(there)) {
    return undefined;
  }
  const key = await readBackendKey({ root, mode: 'development' });
  // Wrangler reads `.env` and `.env.local` only when there's no `.dev.vars`, so creating one
  // would hide what they set.
  const read = there(DEV_VARS) ? [DEV_VARS] : ['.env.local', '.env'].filter(there);
  let last = '';
  for (const file of read) {
    last = await readFile(join(root, file), 'utf8');
    if (last.includes(BACKEND_KEY_VARIABLE)) {
      // The public half is enough to tell one key from another.
      return last.includes(key.x)
        ? undefined
        : {
            level: 'warn',
            message: `${file} has a ${BACKEND_KEY_VARIABLE} that isn't the key in ${keyFile('development', 'backend')}, so the Worker's answers to Ghost's challenge won't match the manifest the dev server signs. Remove that line from ${file} and restart.`,
          };
    }
  }
  if (read.length > 0 && read[0] !== DEV_VARS) {
    return {
      level: 'warn',
      message: `Wrangler reads ${read.join(' and ')} when there's no ${DEV_VARS}, so add ${BACKEND_KEY_VARIABLE} to .env.local, set to the output of \`ghost-app backend-key\`, so the Worker can answer Ghost's challenge.`,
    };
  }
  // Single quotes keep the JSON as it is.
  const line = `${BACKEND_KEY_VARIABLE}='${JSON.stringify(key)}'\n`;
  await appendFile(join(root, DEV_VARS), `${last && !last.endsWith('\n') ? '\n' : ''}${line}`, {
    mode: 0o600,
  });
  return {
    level: 'info',
    message: `Added ${BACKEND_KEY_VARIABLE} to ${DEV_VARS}, with the development backend key`,
  };
}
