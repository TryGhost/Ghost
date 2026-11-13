import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import {
  knownViolationsFile,
  readDependencyBoundaries,
  readKnownViolations,
} from '../scripts/lib/dependency-boundaries.ts';
import { servicesRoot } from '../configs/oxlint/legacy-services.ts';

// Older versions of the file allowed fewer rule names, so read it loosely.
const entrySchema = z.object({ rule: z.string(), from: z.string(), to: z.string() });
type Entry = z.infer<typeof entrySchema>;

type Dependency = { module: string; resolved: string; dependencyTypes?: string[] };
type Graph = {
  modules: Array<{ source: string; dependencies: Dependency[] }>;
  summary: { violations: Array<{ from: string; to: string; unresolvedTo?: string }> };
};
type Move = { before: Entry; after: Entry; services: [string, string] };

export type Progress = {
  since: string;
  before: number;
  after: number;
  fixed: Entry[];
  allowed: Entry[];
  moved: Move[];
  deleted: Entry[];
  ruleChanged: Array<{ before: Entry; after: Entry }>;
  stillRejected: Entry[];
  added: Entry[];
  deferred: number;
};

const key = ({ rule, from, to }: Entry) => JSON.stringify([rule, from, to]);
const serviceOf = (file: string) =>
  file.startsWith(`${servicesRoot}/`) ? file.slice(servicesRoot.length + 1).split('/')[0]! : file;
const typeOnly = (dependency: Dependency) =>
  (dependency.dependencyTypes ?? []).length > 0 &&
  (dependency.dependencyTypes ?? []).every(
    (type) => type === 'type-only' || type === 'type-import',
  );

// Every known violation that disappeared since `before` lands in exactly one
// bucket, decided from the current scan and Git's rename detection:
// - moved: the importing file or its target was renamed and the same violation
//   is recorded at the new path (between services, this is a split);
// - ruleChanged: the same import is now recorded under another rule;
// - deleted: the importing file is gone and was not renamed;
// - stillRejected: the import is still rejected but no longer recorded, which
//   needs review because boundary lint should have failed;
// - allowed: the file still imports the target at runtime, so a rule changed;
// - fixed: the file no longer imports the target at runtime.
// New entries that pair with none of these are added, which needs review.
export function classifyProgress({
  since,
  before,
  after,
  graph,
  renames,
  deferred,
}: {
  since: string;
  before: Entry[];
  after: Entry[];
  graph: Graph;
  renames: Map<string, string>;
  deferred: number;
}): Progress {
  const afterKeys = new Set(after.map(key));
  const beforeKeys = new Set(before.map(key));
  const removed = before.filter((entry) => !afterKeys.has(key(entry)));
  const added = new Map(
    after.filter((entry) => !beforeKeys.has(key(entry))).map((entry) => [key(entry), entry]),
  );
  const modules = new Map(graph.modules.map((module) => [module.source, module]));
  // External packages are recorded by specifier and local files by path, so
  // match a current violation on either.
  const rejected = new Set(
    graph.summary.violations.flatMap(({ from, to, unresolvedTo }) =>
      [to, unresolvedTo]
        .filter((target) => target !== undefined)
        .map((target) => JSON.stringify([from, target])),
    ),
  );
  const progress: Progress = {
    since,
    before: before.length,
    after: after.length,
    fixed: [],
    allowed: [],
    moved: [],
    deleted: [],
    ruleChanged: [],
    stillRejected: [],
    added: [],
    deferred,
  };
  for (const entry of removed) {
    const from = renames.get(entry.from) ?? entry.from;
    const to = renames.get(entry.to) ?? entry.to;
    const movedTo = added.get(key({ rule: entry.rule, from, to }));
    if (movedTo && (from !== entry.from || to !== entry.to)) {
      added.delete(key(movedTo));
      progress.moved.push({
        before: entry,
        after: movedTo,
        services: [serviceOf(entry.from), serviceOf(from)],
      });
      continue;
    }
    const reclassified = [...added.values()].find(
      (candidate) => candidate.from === entry.from && candidate.to === entry.to,
    );
    if (reclassified) {
      added.delete(key(reclassified));
      progress.ruleChanged.push({ before: entry, after: reclassified });
      continue;
    }
    const module = modules.get(from);
    if (!module) {
      progress.deleted.push(entry);
      continue;
    }
    const stillImported = module.dependencies.some(
      (dependency) =>
        !typeOnly(dependency) && (dependency.module === to || dependency.resolved === to),
    );
    if (!stillImported) {
      progress.fixed.push(entry);
    } else if (rejected.has(JSON.stringify([from, to]))) {
      progress.stillRejected.push(entry);
    } else {
      progress.allowed.push(entry);
    }
  }
  progress.added = [...added.values()];
  return progress;
}

function git(repository: string, args: string[]) {
  const result = spawnSync('git', args, {
    cwd: repository,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed:\n${result.stderr.trim()}`);
  }
  return result.stdout;
}

// Renames between the base and the working tree, as Git detects them.
function readRenames(repository: string, since: string) {
  const renames = new Map<string, string>();
  const output = git(repository, ['diff', '--name-status', '-M', '--diff-filter=R', since, '--']);
  for (const line of output.split('\n')) {
    const [status, from, to] = line.split('\t');
    if (status?.startsWith('R') && from && to) {
      renames.set(from, to);
    }
  }
  return renames;
}

const usage = `Usage: pnpm gx services progress [--since <ref>] [--json]

Compares the known dependency violations at <ref> with the current checkout and
counts each one that disappeared as fixed, allowed by a rule change, moved,
deleted or recorded under another rule. Entries added since then are listed for
review. Services with deferred checks have no entries, so only their current
total is shown.

  --since <ref>  Starting commit (default: where this branch meets origin/main)
  --json         Print every entry by bucket as JSON
`;

const labels: Array<[keyof Progress, string]> = [
  ['fixed', 'Fixed'],
  ['allowed', 'Allowed by a rule change'],
  ['moved', 'Moved or split'],
  ['deleted', 'File deleted'],
  ['ruleChanged', 'Recorded under another rule'],
  ['stillRejected', 'Still rejected, not recorded'],
  ['added', 'Added'],
];

export function formatProgress(progress: Progress) {
  const rows = labels.map(([name, label]) => [label, String((progress[name] as unknown[]).length)]);
  const width = Math.max(...rows.map(([label]) => label!.length));
  const lines = [
    `Known violations since ${progress.since}: ${progress.before} → ${progress.after}`,
    '',
    ...rows.map(([label, count]) => `${label!.padEnd(width)}  ${count}`),
  ];
  const splits = progress.moved.filter(({ services: [from, to] }) => from !== to);
  if (splits.length) {
    lines.push('', 'Moved between services:');
    for (const { before, after, services } of splits) {
      lines.push(
        `- ${services[0]} → ${services[1]}: ${before.from} → ${after.from} (${before.to})`,
      );
    }
  }
  if (progress.stillRejected.length) {
    lines.push('', 'Still rejected but no longer recorded (needs review):');
    for (const entry of progress.stillRejected) {
      lines.push(`- ${entry.from} → ${entry.to} [${entry.rule}]`);
    }
  }
  if (progress.added.length) {
    lines.push('', 'Added (needs review):');
    for (const entry of progress.added) {
      lines.push(`- ${entry.from} → ${entry.to} [${entry.rule}]`);
    }
  }
  lines.push(
    '',
    `Services with deferred checks have ${progress.deferred} current violations, which the file does not track.`,
  );
  return `${lines.join('\n')}\n`;
}

export function runServicesProgress(args: string[]) {
  try {
    const { values } = parseArgs({
      args,
      options: {
        since: { type: 'string' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (values.help) {
      process.stdout.write(usage);
      return;
    }
    const repository = path.resolve(import.meta.dirname, '../..');
    const since = values.since ?? git(repository, ['merge-base', 'HEAD', 'origin/main']).trim();
    const before = z
      .array(entrySchema)
      .parse(JSON.parse(git(repository, ['show', `${since}:${knownViolationsFile}`])));
    const { graph, deferred } = readDependencyBoundaries(repository);
    const progress = classifyProgress({
      since: values.since ?? since.slice(0, 11),
      before,
      after: readKnownViolations(repository),
      graph,
      renames: readRenames(repository, since),
      deferred: deferred.length,
    });
    process.stdout.write(
      values.json ? `${JSON.stringify(progress, null, 2)}\n` : formatProgress(progress),
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
