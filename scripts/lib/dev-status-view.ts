import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { emitKeypressEvents, type Key } from 'node:readline';
import { checkoutRoot } from './ghost-dev-env.ts';
import { type PullRequest, pullRequests } from './pull-requests.ts';

export interface DevStatus {
  name: string;
  root: string;
  branch: string | null;
  current: boolean;
  state: string;
  url: string;
  ports: number[];
  database: string | null;
  pid: number | null;
  memory: number | null;
  startedAt: string | null;
  log: string | null;
}

interface Job {
  state: 'starting' | 'stopping';
  child: ChildProcess;
}

type Style = (text: string) => string;

interface Cell {
  text: string;
  style?: Style;
  link?: string;
}

interface Column {
  title: string;
  cell: (row: DevStatus) => Cell;
  /** Left out when the table doesn't fit, lowest first */
  drop?: number;
  /** Shortened down to this when the table doesn't fit, rightmost first */
  min?: number;
}

const KEYS =
  '↑↓ move  a admin  f site  p PR  c checks  l log  s start  r restart  k stop  x stop all merged  q quit';
const OPENER = process.platform === 'darwin' ? 'open' : 'xdg-open';
const GAP = '  ';
// Branches whose name says nothing about which pull request a checkout is for
const BASE_BRANCHES = new Set(['main', 'master']);

const sgr =
  (code: string): Style =>
  (text) =>
    process.env.NO_COLOR || !text ? text : `\x1b[${code}m${text}\x1b[0m`;
const bold = sgr('1');
const dim = sgr('2');
const red = sgr('31');
const green = sgr('32');
const yellow = sgr('33');
const magenta = sgr('35');
// OSC 8, which terminals that don't support it ignore
const link = (url: string, text: string) => `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;

const STATES: Record<string, Style> = {
  running: green,
  starting: yellow,
  stopping: yellow,
  stopped: dim,
};
const CHECKS: Record<string, [string, string, Style]> = {
  SUCCESS: ['✓', 'checks passed', green],
  FAILURE: ['✗', 'checks failed', red],
  ERROR: ['✗', 'checks failed', red],
  PENDING: ['●', 'checks running', yellow],
  EXPECTED: ['●', 'checks running', yellow],
};

function prCell(pr: PullRequest | undefined): Cell {
  if (!pr) {
    return { text: '' };
  }
  if (pr.state !== 'OPEN') {
    const merged = pr.state === 'MERGED';
    return {
      text: `#${pr.number} ${merged ? 'merged' : 'closed'}`,
      style: merged ? magenta : dim,
      link: pr.url,
    };
  }
  const [symbol, , style] = CHECKS[pr.checks ?? ''] ?? [];
  const notes = [pr.draft && 'draft', pr.conflicts && 'conflicts'];
  const text = [`#${pr.number}`, symbol, ...notes].filter(Boolean).join(' ');
  return { text, style: pr.conflicts ? red : style, link: pr.url };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** `ms` as minutes, hours and minutes, or days and hours */
export function uptime(ms: number): string {
  const minutes = Math.floor(ms / MINUTE);
  const hours = Math.floor(minutes / 60);
  if (hours === 0) {
    return `${minutes}m`;
  }
  return hours < 24 ? `${hours}h${minutes % 60}m` : `${Math.floor(hours / 24)}d${hours % 24}h`;
}

function tableColumns(prs: Map<string, PullRequest>): Column[] {
  return [
    { title: '', cell: (row) => ({ text: row.current ? '*' : '', style: bold }) },
    {
      title: 'NAME',
      min: 12,
      cell: (row) => ({ text: row.name, style: row.state === 'stopped' ? dim : undefined }),
    },
    { title: 'STATE', cell: (row) => ({ text: row.state, style: STATES[row.state] }) },
    { title: 'PR', cell: (row) => prCell(row.branch ? prs.get(row.branch) : undefined) },
    { title: 'URL', min: 16, cell: (row) => ({ text: new URL(row.url).host, link: row.url }) },
    {
      title: 'UPTIME',
      drop: 2,
      cell: (row) => {
        const age = row.startedAt ? Date.now() - Date.parse(row.startedAt) : null;
        // Up longer than a working day
        return {
          text: age === null ? '' : uptime(age),
          style: age && age > 12 * HOUR ? yellow : undefined,
        };
      },
    },
    { title: 'PID', drop: 1, cell: (row) => ({ text: String(row.pid ?? '') }) },
  ];
}

/** Each column's width once the table fits in `room`, or null for a column left out */
export function fitColumns(
  columns: { width: number; drop?: number; min?: number }[],
  room: number,
): (number | null)[] {
  const widths: (number | null)[] = columns.map(({ width }) => width);
  const total = () =>
    widths.reduce<number>(
      (sum, width) => (width === null ? sum : sum + width + GAP.length),
      -GAP.length,
    );
  const droppable = [...columns.entries()]
    .filter(([, { drop }]) => drop !== undefined)
    .sort(([, a], [, b]) => (a.drop ?? 0) - (b.drop ?? 0));
  for (const [index] of droppable) {
    if (total() <= room) {
      break;
    }
    widths[index] = null;
  }
  for (const [index, { min }] of [...columns.entries()].reverse()) {
    const width = widths[index];
    if (min !== undefined && width !== null && width !== undefined && total() > room) {
      widths[index] = Math.max(Math.min(min, width), width - (total() - room));
    }
  }
  return widths;
}

/** `text` cut to `width` in the middle, which keeps a worktree's hash and a URL's port */
export function truncate(text: string, width: number): string {
  if (text.length <= width) {
    return text;
  }
  const end = Math.floor((width - 1) / 2);
  return `${text.slice(0, width - 1 - end)}…${end > 0 ? text.slice(-end) : ''}`;
}

/**
 * Shows the rows in the terminal until q, reloading them every 2s and their pull requests every
 * minute, with keys to open, start and stop the selected checkout's Ghost. Resolves to the rows
 * last shown.
 */
export function browse(
  initial: DevStatus[],
  load: (keep: Set<string>) => Promise<DevStatus[]>,
): Promise<DevStatus[]> {
  const { stdin, stdout } = process;
  let rows = initial;
  let selected = (rows.find((row) => row.current) ?? rows[0])?.root;
  let message = '';
  let confirming: DevStatus[] = [];
  let loading = false;
  let reload = false;
  let active = false;
  // The first row on screen, when they don't all fit
  let top = 0;
  const jobs = new Map<string, Job>();
  let prs = new Map<string, PullRequest>();
  let prError = '';
  let prLoading = false;
  const looked = new Set<string>();
  const prAbort = new AbortController();

  const enter = () => {
    active = true;
    // Alternate screen, hidden cursor, no line wrapping
    stdout.write('\x1b[?1049h\x1b[?25l\x1b[?7l');
    stdin.setRawMode(true);
    stdin.resume();
  };
  const leave = () => {
    if (active) {
      active = false;
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\x1b[?7h\x1b[?25h\x1b[?1049l');
    }
  };

  const prFor = (row: DevStatus) => (row.branch ? prs.get(row.branch) : undefined);
  const stateOf = (row: DevStatus) => jobs.get(row.root)?.state ?? row.state;
  const mergedRunning = () =>
    rows.filter(
      (row) => prFor(row)?.state === 'MERGED' && row.state !== 'stopped' && !jobs.has(row.root),
    );

  const details = (row: DevStatus): string[] => {
    const pr = prFor(row);
    let about = '';
    if (pr) {
      const status =
        pr.state === 'OPEN'
          ? [CHECKS[pr.checks ?? '']?.[1], pr.conflicts && `conflicts with ${pr.base}`]
          : [pr.state.toLowerCase()];
      const summary = status.filter(Boolean).join(', ');
      about = `#${pr.number} ${pr.title}${summary ? ` (${summary})` : ''}`;
    } else if (!row.branch || BASE_BRANCHES.has(row.branch)) {
      about = '';
    } else if (prError) {
      about = `pull request unknown: ${prError}`;
    } else {
      about = looked.has(row.branch) ? 'no pull request' : 'looking up its pull request…';
    }
    const hint =
      pr?.state === 'MERGED' && stateOf(row) !== 'stopped'
        ? magenta('  merged, so k stops its Ghost')
        : '';
    return [
      `${bold(row.branch ?? 'detached HEAD')}  ${about}${hint}`,
      dim(
        [
          row.root.replace(homedir(), '~'),
          `ports ${row.ports.join('/')}`,
          row.database && `database ${row.database}`,
        ]
          .filter(Boolean)
          .join('  '),
      ),
    ];
  };

  const render = () => {
    if (!active) {
      return;
    }
    const width = stdout.columns || 80;
    const shown = rows.map((row) => ({ ...row, state: stateOf(row) }));
    const layout = tableColumns(prs);
    const cells = shown.map((row) => layout.map((column) => column.cell(row)));
    const widths = fitColumns(
      layout.map((column, index) => ({
        width: Math.max(column.title.length, ...cells.map((row) => row[index]?.text.length ?? 0)),
        drop: column.drop,
        min: column.min,
      })),
      width,
    );
    const line = (row: Cell[], plain: boolean) =>
      row
        .flatMap((cell, index) => {
          const columnWidth = widths[index];
          if (columnWidth === null || columnWidth === undefined) {
            return [];
          }
          const text = truncate(cell.text, columnWidth);
          const styled = plain || !cell.style ? text : cell.style(text);
          const linked = cell.link && text ? link(cell.link, styled) : styled;
          return [linked + ' '.repeat(columnWidth - text.length)];
        })
        .join(GAP);

    // Header, details, message and keys take 6 lines
    const room = Math.max(1, (stdout.rows || 24) - 6);
    const index = shown.findIndex((row) => row.root === selected);
    top = Math.max(0, Math.min(Math.max(top, index - room + 1), index, shown.length - room));
    const body = cells
      .slice(top, top + room)
      .map((row, offset) =>
        top + offset === index
          ? `\x1b[7m${line(row, true)}${' '.repeat(width)}\x1b[0m`
          : line(row, false),
      );
    const header = line(
      layout.map((column) => ({ text: column.title, style: bold })),
      false,
    );
    const current = shown[index];
    const keys =
      mergedRunning().length > 0
        ? KEYS.replace('x stop all merged', magenta('x stop all merged'))
        : KEYS;
    const footer =
      confirming.length > 0
        ? bold(`Stop Ghost dev in ${confirming.map((row) => row.name).join(', ')}? y/n`)
        : dim(keys);
    const screen = [
      header,
      ...body,
      '',
      ...(current ? details(current) : ['', '']),
      message,
      footer,
    ];
    stdout.write(`\x1b[H${screen.join('\x1b[K\n')}\x1b[K\x1b[J`);
  };

  const refreshPrs = async () => {
    const branches = [
      ...new Set(
        rows.flatMap((row) => (row.branch && !BASE_BRANCHES.has(row.branch) ? [row.branch] : [])),
      ),
    ];
    if (prLoading) {
      return;
    }
    prLoading = true;
    try {
      prs = await pullRequests(branches, checkoutRoot, prAbort.signal);
      prError = '';
    } catch (error) {
      const { code, stderr } = error as { code?: string | number; stderr?: string };
      prError =
        stderr?.trim().split('\n')[0] ||
        (code === 'ENOENT' ? "gh isn't installed" : `gh failed (${code})`);
    } finally {
      prLoading = false;
      for (const branch of branches) {
        looked.add(branch);
      }
    }
    render();
  };

  const refresh = async (): Promise<void> => {
    if (loading) {
      reload = true;
      return;
    }
    loading = true;
    try {
      // Rows being started or stopped stay listed while they're stopped
      rows = await load(new Set(jobs.keys()));
    } catch (error) {
      message = `Couldn't reload: ${(error as Error).message.split('\n')[0]}`;
    } finally {
      loading = false;
    }
    if (reload) {
      reload = false;
      return refresh();
    }
    if (!rows.some((row) => row.root === selected)) {
      selected = (rows.find((row) => row.current) ?? rows[0])?.root;
    }
    if (
      rows.some((row) => row.branch && !BASE_BRANCHES.has(row.branch) && !looked.has(row.branch))
    ) {
      void refreshPrs();
    }
    render();
  };

  const open = (url: string) => {
    spawn(OPENER, [url], { detached: true, stdio: 'ignore' })
      .once('error', () => {
        message = `Couldn't run ${OPENER} to open ${url}`;
        render();
      })
      .unref();
    message = `Opened ${url}`;
  };

  const run = (
    row: DevStatus,
    state: Job['state'],
    command: string,
    args: string[],
    success: string,
    next?: () => void,
  ) => {
    // Its own process group, so a Ctrl-C in the log viewer doesn't reach it, and the checkout's
    // own `.ghost-dev.env` rather than this one's GHOST_DEV_* overrides
    const child = spawn(command, args, {
      cwd: row.root,
      detached: true,
      stdio: ['ignore', 'ignore', 'pipe'],
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('GHOST_DEV_')),
      ),
    });
    let errors = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      errors += chunk;
    });
    const finish = (failure?: string) => {
      if (jobs.get(row.root)?.child === child) {
        jobs.delete(row.root);
        message = failure ? `${row.name}: ${failure}` : success;
        if (!failure) {
          next?.();
        }
        void refresh();
      }
    };
    child.once('error', (error) => finish(error.message));
    child.once('close', (code, signal) =>
      finish(code === 0 ? undefined : errors.trim().split('\n')[0] || `exited (${signal ?? code})`),
    );
    jobs.set(row.root, { state, child });
  };

  const start = (row: DevStatus) =>
    run(row, 'starting', 'pnpm', ['dev:up'], `Ghost dev is up: ${row.url}`);

  const stop = (row: DevStatus, next?: () => void) => {
    const script = join(row.root, 'scripts/dev-down.ts');
    if (!existsSync(script)) {
      message = `${row.name} has no scripts/dev-down.ts`;
      return;
    }
    // Not `pnpm dev:down`, which installs first when the checkout's dependencies are stale
    run(row, 'stopping', process.execPath, [script], `Stopped Ghost dev in ${row.name}`, next);
  };

  const showLog = (row: DevStatus) => {
    if (!row.log) {
      message = `${row.name} has no log, as only \`pnpm dev:up\` writes one`;
      return;
    }
    leave();
    const { error } = spawnSync('less', ['-R', '+G', row.log], { stdio: 'inherit' });
    enter();
    if (error) {
      message = `Couldn't run less: ${error.message}`;
    }
  };

  // The keys that act on the selected row
  const actions: Record<string, (row: DevStatus) => void> = {
    a: (row) => (row.state === 'stopped' ? (message = `${row.name} isn't running`) : open(row.url)),
    f: (row) =>
      row.state === 'stopped'
        ? (message = `${row.name} isn't running`)
        : open(new URL('/', row.url).href),
    p: (row) => {
      const pr = prFor(row);
      return pr ? open(pr.url) : (message = `No pull request for ${row.branch ?? row.name}`);
    },
    c: (row) => {
      const pr = prFor(row);
      return pr
        ? open(`${pr.url}/checks`)
        : (message = `No pull request for ${row.branch ?? row.name}`);
    },
    l: showLog,
    s: (row) =>
      row.state === 'stopped' ? start(row) : (message = `${row.name} is already ${row.state}`),
    r: (row) => (row.state === 'stopped' ? start(row) : stop(row, () => start(row))),
    k: (row) =>
      row.state === 'stopped' ? (message = `${row.name} isn't running`) : (confirming = [row]),
  };

  return new Promise((resolve) => {
    const ignore = () => {};
    const timers = [
      setInterval(() => void refresh(), 2000),
      setInterval(() => void refreshPrs(), 60_000),
    ];

    const quit = () => {
      timers.forEach(clearInterval);
      prAbort.abort();
      stdin.off('keypress', onKey);
      // Starts and stops carry on without reporting back
      for (const { child } of jobs.values()) {
        child.stderr?.destroy();
        child.unref();
      }
      leave();
      stdout.off('resize', render);
      process.off('SIGINT', ignore);
      process.off('exit', leave);
      for (const signal of ['SIGTERM', 'SIGHUP'] as const) {
        process.off(signal, terminate);
      }
      resolve(rows);
    };
    // pnpm sends SIGTERM after a second Ctrl-C reaches it, e.g. from the log viewer
    const terminate = () => {
      leave();
      process.exit(1);
    };

    function onKey(_input: string | undefined, key: Key) {
      if (confirming.length > 0) {
        if (key.name === 'y') {
          confirming.forEach((row) => stop(row));
        }
        confirming = [];
        render();
        return;
      }
      message = '';
      const name = key.ctrl ? `ctrl-${key.name}` : key.name;
      const row = rows.find((candidate) => candidate.root === selected);
      const action = name && actions[name];
      if (name === 'q' || name === 'escape' || name === 'ctrl-c') {
        quit();
        return;
      } else if (name === 'up' || name === 'down') {
        const index = rows.findIndex((candidate) => candidate.root === selected);
        const next = Math.min(Math.max(index + (name === 'up' ? -1 : 1), 0), rows.length - 1);
        selected = rows[next]?.root;
      } else if (name === 'x') {
        confirming = mergedRunning();
        if (confirming.length === 0) {
          message = 'No running checkout has a merged pull request';
        }
      } else if (row && action) {
        const busy = jobs.get(row.root)?.state;
        if (busy && 'srk'.includes(name)) {
          message = `${row.name} is ${busy}`;
        } else {
          action(row);
        }
      }
      render();
    }

    emitKeypressEvents(stdin);
    stdin.on('keypress', onKey);
    stdout.on('resize', render);
    // The log viewer gets Ctrl-C, which also signals this process
    process.on('SIGINT', ignore);
    process.on('exit', leave);
    for (const signal of ['SIGTERM', 'SIGHUP'] as const) {
      process.on(signal, terminate);
    }
    enter();
    render();
    void refreshPrs();
  });
}
