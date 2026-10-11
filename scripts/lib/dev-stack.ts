import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { join, sep } from 'node:path';
import { checkoutRoot, ENV_FILE, parseEnv, worktreeDatabases } from './ghost-dev-env.ts';

export const PID_FILE = '.ghost-dev.pid';
export const LOG_FILE = '.ghost-dev.log';

export interface Proc {
  pid: number;
  ppid: number;
  pgid: number;
  /** Resident memory in KiB */
  rss: number;
  command: string;
}

/** Every checkout of the repository, the main one first */
export function checkouts(): string[] {
  const list = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: checkoutRoot,
    encoding: 'utf8',
  });
  return list
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length))
    .map((path) => (existsSync(path) ? realpathSync(path) : path));
}

/** A checkout's `.ghost-dev.env`, if it has run `pnpm dev` */
export function checkoutEnv(root: string): Record<string, string> | undefined {
  const file = join(root, ENV_FILE);
  return existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : undefined;
}

/** This checkout's `.ghost-dev.env`, overridden by GHOST_DEV_* values in the environment */
export function checkoutSettings(): Record<string, string> {
  const overrides = Object.entries(process.env).filter(
    (entry): entry is [string, string] =>
      entry[0].startsWith('GHOST_DEV_') && entry[1] !== undefined,
  );
  return { ...checkoutEnv(checkoutRoot), ...Object.fromEntries(overrides) };
}

/** The front door's and Ghost's ports */
export function devPorts(env: Record<string, string>): number[] {
  return [env.GHOST_DEV_PORT, env.GHOST_DEV_BACKEND_PORT].filter(Boolean).map(Number);
}

/** The dev_* databases that none of these existing linked worktrees can be using */
export function unusedDatabases(
  databases: string[],
  worktrees: { root: string; env?: Record<string, string> }[],
): string[] {
  // A worktree without its env file, e.g. after deleting it to reassign ports, keeps its database
  const used = new Set(
    worktrees.flatMap(({ root, env }) =>
      env?.GHOST_DEV_DATABASE ? [env.GHOST_DEV_DATABASE] : worktreeDatabases(root),
    ),
  );
  return databases.filter((name) => /^dev_\w+$/.test(name) && !used.has(name));
}

export function isListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: 'localhost', port, timeout: 1000 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

/** Whether Ghost answers through the front door at `url` */
export function isReady(url: string, timeout = 5000): Promise<boolean> {
  const { host, port, pathname } = new URL('ghost/api/admin/site/', url);
  return new Promise((resolve) => {
    // Sent to localhost with the URL's Host, so it doesn't depend on resolving *.localhost
    const request = http.get(
      { host: 'localhost', port, path: pathname, headers: { host }, timeout },
      (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      },
    );
    request.once('timeout', () => request.destroy());
    request.once('error', () => resolve(false));
  });
}

/** A process from its /proc/<pid> `stat`, `cmdline` and `status` files */
export function parseProc(
  pid: number,
  files: { stat: string; cmdline: string; status: string },
): Proc {
  // The command name in parentheses can contain spaces, so fields count from its end
  const fields = files.stat.slice(files.stat.lastIndexOf(')') + 2).split(' ');
  return {
    pid,
    ppid: Number(fields[1]),
    pgid: Number(fields[2]),
    rss: Number(/^VmRSS:\s+(\d+)/m.exec(files.status)?.[1] ?? 0),
    command: files.cmdline.split('\0').filter(Boolean).join(' '),
  };
}

// Linux reads /proc throughout, as slim images ship without `ps` and `lsof`
export function processInfo(pid: number): Proc | undefined {
  try {
    if (process.platform === 'linux') {
      const read = (file: string) => readFileSync(`/proc/${pid}/${file}`, 'utf8');
      return parseProc(pid, {
        stat: read('stat'),
        cmdline: read('cmdline'),
        status: read('status'),
      });
    }
    const ps = execFileSync('ps', ['-o', 'ppid=,pgid=,rss=,command=', '-p', String(pid)], {
      encoding: 'utf8',
    });
    const [, ppid, pgid, rss, command = ''] =
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(ps.trim()) ?? [];
    return { pid, ppid: Number(ppid), pgid: Number(pgid), rss: Number(rss), command };
  } catch {
    // Exited
    return undefined;
  }
}

/** Whether the process runs in `root`, which tells this checkout's processes from others' */
export function inCheckout(pid: number, root = checkoutRoot): boolean {
  let cwd: string | undefined;
  try {
    cwd =
      process.platform === 'linux'
        ? readlinkSync(`/proc/${pid}/cwd`)
        : /^n(.*)$/m.exec(
            spawnSync('lsof', ['-a', '-d', 'cwd', '-Fn', '-p', String(pid)], { encoding: 'utf8' })
              .stdout,
          )?.[1];
  } catch {
    return false;
  }
  return cwd === root || cwd?.startsWith(root + sep) === true;
}

/** The pid listening on each port in `lsof -Fpn` output */
export function parseLsofListeners(output: string): Map<number, number> {
  const found = new Map<number, number>();
  let pid = 0;
  for (const line of output.split('\n')) {
    if (line.startsWith('p')) {
      pid = Number(line.slice(1));
    } else if (line.startsWith('n')) {
      const port = Number(line.slice(line.lastIndexOf(':') + 1));
      if (!found.has(port)) {
        found.set(port, pid);
      }
    }
  }
  return found;
}

/** The port of each listening socket's inode in /proc/net/tcp or tcp6 */
export function parseProcNetTcp(table: string): Map<string, number> {
  const sockets = new Map<string, number>();
  for (const line of table.split('\n').slice(1)) {
    // sl local_address rem_address st ... inode, where st 0A is LISTEN
    const [, local = '', , state, , , , , , inode = ''] = line.trim().split(/\s+/);
    if (state === '0A') {
      sockets.set(inode, parseInt(local.split(':')[1] ?? '', 16));
    }
  }
  return sockets;
}

/** The pid listening on each of `ports` that has a listener */
export function listeners(ports: number[]): Map<number, number> {
  if (ports.length === 0) {
    return new Map();
  }
  if (process.platform !== 'linux') {
    const lsof = ['-nP', '-sTCP:LISTEN', '-Fpn', ...ports.map((port) => `-iTCP:${port}`)];
    return parseLsofListeners(spawnSync('lsof', lsof, { encoding: 'utf8' }).stdout ?? '');
  }
  // A socket's /proc/<pid>/fd entry links to `socket:[inode]`
  const sockets = new Map<string, number>();
  for (const table of ['/proc/net/tcp', '/proc/net/tcp6'].filter((file) => existsSync(file))) {
    for (const [inode, port] of parseProcNetTcp(readFileSync(table, 'utf8'))) {
      if (ports.includes(port)) {
        sockets.set(`socket:[${inode}]`, port);
      }
    }
  }
  const found = new Map<number, number>();
  const pids = sockets.size > 0 ? readdirSync('/proc').filter((name) => /^\d+$/.test(name)) : [];
  for (const pid of pids) {
    try {
      for (const fd of readdirSync(`/proc/${pid}/fd`)) {
        const port = sockets.get(readlinkSync(`/proc/${pid}/fd/${fd}`));
        if (port && !found.has(port)) {
          found.set(port, Number(pid));
        }
      }
    } catch {
      // Exited, or another user's
    }
  }
  return found;
}

export function readPid(root = checkoutRoot): number | undefined {
  const file = join(root, PID_FILE);
  return (existsSync(file) && Number(readFileSync(file, 'utf8').trim())) || undefined;
}

/** The process group `pnpm dev:up` started in `root`, while it's running */
export function upGroup(root = checkoutRoot): number | undefined {
  const pid = readPid(root);
  try {
    if (pid && inCheckout(pid, root)) {
      process.kill(-pid, 0);
      return pid;
    }
  } catch {
    // Exited
  }
  return undefined;
}
