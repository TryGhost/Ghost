import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseProc, type Proc, treeTargets, worktreeList } from './dev-stack.ts';

export interface ProcessEntry extends Proc {
  /** Milliseconds since the epoch */
  started: number;
  env: Record<string, string>;
}

/** A process nx started in one of the repository's checkouts */
export interface DevProcess extends Proc {
  started: number;
  /** The checkout nx ran in, which may have been deleted since */
  root: string;
  /** Whether the nx process that started it has exited */
  orphaned: boolean;
}

const ENV = [
  'NX_INVOCATION_ROOT_PID',
  'NX_WORKSPACE_ROOT',
  'npm_package_name',
  'PNPM_PACKAGE_NAME',
];
// The root package.json's name, which pnpm passes to the scripts and binaries it runs
const PACKAGE = 'ghost-monorepo';

/**
 * This user's processes in `ps -E -o pid=,ppid=,pgid=,rss=,lstart=,command=` output, with the
 * environment variables that tell a Ghost dev process from others
 */
export function parsePs(output: string): ProcessEntry[] {
  return output.split('\n').flatMap((line) => {
    const match =
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\w{3} \w{3}\s+\d+ [\d:]{8} \d{4})\s+(.*)$/.exec(line);
    if (!match) {
      return [];
    }
    const [, pid, ppid, pgid, rss, lstart = '', rest = ''] = match;
    // `ps -E` appends the environment to the command without quoting either
    const env = Object.fromEntries(
      ENV.flatMap((name) => {
        const value = new RegExp(` ${name}=(.*?)(?= [A-Za-z_]\\w*=|$)`).exec(rest)?.[1];
        return value ? [[name, value]] : [];
      }),
    );
    return [
      {
        pid: Number(pid),
        ppid: Number(ppid),
        pgid: Number(pgid),
        rss: Number(rss),
        started: Date.parse(lstart),
        command: rest.split(/ (?=[A-Za-z_]\w*=)/)[0] ?? '',
        env,
      },
    ];
  });
}

/** The environment variables in `/proc/<pid>/environ` that tell a Ghost dev process from others */
export function parseEnviron(environ: string): Record<string, string> {
  return Object.fromEntries(
    environ.split('\0').flatMap((entry) => {
      const index = entry.indexOf('=');
      const name = entry.slice(0, index);
      return index > 0 && ENV.includes(name) ? [[name, entry.slice(index + 1)]] : [];
    }),
  );
}

/** Every process of this user, read once so a refresh stays cheap */
export function processEntries(): ProcessEntry[] {
  if (process.platform !== 'linux') {
    const output = execFileSync(
      'ps',
      [
        '-x',
        '-U',
        String(userInfo().uid),
        '-ww',
        '-E',
        '-o',
        'pid=,ppid=,pgid=,rss=,lstart=,command=',
      ],
      { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' }, maxBuffer: 64 * 1024 ** 2 },
    );
    return parsePs(output);
  }
  // Field 22 of `stat` counts clock ticks from boot, and USER_HZ is 100 on Linux
  const boot = Number(/^btime (\d+)$/m.exec(readFileSync('/proc/stat', 'utf8'))?.[1]);
  return readdirSync('/proc')
    .filter((name) => /^\d+$/.test(name))
    .flatMap((name) => {
      const read = (file: string) => readFileSync(`/proc/${name}/${file}`, 'utf8');
      try {
        // Another user's environ can't be read
        const env = parseEnviron(read('environ'));
        const stat = read('stat');
        const dev = 'NX_INVOCATION_ROOT_PID' in env;
        const proc = parseProc(Number(name), {
          stat,
          cmdline: dev ? read('cmdline') : '',
          status: dev ? read('status') : '',
        });
        const ticks = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19]);
        return [{ ...proc, started: (boot + ticks / 100) * 1000, env }];
      } catch {
        // Exited, or another user's
        return [];
      }
    });
}

/**
 * The processes nx started in one of `checkouts`, or in a deleted checkout of this repository,
 * which only pnpm's package name in their environment still tells
 */
export function devProcesses(
  entries: ProcessEntry[],
  checkouts: string[],
  exists: (path: string) => boolean = existsSync,
): DevProcess[] {
  const started = new Map(entries.map((entry) => [entry.pid, entry.started]));
  return entries.flatMap(({ env, ...proc }) => {
    const root = env.NX_WORKSPACE_ROOT;
    const owner = Number(env.NX_INVOCATION_ROOT_PID);
    const ours =
      root &&
      (checkouts.includes(root) ||
        (!exists(root) && [env.npm_package_name, env.PNPM_PACKAGE_NAME].includes(PACKAGE)));
    if (!ours || !owner) {
      return [];
    }
    // A pid that started after this process is a reused one
    const ownerStarted = started.get(owner);
    return [{ ...proc, root, orphaned: ownerStarted === undefined || ownerStarted > proc.started }];
  });
}

/**
 * Stops the orphaned processes in `root` that are still the ones in `expected`, with SIGTERM and
 * then SIGKILL after 10s like `dev:down`. Resolves to how many it stopped.
 */
export async function stopOrphans(
  root: string,
  expected: { pid: number; startedAt: string }[],
): Promise<number> {
  const entries = processEntries();
  const orphans = devProcesses(
    entries,
    worktreeList().map((worktree) => worktree.root),
  ).filter(
    (proc) =>
      proc.root === root &&
      proc.orphaned &&
      expected.some(
        ({ pid, startedAt }) =>
          pid === proc.pid && startedAt === new Date(proc.started).toISOString(),
      ),
  );
  const targets = treeTargets(
    entries,
    orphans.map(({ pid }) => pid),
  );
  const send = (pid: number, signal: NodeJS.Signals | 0) => {
    try {
      process.kill(pid, signal);
      return true;
    } catch {
      return false;
    }
  };
  targets.forEach((pid) => send(pid, 'SIGTERM'));
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && targets.some((pid) => send(pid, 0))) {
    await sleep(250);
  }
  targets.forEach((pid) => send(pid, 'SIGKILL'));
  return orphans.length;
}
