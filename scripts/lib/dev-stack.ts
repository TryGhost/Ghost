import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { join, relative, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { checkoutRoot, ENV_FILE, parseEnv, worktreeDatabases } from './ghost-dev-env.ts';

export const PID_FILE = '.ghost-dev.pid';
export const LOG_FILE = '.ghost-dev.log';

export interface Proc {
  pid: number;
  ppid: number;
  pgid: number;
  /** Resident memory in KiB */
  rss: number;
  /** Seconds since the process started */
  elapsed: number;
  state: string;
  command: string;
  cwd?: string;
}

// `nx run` of a dev:host target, and the pnpm and shell processes that launched it.
// Anchored at the end so a command that merely mentions it, e.g. an agent's prompt, doesn't match.
const STACK = /\bnx(\.js)? run ghost-monorepo:dev:host(:[\w-]+)?( --\S+)*$/;
// What those targets run, as `ps` shows it
const DEV_COMMANDS = [
  STACK,
  /\bwith-ghost-dev-env\.ts (pnpm dev|nodemon index\.js)$/,
  /\bnodemon(\.js)? index\.js$/,
  / --import=tsx index\.js$/,
  /\/vite\/bin\/vite\.js( build --watch\b.*)?$/,
  /\bconcurrently(\.js)? .*--watch\b/,
];

/** `ps` elapsed time, `[[dd-]hh:]mm:ss`, in seconds */
export function parseElapsed(etime: string): number {
  const [time = '', days = '0'] = etime.split('-').reverse();
  const [seconds = 0, minutes = 0, hours = 0] = time.split(':').reverse().map(Number);
  return ((Number(days) * 24 + hours) * 60 + minutes) * 60 + seconds;
}

export function parseProcesses(text: string): Proc[] {
  return text.split('\n').flatMap((line) => {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(line);
    if (!match) {
      return [];
    }
    const [, pid, ppid, pgid, rss, etime = '', state = '', command = ''] = match;
    return [
      {
        pid: Number(pid),
        ppid: Number(ppid),
        pgid: Number(pgid),
        rss: Number(rss),
        elapsed: parseElapsed(etime),
        state,
        command,
      },
    ];
  });
}

/** A process from its /proc/<pid> `stat`, `cmdline` and `status` files */
export function parseProcFiles(
  pid: number,
  files: { stat: string; cmdline: string; status: string },
  uptime: number,
): Proc {
  // The command name in parentheses can contain spaces, so fields count from its end
  const fields = files.stat.slice(files.stat.lastIndexOf(')') + 2).split(' ');
  return {
    pid,
    ppid: Number(fields[1]),
    pgid: Number(fields[2]),
    rss: Number(/^VmRSS:\s+(\d+)/m.exec(files.status)?.[1] ?? 0),
    // In clock ticks since boot, which Linux reports at 100 per second
    elapsed: Math.max(0, Math.round(uptime - Number(fields[19]) / 100)),
    state: fields[0] ?? '',
    command: files.cmdline.split('\0').filter(Boolean).join(' '),
  };
}

export function listProcesses(): Proc[] {
  // Slim Linux images ship without `ps`
  if (process.platform === 'linux') {
    const uptime = Number(readFileSync('/proc/uptime', 'utf8').split(' ')[0]);
    return readdirSync('/proc')
      .filter((name) => /^\d+$/.test(name))
      .flatMap((name) => {
        const read = (file: string) => readFileSync(`/proc/${name}/${file}`, 'utf8');
        try {
          const files = { stat: read('stat'), cmdline: read('cmdline'), status: read('status') };
          return [parseProcFiles(Number(name), files, uptime)];
        } catch {
          // Exited while listing
          return [];
        }
      })
      .filter((proc) => proc.command !== '');
  }
  const ps = ['-ww', '-A', '-o', 'pid=,ppid=,pgid=,rss=,etime=,stat=,command='];
  return parseProcesses(execFileSync('ps', ps, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
}

function childrenOf(procs: Proc[]): Map<number, Proc[]> {
  const children = new Map<number, Proc[]>();
  for (const proc of procs) {
    children.set(proc.ppid, [...(children.get(proc.ppid) ?? []), proc]);
  }
  return children;
}

function addCwds(procs: Proc[]) {
  if (process.platform === 'linux') {
    for (const proc of procs) {
      try {
        proc.cwd = readlinkSync(`/proc/${proc.pid}/cwd`);
      } catch {
        // Exited since `ps` ran
      }
    }
    return;
  }
  const byPid = new Map(procs.map((proc) => [proc.pid, proc]));
  if (byPid.size === 0) {
    return;
  }
  // Exits 1 when a process has exited since `ps` ran; the rest of the output still counts
  const { stdout } = spawnSync(
    'lsof',
    ['-w', '-a', '-d', 'cwd', '-Fn', '-p', [...byPid.keys()].join(',')],
    { encoding: 'utf8' },
  );
  let current: Proc | undefined;
  for (const line of stdout.split('\n')) {
    if (line.startsWith('p')) {
      current = byPid.get(Number(line.slice(1)));
    } else if (line.startsWith('n') && current) {
      current.cwd = line.slice(1);
    }
  }
}

/** Every process, with the working directory of those a dev stack could own */
export function scanProcesses(): Proc[] {
  const procs = listProcesses();
  const children = childrenOf(procs);
  const candidates = new Set<Proc>();
  const add = (proc: Proc) => {
    if (!candidates.has(proc)) {
      candidates.add(proc);
      children.get(proc.pid)?.forEach(add);
    }
  };
  procs.filter((proc) => DEV_COMMANDS.some((command) => command.test(proc.command))).forEach(add);
  addCwds([...candidates]);
  return procs;
}

/** The checkout a directory is in: the deepest root containing it, as worktrees can be nested */
export function checkoutOf(dir: string, roots: string[]): string | undefined {
  let match: string | undefined;
  for (const root of roots) {
    if ((dir === root || dir.startsWith(root + sep)) && root.length > (match?.length ?? 0)) {
      match = root;
    }
  }
  return match;
}

export interface DevProcesses {
  /** Running stacks: nx, whatever launched it and everything it started */
  stack: Proc[];
  /** Processes earlier stacks left behind when nx died before them */
  leftovers: Proc[];
}

/** One checkout's dev processes, leaving out the calling process and its ancestors */
export function devProcesses(
  procs: Proc[],
  root: string,
  roots: string[],
  self = process.pid,
): DevProcesses {
  const byPid = new Map(procs.map((proc) => [proc.pid, proc]));
  const children = childrenOf(procs);
  // e.g. the stack whose dev:env task is checking for another one
  const excluded = new Set<number>();
  for (let proc = byPid.get(self); proc && !excluded.has(proc.pid); proc = byPid.get(proc.ppid)) {
    excluded.add(proc.pid);
  }
  const ours = (proc: Proc) =>
    !excluded.has(proc.pid) && proc.cwd !== undefined && checkoutOf(proc.cwd, roots) === root;
  const withDescendants = (tops: Proc[]) => {
    const found = new Set<Proc>();
    const add = (proc: Proc) => {
      if (ours(proc) && !found.has(proc)) {
        found.add(proc);
        children.get(proc.pid)?.forEach(add);
      }
    };
    tops.forEach(add);
    return found;
  };
  const stack = withDescendants(procs.filter((proc) => STACK.test(proc.command)));
  const leftovers = withDescendants(
    procs.filter(
      (proc) =>
        proc.ppid === 1 &&
        !stack.has(proc) &&
        DEV_COMMANDS.some((command) => command.test(proc.command)),
    ),
  );
  return { stack: [...stack], leftovers: [...leftovers].filter((proc) => !stack.has(proc)) };
}

/** The process to report for a stack: the pidfile's, or the one that launched the rest */
export function stackLeader(stack: Proc[], pid?: number): Proc | undefined {
  const tops = stack.filter((proc) => !stack.some((other) => other.pid === proc.ppid));
  return stack.find((proc) => proc.pid === pid) ?? tops.sort((a, b) => b.elapsed - a.elapsed)[0];
}

function signal(pid: number, name: NodeJS.Signals) {
  try {
    process.kill(pid, name);
  } catch {
    // Exited already
  }
}

function survivors(procs: Proc[]): Proc[] {
  const now = new Map(listProcesses().map((proc) => [proc.pid, proc]));
  return procs.filter((proc) => {
    const current = now.get(proc.pid);
    return current?.command === proc.command && !current.state.startsWith('Z');
  });
}

/** SIGTERMs the processes and `group`, then SIGKILLs whatever is left; returns those */
export async function stop(procs: Proc[], group?: number, graceMs = 10_000): Promise<Proc[]> {
  for (const proc of procs) {
    signal(proc.pid, 'SIGTERM');
  }
  if (group) {
    signal(-group, 'SIGTERM');
  }
  const deadline = Date.now() + graceMs;
  let left = survivors(procs);
  while (left.length > 0 && Date.now() < deadline) {
    await sleep(250);
    left = survivors(procs);
  }
  for (const proc of left) {
    signal(proc.pid, 'SIGKILL');
  }
  if (group) {
    signal(-group, 'SIGKILL');
  }
  return left;
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

/** This checkout's `.ghost-dev.env`, overridden by GHOST_DEV_* values in the environment */
export function checkoutSettings(): Record<string, string> {
  const overrides = Object.entries(process.env).filter(
    (entry): entry is [string, string] =>
      entry[0].startsWith('GHOST_DEV_') && entry[1] !== undefined,
  );
  return { ...checkoutEnv(checkoutRoot), ...Object.fromEntries(overrides) };
}

export function readPid(root = checkoutRoot): number | undefined {
  const file = join(root, PID_FILE);
  return (existsSync(file) && Number(readFileSync(file, 'utf8').trim())) || undefined;
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

/** Why `port` is busy, for messages */
export function portInUse(port: number): string {
  const { stdout } = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc'], {
    encoding: 'utf8',
  });
  const pid = /^p(\d+)$/m.exec(stdout ?? '')?.[1];
  const command = /^c(.+)$/m.exec(stdout ?? '')?.[1];
  return pid ? `Port ${port} is in use by ${command} (pid ${pid})` : `Port ${port} is in use`;
}

export function formatProcess(proc: Proc, root = checkoutRoot): string {
  const command = proc.command.replace(/\S*\/node_modules\//g, '');
  return `${proc.pid}  ${relative(root, proc.cwd ?? root) || '.'}  ${command.slice(0, 100)}`;
}

/**
 * Exits if this checkout's dev stack is already running, and stops what earlier stacks
 * left behind
 */
export async function prepareStart(): Promise<void> {
  const { stack, leftovers } = devProcesses(scanProcesses(), checkoutRoot, checkouts());
  const running = stackLeader(stack, readPid());
  if (running) {
    console.error(
      `Ghost dev is already running in this checkout (pid ${running.pid}). See it with \`pnpm dev:status\`; stop it with \`pnpm dev:down\`.`,
    );
    process.exit(1);
  }
  if (leftovers.length > 0) {
    console.log('Stopping processes an earlier `pnpm dev` left behind:');
    for (const proc of leftovers) {
      console.log(`  ${formatProcess(proc)}`);
    }
    await stop(leftovers);
  }
}
