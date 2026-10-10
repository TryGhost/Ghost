import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENV_FILE = '.ghost-dev.env';

export interface GhostDevEnv {
  GHOST_DEV_NAME: string;
  GHOST_DEV_PORT: string;
  GHOST_DEV_BACKEND_PORT: string;
  GHOST_DEV_DATABASE: string;
}

// The main checkout keeps the long-standing URL and database
const MAIN_PORT = 2368;
const MAIN_DATABASE = 'ghost_dev';
// Linked worktrees get a (front door, Ghost) port pair from this range
const FIRST_PORT = 2400;
const SLOTS = 300;

const checkoutRoot = realpathSync(fileURLToPath(new URL('../..', import.meta.url)));

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: checkoutRoot, encoding: 'utf8' }).trim();
}

export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const [, key, value] = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()) ?? [];
    if (key) {
      env[key] = value ?? '';
    }
  }
  return env;
}

function parseEnvFile(file: string): Record<string, string> {
  return parseEnv(readFileSync(file, 'utf8'));
}

function toEnv(name: string, port: number, database: string): GhostDevEnv {
  return {
    GHOST_DEV_NAME: name,
    GHOST_DEV_PORT: String(port),
    GHOST_DEV_BACKEND_PORT: String(port + 1),
    GHOST_DEV_DATABASE: database,
  };
}

function isFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

// Ports and databases already assigned to the repo's other checkouts, whether or not they're running
function assignedElsewhere(): { ports: Set<number>; databases: Set<string> } {
  const ports = new Set([MAIN_PORT, MAIN_PORT + 1]);
  const databases = new Set([MAIN_DATABASE]);
  for (const line of git(['worktree', 'list', '--porcelain']).split('\n')) {
    if (!line.startsWith('worktree ')) {
      continue;
    }
    const file = join(line.slice('worktree '.length), ENV_FILE);
    if (existsSync(file) && realpathSync(file) !== join(checkoutRoot, ENV_FILE)) {
      const env = parseEnvFile(file);
      ports.add(Number(env.GHOST_DEV_PORT));
      ports.add(Number(env.GHOST_DEV_BACKEND_PORT));
      if (env.GHOST_DEV_DATABASE) {
        databases.add(env.GHOST_DEV_DATABASE);
      }
    }
  }
  return { ports, databases };
}

function isMainCheckout(): boolean {
  const gitDir = git(['rev-parse', '--path-format=absolute', '--git-dir']);
  return gitDir === git(['rev-parse', '--path-format=absolute', '--git-common-dir']);
}

function checkoutName(): string {
  if (isMainCheckout()) {
    return 'main';
  }
  return basename(checkoutRoot)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function allocate(): Promise<GhostDevEnv> {
  if (isMainCheckout()) {
    return toEnv('main', MAIN_PORT, MAIN_DATABASE);
  }

  const taken = assignedElsewhere();
  const hash = createHash('sha1').update(checkoutRoot).digest('hex');
  let name = checkoutName();
  // Some tools give every worktree the same folder name, e.g. ~/.codex/worktrees/<id>/Ghost
  if (taken.databases.has(`dev_${name}`)) {
    name = `${name.slice(0, 50)}_${hash.slice(0, 6)}`;
  }
  // e2e setup drops every database named ghost_e2e_%, so worktree databases use another prefix
  const database = `dev_${name}`.slice(0, 64);

  const start = parseInt(hash.slice(0, 8), 16) % SLOTS;
  for (let i = 0; i < SLOTS; i++) {
    const port = FIRST_PORT + ((start + i) % SLOTS) * 2;
    if (
      !taken.ports.has(port) &&
      !taken.ports.has(port + 1) &&
      (await isFree(port)) &&
      (await isFree(port + 1))
    ) {
      return toEnv(name, port, database);
    }
  }
  throw new Error(`No free port pair between ${FIRST_PORT} and ${FIRST_PORT + SLOTS * 2}`);
}

/**
 * Ports and database for this checkout's `pnpm dev`, assigned once and kept in
 * `.ghost-dev.env` so URLs and sessions survive restarts.
 */
export async function resolveGhostDevEnv(): Promise<GhostDevEnv> {
  const file = join(checkoutRoot, ENV_FILE);
  if (existsSync(file)) {
    return { GHOST_DEV_NAME: checkoutName(), ...parseEnvFile(file) } as GhostDevEnv;
  }
  const env = await allocate();
  const lines = Object.entries(env).map(([key, value]) => `${key}=${value}`);
  writeFileSync(
    file,
    `# This checkout's \`pnpm dev\` ports and database. Delete to reassign.\n${lines.join('\n')}\n`,
  );
  return env;
}
