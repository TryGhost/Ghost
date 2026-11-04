import { existsSync } from 'node:fs';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { isGitIgnored } from '../tooling/git.ts';
import { BACKEND_KEY_VARIABLE, keyFile, readBackendKey } from '../tooling/keys.ts';

const WRANGLER_CONFIGS = ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml'];

const DEV_VARS = '.dev.vars';

const ASSIGNMENT = new RegExp(
  `^[ \\t]*(?:export[ \\t]+)?${BACKEND_KEY_VARIABLE}[ \\t]*=(.*)$`,
  'm',
);

function readValue(raw: string): unknown {
  const value = raw.trim().replace(/^(['"])(.*)\1$/, '$2');
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * Gives a Cloudflare Workers project's backend the development backend key in `vite dev`, as
 * `GHOST_APP_BACKEND_KEY` in `.dev.vars`, so the Worker answers challenges in development with
 * the same code as in production. It adds the variable when it's missing and git ignores the
 * file, and never changes a value that's there. Returns what to tell the developer, if anything.
 */
export async function provideDevBackendKey(
  root: string,
): Promise<{ level: 'info' | 'warn'; message: string } | undefined> {
  if (!WRANGLER_CONFIGS.some((file) => existsSync(join(root, file)))) {
    return undefined;
  }
  const key = await readBackendKey({ root, mode: 'development' });
  const file = join(root, DEV_VARS);
  let existing: string | undefined;
  try {
    existing = await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const assigned = existing === undefined ? null : ASSIGNMENT.exec(existing);
  if (assigned) {
    const value = readValue(assigned[1] ?? '') as { x?: unknown; d?: unknown } | undefined;
    if (value?.x === key.x && value.d === key.d) {
      return undefined;
    }
    return {
      level: 'warn',
      message: `${DEV_VARS} sets ${BACKEND_KEY_VARIABLE} to another key than ${keyFile('development', 'backend')}, so the Worker's answers to Ghost's challenge won't match the manifest the dev server signs. Remove that line from ${DEV_VARS} and restart to use the development key.`,
    };
  }

  if (existing === undefined && existsSync(join(root, '.env'))) {
    // Wrangler reads .env only when there's no .dev.vars, so creating one would hide it.
    return {
      level: 'warn',
      message: `Add ${BACKEND_KEY_VARIABLE} to .env, set to the output of \`ghost-app backend-key\`, so the Worker can answer Ghost's challenge.`,
    };
  }
  const ignored = await isGitIgnored(root, DEV_VARS);
  if (!ignored.ignored) {
    return {
      level: 'warn',
      message: `Not writing the development backend key to ${DEV_VARS}: ${ignored.reason}. Add ${DEV_VARS} to .gitignore.`,
    };
  }
  // Single quotes keep the JSON as it is.
  const line = `${BACKEND_KEY_VARIABLE}='${JSON.stringify(key)}'\n`;
  if (existing === undefined) {
    await writeFile(file, line, { flag: 'wx', mode: 0o600 });
  } else {
    await appendFile(file, existing === '' || existing.endsWith('\n') ? line : `\n${line}`);
  }
  return {
    level: 'info',
    message: `Added ${BACKEND_KEY_VARIABLE} to ${DEV_VARS}, with the development backend key`,
  };
}
