import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENV_FILE = '.ghost-dev.env';

export interface GhostDevEnv {
  GHOST_DEV_PORT: string;
  GHOST_DEV_BACKEND_PORT: string;
  GHOST_DEV_BACKEND: string;
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

function parseEnvFile(file: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const [, key, value] = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()) ?? [];
    if (key) {
      env[key] = value ?? '';
    }
  }
  return env;
}

function toEnv(port: number, database: string): GhostDevEnv {
  return {
    GHOST_DEV_PORT: String(port),
    GHOST_DEV_BACKEND_PORT: String(port + 1),
    GHOST_DEV_BACKEND: `http://127.0.0.1:${port + 1}`,
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

// Ports already assigned to the repo's other checkouts, whether or not they're running
function assignedPorts(): Set<number> {
  const ports = new Set([MAIN_PORT, MAIN_PORT + 1]);
  for (const line of git(['worktree', 'list', '--porcelain']).split('\n')) {
    if (!line.startsWith('worktree ')) {
      continue;
    }
    const file = join(line.slice('worktree '.length), ENV_FILE);
    if (existsSync(file) && realpathSync(file) !== join(checkoutRoot, ENV_FILE)) {
      const env = parseEnvFile(file);
      ports.add(Number(env.GHOST_DEV_PORT));
      ports.add(Number(env.GHOST_DEV_BACKEND_PORT));
    }
  }
  return ports;
}

async function allocate(): Promise<GhostDevEnv> {
  const gitDir = git(['rev-parse', '--path-format=absolute', '--git-dir']);
  const commonDir = git(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (gitDir === commonDir) {
    return toEnv(MAIN_PORT, MAIN_DATABASE);
  }

  // e2e setup drops every database named ghost_%, so worktree databases use another prefix
  const slug = basename(checkoutRoot)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const database = `dev_${slug}`.slice(0, 64);

  const taken = assignedPorts();
  const start =
    parseInt(createHash('sha1').update(checkoutRoot).digest('hex').slice(0, 8), 16) % SLOTS;
  for (let i = 0; i < SLOTS; i++) {
    const port = FIRST_PORT + ((start + i) % SLOTS) * 2;
    if (
      !taken.has(port) &&
      !taken.has(port + 1) &&
      (await isFree(port)) &&
      (await isFree(port + 1))
    ) {
      return toEnv(port, database);
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
    return parseEnvFile(file) as unknown as GhostDevEnv;
  }
  const env = await allocate();
  const lines = Object.entries(env).map(([key, value]) => `${key}=${value}`);
  writeFileSync(
    file,
    `# This checkout's \`pnpm dev\` ports and database. Delete to reassign.\n${lines.join('\n')}\n`,
  );
  return env;
}
