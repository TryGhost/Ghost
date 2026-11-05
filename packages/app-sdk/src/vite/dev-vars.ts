import { constants, existsSync, lstatSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { link, open, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PrivateKeyJwkSchema } from '@tryghost/app-contracts/identity';

import { isGitIgnored } from '../tooling/git.ts';
import {
  BACKEND_KEY_VARIABLE,
  KEYS_DIRECTORY,
  keyFile,
  readBackendKey,
  type PrivateKeyJwk,
} from '../tooling/keys.ts';
import { isErrnoException } from '../tooling/errors.ts';

const WRANGLER_CONFIGS = ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml'];

const DEV_VARS = '.dev.vars';

const ENV = '.env';

// dotenv's own line rule (dotenv 17), which Wrangler reads `.dev.vars` and `.env` with: an
// optional `export`, a quoted value (quotes escaped inside it), or an unquoted one up to a `#`.
const LINE =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

/** What a dotenv file sets each name to, by dotenv's rules: the last assignment wins. */
function parseDotenv(text: string): Map<string, string> {
  const values = new Map<string, string>();
  const lines = text.replace(/\r\n?/gm, '\n');
  for (const [, name = '', raw = ''] of lines.matchAll(LINE)) {
    const trimmed = raw.trim();
    let value = trimmed.replace(/^(['"`])([\s\S]*)\1$/gm, '$2');
    if (trimmed.startsWith('"')) {
      value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }
    values.set(name, value);
  }
  return values;
}

type Message = { level: 'info' | 'warn'; message: string };

/**
 * A dotenv file's text and what it sets the backend key to, as text, `undefined` if nothing; or
 * `undefined` if there's no file.
 */
async function readDotenv(file: string): Promise<{ text: string; value?: string } | undefined> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
  return { text, value: parseDotenv(text).get(BACKEND_KEY_VARIABLE) };
}

/** Whether a value is the development backend key; `undefined` if it isn't a key at all. */
function matches(value: string, key: PrivateKeyJwk): boolean | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  // The Worker imports it as an Ed25519 key, so anything else can't answer, whatever its x and d.
  const read = PrivateKeyJwkSchema.safeParse(parsed);
  if (!read.success) {
    return undefined;
  }
  return read.data.x === key.x && read.data.d === key.d;
}

/** Nothing to say if a file's key is the development key; otherwise how it differs. */
function compare(file: string, value: string, key: PrivateKeyJwk): Message | undefined {
  const same = matches(value, key);
  if (same) {
    return undefined;
  }
  if (same === false) {
    return anotherKey(file);
  }
  return {
    level: 'warn',
    message: `${file} sets ${BACKEND_KEY_VARIABLE} to something that isn't a private key as JSON, so the Worker can't answer Ghost's challenge. Remove that line from ${file} and restart to use the development key.`,
  };
}

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
export async function provideDevBackendKey(
  root: string,
  { retried = false, cloudflareEnv }: { retried?: boolean; cloudflareEnv?: string } = {},
): Promise<Message | undefined> {
  if (!WRANGLER_CONFIGS.some((file) => existsSync(join(root, file)))) {
    return undefined;
  }
  const key = await readBackendKey({ root, mode: 'development' });

  // With `CLOUDFLARE_ENV` naming an environment, Wrangler reads `.dev.vars.<environment>` instead
  // of `.dev.vars` when there's one, so the key belongs there. It's the developer's to add.
  const environmentFile = cloudflareEnv && `${DEV_VARS}.${cloudflareEnv}`;
  const environment = environmentFile ? await readDotenv(join(root, environmentFile)) : undefined;
  if (environmentFile && environment) {
    if (environment.value === undefined) {
      return {
        level: 'warn',
        message: `Wrangler reads ${environmentFile} instead of ${DEV_VARS} for CLOUDFLARE_ENV=${cloudflareEnv}, so add ${BACKEND_KEY_VARIABLE} to it, set to the output of \`ghost-app backend-key\`, so the Worker can answer Ghost's challenge.`,
      };
    }
    return compare(environmentFile, environment.value, key);
  }
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
    return compare(DEV_VARS, existing.value, key);
  }

  // Wrangler reads its `.env` files only when there's no `.dev.vars`, so creating one would hide
  // them. It merges them, the first here winning, with `<environment>` from `CLOUDFLARE_ENV`.
  const envFiles = [
    ...(cloudflareEnv ? [`${ENV}.${cloudflareEnv}.local`] : []),
    `${ENV}.local`,
    ...(cloudflareEnv ? [`${ENV}.${cloudflareEnv}`] : []),
    ENV,
  ];
  const envs = [];
  for (const name of stats ? [] : envFiles) {
    const read = await readDotenv(join(root, name));
    if (read) {
      envs.push({ name, value: read.value });
    }
  }
  if (envs.length > 0) {
    const setting = envs.find(({ value }) => value !== undefined);
    if (setting?.value === undefined) {
      return {
        level: 'warn',
        message: `Wrangler reads ${envs.map(({ name }) => name).join(', ')} when there's no ${DEV_VARS}, so add ${BACKEND_KEY_VARIABLE} to one of them, set to the output of \`ghost-app backend-key\`, so the Worker can answer Ghost's challenge. Git must ignore the file you put it in.`,
      };
    }
    return compare(setting.name, setting.value, key);
  }

  // A new `.dev.vars` is written whole to a file among the development keys first, then linked
  // into place, so another dev server never reads it before the key is in it. Git must ignore
  // that file as much as `.dev.vars`.
  const pending = join(KEYS_DIRECTORY, 'development', `${DEV_VARS}.${randomUUID()}.tmp`);
  const ignored = await isGitIgnored(root, existing ? DEV_VARS : [DEV_VARS, pending]);
  if (!ignored.ignored) {
    return {
      level: 'warn',
      message: `Not writing the development backend key to ${DEV_VARS}: ${ignored.reason}. Add ${DEV_VARS} to .gitignore.`,
    };
  }
  // Single quotes keep the JSON as it is.
  const line = `${BACKEND_KEY_VARIABLE}='${JSON.stringify(key)}'\n`;
  if (!existing) {
    try {
      await writeFile(join(root, pending), line, { flag: 'wx', mode: 0o600 });
      await link(join(root, pending), file);
    } catch (error) {
      // Another dev server created it first: what it holds now decides, once.
      if (isErrnoException(error) && error.code === 'EEXIST' && !retried) {
        return provideDevBackendKey(root, { retried: true, cloudflareEnv });
      }
      throw error;
    } finally {
      await rm(join(root, pending), { force: true });
    }
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
