import { existsSync } from 'node:fs';
import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BACKEND_KEY_VARIABLE, readBackendKey } from '../tooling/keys.ts';

const WRANGLER_CONFIGS = ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml'];

/** A file's text, or `undefined` if there's none. */
const readIfThere = (file: string) =>
  existsSync(file) ? readFile(file, 'utf8') : Promise.resolve(undefined);

/**
 * Gives a Cloudflare Workers project's backend the development backend key in `vite dev`, as
 * `GHOST_APP_BACKEND_KEY` in `.dev.vars`, so the Worker answers Ghost's challenge in development
 * as it does in production. Returns what to tell the developer, if anything.
 */
export async function provideDevBackendKey(
  root: string,
): Promise<{ level: 'info' | 'warn'; message: string } | undefined> {
  if (!WRANGLER_CONFIGS.some((file) => existsSync(join(root, file)))) {
    return undefined;
  }
  const file = join(root, '.dev.vars');
  const existing = await readIfThere(file);
  if (existing?.includes(BACKEND_KEY_VARIABLE)) {
    return undefined;
  }
  if (existing === undefined) {
    // Wrangler reads `.env` only when there's no `.dev.vars`, so creating one would hide it.
    const env = await readIfThere(join(root, '.env'));
    if (env?.includes(BACKEND_KEY_VARIABLE)) {
      return undefined;
    }
    if (env !== undefined) {
      return {
        level: 'warn',
        message: `Wrangler reads .env when there's no .dev.vars, so add ${BACKEND_KEY_VARIABLE} to .env, set to the output of \`ghost-app backend-key\`, so the Worker can answer Ghost's challenge.`,
      };
    }
  }
  const key = await readBackendKey({ root, mode: 'development' });
  // Single quotes keep the JSON as it is.
  const line = `${BACKEND_KEY_VARIABLE}='${JSON.stringify(key)}'\n`;
  const separator = existing && !existing.endsWith('\n') ? '\n' : '';
  await appendFile(file, `${separator}${line}`, { mode: 0o600 });
  return {
    level: 'info',
    message: `Added ${BACKEND_KEY_VARIABLE} to .dev.vars, with the development backend key`,
  };
}
