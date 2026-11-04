import { constants, existsSync, lstatSync } from 'node:fs';
import { open, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { isGitIgnored } from '../tooling/git.ts';
import {
  BACKEND_KEY_VARIABLE,
  keyFile,
  readBackendKey,
  type PrivateKeyJwk,
} from '../tooling/keys.ts';

const WRANGLER_CONFIGS = ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml'];

const DEV_VARS = '.dev.vars';

const ENV = '.env';

const ASSIGNMENT = new RegExp(
  `^[ \\t]*(?:export[ \\t]+)?${BACKEND_KEY_VARIABLE}[ \\t]*=(.*)$`,
  'm',
);

type Message = { level: 'info' | 'warn'; message: string };

/**
 * A dotenv file's text and what it sets the backend key to, `undefined` if nothing; or
 * `undefined` if there's no file.
 */
async function readDotenv(file: string): Promise<{ text: string; value: unknown } | undefined> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
  const assigned = ASSIGNMENT.exec(text);
  const value = assigned?.[1]?.trim().replace(/^(['"])(.*)\1$/, '$2');
  try {
    return { text, value: value === undefined ? undefined : (JSON.parse(value) as unknown) };
  } catch {
    return { text, value };
  }
}

const isKey = (value: unknown, key: PrivateKeyJwk) => {
  const { x, d } = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >;
  return x === key.x && d === key.d;
};

const anotherKey = (file: string): Message => ({
  level: 'warn',
  message: `${file} sets ${BACKEND_KEY_VARIABLE} to another key than ${keyFile('development', 'backend')}, so the Worker's answers to Ghost's challenge won't match the manifest the dev server signs. Remove that line from ${file} and restart to use the development key.`,
});

/**
 * Gives a Cloudflare Workers project's backend the development backend key in `vite dev`, as
 * `GHOST_APP_BACKEND_KEY` in `.dev.vars`, so the Worker answers challenges in development with
 * the same code as in production. It adds the variable when it's missing and git ignores the
 * file, and never changes a value that's there. Returns what to tell the developer, if anything.
 */
export async function provideDevBackendKey(root: string): Promise<Message | undefined> {
  if (!WRANGLER_CONFIGS.some((file) => existsSync(join(root, file)))) {
    return undefined;
  }
  const key = await readBackendKey({ root, mode: 'development' });
  const file = join(root, DEV_VARS);

  // Checked before anything reads it, so a link elsewhere is never read or written through.
  const stats = lstatSync(file, { throwIfNoEntry: false });
  if (stats && !stats.isFile()) {
    return {
      level: 'warn',
      message: `Not writing the development backend key to ${DEV_VARS}: it isn't a regular file.`,
    };
  }

  const existing = stats ? await readDotenv(file) : undefined;
  if (existing?.value !== undefined) {
    return isKey(existing.value, key) ? undefined : anotherKey(DEV_VARS);
  }

  // Wrangler reads .env only when there's no .dev.vars, so creating one would hide it.
  const env = stats ? undefined : await readDotenv(join(root, ENV));
  if (env) {
    if (env.value === undefined) {
      return {
        level: 'warn',
        message: `Add ${BACKEND_KEY_VARIABLE} to ${ENV}, set to the output of \`ghost-app backend-key\`, so the Worker can answer Ghost's challenge.`,
      };
    }
    return isKey(env.value, key) ? undefined : anotherKey(ENV);
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
  if (!existing) {
    await writeFile(file, line, { flag: 'wx', mode: 0o600 });
  } else {
    // Opened without following a link, in case one replaced the file since it was checked, and
    // made private before the key goes in, as an existing file is often readable by anyone.
    const handle = await open(file, constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW);
    try {
      await handle.chmod(0o600);
      const { text } = existing;
      await handle.appendFile(text === '' || text.endsWith('\n') ? line : `\n${line}`);
    } finally {
      await handle.close();
    }
  }
  return {
    level: 'info',
    message: `Added ${BACKEND_KEY_VARIABLE} to ${DEV_VARS}, with the development backend key`,
  };
}
