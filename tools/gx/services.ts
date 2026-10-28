import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import yaml from 'js-yaml';
import { z } from 'zod';

const servicesRoot = 'ghost/core/server/services/';
const repository = path.resolve(import.meta.dirname, '../..');
const complexity = z.enum(['straightforward', 'complex', 'not-applicable']);
const assessment = z.object({
  complexity,
  reason: z.string(),
  reviewedAt: z.string(),
});
const inventorySchema = z.object({
  services: z.record(
    z.string(),
    z
      .object({
        migrated: z.boolean().optional(),
        disposition: z.enum(['retain', 'relocate', 'review']),
        notes: z.string().optional(),
        migration: assessment.extend({
          modelImpact: z.enum(['fits', 'may-change', 'not-applicable']),
          dependencies: assessment
            .extend({ preparation: z.array(z.string()).default([]) })
            .optional(),
        }),
        blockers: z.array(z.string()).default([]),
        unverified: z.array(z.string()).default([]),
      })
      .refine((entry) => entry.migrated || entry.migration.dependencies, {
        message: 'Unmigrated entries need a dependency assessment.',
      })
      .refine(
        (entry) =>
          entry.disposition === 'relocate' || entry.migration.modelImpact !== 'not-applicable',
        {
          message: 'Only supporting code marked for relocation can skip migration assessment.',
        },
      ),
  ),
});
const violation = z.object({
  from: z.string(),
  to: z.string(),
  unresolvedTo: z.string().optional(),
  dependencyTypes: z.array(z.string()).optional(),
  rule: z.object({ name: z.string() }),
});
const auditSchema = z.object({
  modules: z.array(z.object({ source: z.string(), couldNotResolve: z.boolean().optional() })),
  summary: z.object({ violations: z.array(violation) }),
});

type Entry = z.infer<typeof inventorySchema>['services'][string];
type MigrationStatus =
  | 'Migrated'
  | 'Needs preparation'
  | 'Straightforward'
  | 'Not applicable'
  | 'Not inventoried';

function migrationStatus(entry?: Entry): MigrationStatus {
  if (!entry) {
    return 'Not inventoried';
  }
  if (entry.migrated) {
    return 'Migrated';
  }
  if (entry.migration.modelImpact === 'not-applicable') {
    return 'Not applicable';
  }
  return entry.migration.complexity === 'straightforward' &&
    entry.migration.dependencies?.complexity === 'straightforward' &&
    entry.migration.modelImpact === 'fits'
    ? 'Straightforward'
    : 'Needs preparation';
}

const ownership = {
  retain: 'Staying in services/',
  relocate: 'Move or split planned',
  review: 'Ownership undecided',
} as const;

function entryName(source: string) {
  return source.startsWith(servicesRoot)
    ? source.slice(servicesRoot.length).split('/')[0]
    : undefined;
}

// The inventory supplies assessments; the existing audit supplies current findings.
export function buildServiceReport(inventory: unknown, audit: unknown) {
  const { services } = inventorySchema.parse(inventory);
  const graph = auditSchema.parse(audit);
  const analyzed = new Set(
    graph.modules
      .filter((module) => !module.couldNotResolve)
      .map((module) => entryName(module.source))
      .filter((name) => name !== undefined),
  );
  const findings = graph.summary.violations.filter((item) => item.rule.name.startsWith('service-'));
  const names = new Set([
    ...Object.keys(services),
    ...analyzed,
    ...findings.map((item) => entryName(item.from)).filter((name) => name !== undefined),
  ]);
  return [...names].sort().map((name) => {
    const entry = services[name];
    const matches = findings
      .filter((item) => entryName(item.from) === name)
      .map((item) => ({
        from: item.from,
        to: item.dependencyTypes?.some((type) => type.startsWith('npm'))
          ? (item.unresolvedTo ?? item.to)
          : item.to,
        rule: item.rule.name,
      }));
    const wasAnalyzed = analyzed.has(name);
    return {
      name,
      ownership: entry ? ownership[entry.disposition] : 'Not inventoried',
      migrationStatus: migrationStatus(entry),
      analyzed: wasAnalyzed,
      dependencies: wasAnalyzed
        ? [
            ...new Set(
              matches.filter((item) => item.rule === 'service-dependencies').map((item) => item.to),
            ),
          ].sort()
        : null,
      unresolved: wasAnalyzed
        ? matches.filter((item) => item.rule === 'service-unresolved').length
        : null,
      ownRoot: wasAnalyzed
        ? matches.filter((item) => item.rule === 'service-own-root').length
        : null,
      findings: matches,
      entry,
    };
  });
}

type Service = ReturnType<typeof buildServiceReport>[number];

function table(headers: string[], rows: string[][]) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  return [headers, ...rows]
    .map((row) =>
      row
        .map((cell, index) => cell.padEnd(widths[index] ?? 0))
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
}

function list(rows: Service[]) {
  return table(
    ['SERVICE', 'OWNERSHIP', 'MIGRATION', 'DISALLOWED DEPS', 'UNRESOLVED', 'OWN ROOT'],
    rows.map((row) => [
      row.name,
      row.ownership,
      row.migrationStatus,
      String(row.dependencies?.length ?? '?'),
      String(row.unresolved ?? '?'),
      String(row.ownRoot ?? '?'),
    ]),
  );
}

const groups: { name: string; label: string; matches: (row: Service) => boolean }[] = [
  { name: 'catalogued', label: 'Catalogued entries', matches: (row) => !!row.entry },
  {
    name: 'retained',
    label: 'Staying in services/',
    matches: (row) => row.entry?.disposition === 'retain',
  },
  { name: 'migrated', label: 'Migrated', matches: (row) => row.migrationStatus === 'Migrated' },
  {
    name: 'unmigrated',
    label: 'Unmigrated entries',
    matches: (row) => !!row.entry && !row.entry.migrated,
  },
  {
    name: 'unmigrated-retained',
    label: 'Unmigrated — staying in services/',
    matches: (row) => row.entry?.disposition === 'retain' && !row.entry.migrated,
  },
  {
    name: 'relocation',
    label: 'Move or split planned',
    matches: (row) => row.entry?.disposition === 'relocate',
  },
  {
    name: 'ownership-undecided',
    label: 'Ownership undecided',
    matches: (row) => row.entry?.disposition === 'review',
  },
  {
    name: 'migrated-retained',
    label: 'Migrated — staying in services/',
    matches: (row) => row.entry?.disposition === 'retain' && !!row.entry.migrated,
  },
  {
    name: 'needs-preparation',
    label: 'Needs preparation',
    matches: (row) =>
      row.entry?.disposition === 'retain' && row.migrationStatus === 'Needs preparation',
  },
  {
    name: 'straightforward',
    label: 'Straightforward migrations',
    matches: (row) =>
      row.entry?.disposition === 'retain' && row.migrationStatus === 'Straightforward',
  },
  {
    name: 'straightforward-with-violations',
    label: 'Straightforward — dependency violations',
    matches: (row) =>
      row.entry?.disposition === 'retain' &&
      row.migrationStatus === 'Straightforward' &&
      row.findings.length > 0,
  },
  {
    name: 'straightforward-clear',
    label: 'Straightforward — no dependency violations',
    matches: (row) =>
      row.entry?.disposition === 'retain' &&
      row.migrationStatus === 'Straightforward' &&
      row.analyzed &&
      !row.findings.length,
  },
  {
    name: 'unmigrated-with-violations',
    label: 'Unmigrated entries with dependency violations',
    matches: (row) => !!row.entry && !row.entry.migrated && row.findings.length > 0,
  },
  {
    name: 'unmigrated-retained-with-violations',
    label: 'Unmigrated — staying in services/ with dependency violations',
    matches: (row) =>
      row.entry?.disposition === 'retain' && !row.entry.migrated && row.findings.length > 0,
  },
  {
    name: 'migrated-with-violations',
    label: 'Migrated services with dependency violations',
    matches: (row) => row.migrationStatus === 'Migrated' && row.findings.length > 0,
  },
  { name: 'not-analyzed', label: 'Not analyzed', matches: (row) => !row.analyzed },
  {
    name: 'not-inventoried',
    label: 'Not inventoried',
    matches: (row) => !row.entry,
  },
];

function summary(rows: Service[]) {
  return Object.fromEntries(
    groups.map((group) => [group.label, rows.filter(group.matches).length]),
  );
}

function details(row: Service) {
  const lines = [list([row])];
  if (row.entry) {
    const { migration, notes, blockers, unverified } = row.entry;
    if (notes?.trim()) {
      lines.push(`\nInventory notes:\n${notes.trim()}`);
    }
    lines.push(
      `\nOverall assessment (${migration.complexity}, ${migration.reviewedAt}):\n${migration.reason.trim()}`,
    );
    if (migration.dependencies) {
      const deps = migration.dependencies;
      lines.push(
        `\nDependency assessment (${deps.complexity}, ${deps.reviewedAt}):\n${deps.reason.trim()}`,
      );
      if (deps.preparation.length) {
        lines.push(
          '\nRecorded preparation:',
          ...deps.preparation.map((item) => `- ${item.trim()}`),
        );
      }
    }
    if (blockers.length) {
      lines.push('\nRecorded blockers:', ...blockers.map((item) => `- ${item.trim()}`));
    }
    if (unverified.length) {
      lines.push(`\nUnverified contracts: ${unverified.join(', ')}`);
    }
  }
  lines.push('\nCurrent dependency findings:');
  if (row.findings.length) {
    for (const finding of row.findings) {
      lines.push(`- ${finding.from}\n  → ${finding.to} [${finding.rule}]`);
    }
  } else {
    lines.push(row.analyzed ? 'None found.' : 'Not analyzed; dependency counts are unknown.');
  }
  return lines.join('\n');
}

function frequencies(rows: Service[]) {
  const targets = new Map<string, Set<string>>();
  for (const row of rows) {
    for (const finding of row.findings.filter((item) => item.rule === 'service-dependencies')) {
      const files = targets.get(finding.to) ?? new Set<string>();
      files.add(finding.from);
      targets.set(finding.to, files);
    }
  }
  return [...targets]
    .map(([dependency, files]) => ({ dependency, files: files.size }))
    .sort((a, b) => b.files - a.files || a.dependency.localeCompare(b.dependency));
}

function readAudit() {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'depcruise',
      servicesRoot,
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'json',
    ],
    {
      cwd: repository,
      env: { ...process.env, GHOST_SERVICE_DEPENDENCY_AUDIT: '1' },
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Dependency audit failed (exit ${result.status}).`);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  const data: unknown = JSON.parse(result.stdout);
  auditSchema.parse(data);
  return { data, json: result.stdout };
}

export function runServices(command: string, args: string[]) {
  try {
    if (command === 'audit') {
      const help = args.includes('--help') || args.includes('-h');
      const result = spawnSync('pnpm', ['exec', 'depcruise-fmt', '-', ...args], {
        cwd: repository,
        input: help ? undefined : readAudit().json,
        stdio: ['pipe', 'inherit', 'inherit'],
      });
      if (result.error) {
        throw result.error;
      }
      process.exitCode = result.status ?? 1;
      return;
    }
    const { values, positionals } = parseArgs({
      args,
      options: {
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        ...(command === 'list' ? { group: { type: 'string' as const } } : {}),
      },
      allowPositionals: command === 'report',
    });
    if (values.help) {
      process.stdout.write(
        `Usage: pnpm gx services ${command}${command === 'report' ? ' [service]' : ''}${command === 'list' ? ' [--group <group>]' : ''} [--json]\n`,
      );
      if (command === 'list') {
        process.stdout.write(
          `\n${table(
            ['GROUP', 'DESCRIPTION'],
            groups.map((group) => [group.name, group.label]),
          )}\n`,
        );
      }
      return;
    }
    const group = groups.find((item) => item.name === values.group);
    if (values.group !== undefined && !group) {
      throw new Error(
        `Unknown group: ${values.group}. Use "pnpm gx services list --help" to see groups.`,
      );
    }
    if (positionals.length > 1) {
      throw new Error('Supply at most one service name.');
    }
    const inventory = inventorySchema.parse(
      yaml.load(
        readFileSync(path.join(repository, servicesRoot, 'service-inventory.yaml'), 'utf8'),
      ),
    );
    const rows = buildServiceReport(inventory, readAudit().data);
    const selected = positionals[0] ? rows.find((row) => row.name === positionals[0]) : undefined;
    if (positionals[0] && !selected) {
      throw new Error(`Unknown service: ${positionals[0]}`);
    }
    let output: unknown;
    let text: string;
    if (command === 'list') {
      const filtered = group ? rows.filter(group.matches) : rows;
      output = filtered;
      text = list(filtered);
    } else if (command === 'dependencies') {
      const counts = frequencies(rows);
      output = counts;
      text = table(
        ['FILES', 'DEPENDENCY'],
        counts.map((item) => [String(item.files), item.dependency]),
      );
    } else if (selected) {
      output = selected;
      text = details(selected);
    } else {
      const counts = summary(rows);
      output = counts;
      text = table(
        ['MIGRATION', 'COUNT', 'GROUP'],
        groups.map((item) => [item.label, String(counts[item.label]), item.name]),
      );
      text += '\n\nList a group: pnpm gx services list --group <group>';
    }
    process.stdout.write(`${values.json ? JSON.stringify(output, null, 2) : text}\n`);
    if (!values.json && (command === 'list' || selected)) {
      process.stdout.write(
        '\nDependency counts are distinct disallowed targets; ? means not analyzed. Assessments do not establish test coverage or migration readiness.\n',
      );
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
