import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
import yaml from 'js-yaml';
import { z } from 'zod';
import { readDependencyBoundaries } from '../scripts/lib/dependency-boundaries.ts';
import {
  legacyInventoryFile,
  servicesRoot as servicesDir,
} from '../configs/oxlint/legacy-services.ts';

const servicesRoot = `${servicesDir}/`;
const repository = path.resolve(import.meta.dirname, '../..');
const complexity = z.enum(['straightforward', 'complex', 'not-applicable']);
const assessment = z.object({
  complexity,
  reason: z.string(),
  reviewedAt: z.string(),
});
// The inventory lists legacy services only. A service found by the audit and
// not listed here is standard.
const inventorySchema = z.object({
  services: z.record(
    z.string(),
    z
      .object({
        disposition: z.enum(['migrate', 'relocate', 'split', 'review']),
        futureHome: z.string().trim().min(1).optional(),
        notes: z.string().optional(),
        migration: assessment.extend({
          modelImpact: z.enum(['fits', 'may-change', 'not-applicable']),
          dependencies: assessment.extend({ preparation: z.array(z.string()).default([]) }),
        }),
        blockers: z.array(z.string()).default([]),
        unverified: z.array(z.string()).default([]),
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

// The boundary config records what each rejected dependency needs. One that
// matches nothing there has no decision yet.
const decisionsSchema = z.object({
  inject: z.array(z.string()),
  importForm: z.array(z.string()),
});
const kinds = [
  { name: 'inject', label: 'Instances to inject' },
  { name: 'import-form', label: 'Wrong import form' },
  { name: 'no-decision', label: 'No decision yet' },
] as const;
type Kind = (typeof kinds)[number]['name'];

type Entry = z.infer<typeof inventorySchema>['services'][string];
type MigrationStatus = 'Standard' | 'Needs preparation' | 'Straightforward' | 'Not applicable';

function migrationStatus(entry?: Entry): MigrationStatus {
  if (!entry) {
    return 'Standard';
  }
  if (entry.migration.modelImpact === 'not-applicable') {
    return 'Not applicable';
  }
  return entry.migration.complexity === 'straightforward' &&
    entry.migration.dependencies.complexity === 'straightforward' &&
    entry.migration.modelImpact === 'fits'
    ? 'Straightforward'
    : 'Needs preparation';
}

const ownership = {
  migrate: 'Migrate',
  relocate: 'Relocate',
  split: 'Split',
  review: 'Undecided',
} as const;

function entryName(source: string) {
  return source.startsWith(servicesRoot)
    ? source.slice(servicesRoot.length).split('/')[0]
    : undefined;
}

// The inventory supplies legacy assessments; the existing audit supplies the
// services found on disk and their current findings.
export function buildServiceReport(
  inventory: unknown,
  audit: unknown,
  decisions: unknown = { inject: [], importForm: [] },
) {
  const { services } = inventorySchema.parse(inventory);
  const graph = auditSchema.parse(audit);
  const { inject, importForm } = decisionsSchema.parse(decisions);
  const patterns: [Kind, RegExp[]][] = [
    ['inject', inject.map((pattern) => new RegExp(pattern))],
    ['import-form', importForm.map((pattern) => new RegExp(pattern))],
  ];
  const kindOf = (dependency: string): Kind =>
    patterns.find(([, matchers]) => matchers.some((matcher) => matcher.test(dependency)))?.[0] ??
    'no-decision';
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
      .map((item) => {
        const to = item.dependencyTypes?.some((type) => type.startsWith('npm'))
          ? (item.unresolvedTo ?? item.to)
          : item.to;
        return {
          from: item.from,
          to,
          rule: item.rule.name,
          // Only a rejected dependency has a kind; unresolved and own-root imports do not.
          ...(item.rule.name === 'service-dependencies' ? { kind: kindOf(to) } : {}),
        };
      });
    const wasAnalyzed = analyzed.has(name);
    return {
      name,
      ownership: entry ? ownership[entry.disposition] : 'Standard',
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
  { name: 'legacy', label: 'Legacy entries', matches: (row) => !!row.entry },
  { name: 'standard', label: 'Standard services', matches: (row) => !row.entry },
  {
    name: 'to-migrate',
    label: 'Left to migrate',
    matches: (row) => row.entry?.disposition === 'migrate',
  },
  {
    name: 'relocate',
    label: 'Relocate',
    matches: (row) => row.entry?.disposition === 'relocate',
  },
  {
    name: 'split',
    label: 'Split',
    matches: (row) => row.entry?.disposition === 'split',
  },
  {
    name: 'undecided',
    label: 'Undecided',
    matches: (row) => row.entry?.disposition === 'review',
  },
  {
    name: 'needs-preparation',
    label: 'Needs preparation',
    matches: (row) =>
      row.entry?.disposition === 'migrate' && row.migrationStatus === 'Needs preparation',
  },
  {
    name: 'straightforward',
    label: 'Straightforward migrations',
    matches: (row) =>
      row.entry?.disposition === 'migrate' && row.migrationStatus === 'Straightforward',
  },
  {
    name: 'straightforward-with-violations',
    label: 'Straightforward — dependency violations',
    matches: (row) =>
      row.entry?.disposition === 'migrate' &&
      row.migrationStatus === 'Straightforward' &&
      row.findings.length > 0,
  },
  {
    name: 'straightforward-clear',
    label: 'Straightforward — no dependency violations',
    matches: (row) =>
      row.entry?.disposition === 'migrate' &&
      row.migrationStatus === 'Straightforward' &&
      row.analyzed &&
      !row.findings.length,
  },
  {
    name: 'legacy-with-violations',
    label: 'Legacy entries with dependency violations',
    matches: (row) => !!row.entry && row.findings.length > 0,
  },
  {
    name: 'to-migrate-with-violations',
    label: 'Left to migrate with dependency violations',
    matches: (row) => row.entry?.disposition === 'migrate' && row.findings.length > 0,
  },
  {
    name: 'standard-with-violations',
    label: 'Standard services with dependency violations',
    matches: (row) => !row.entry && row.findings.length > 0,
  },
  { name: 'not-analyzed', label: 'Not analyzed', matches: (row) => !row.analyzed },
];

function summary(rows: Service[]) {
  return Object.fromEntries(
    groups.map((group) => [group.label, rows.filter(group.matches).length]),
  );
}

// Every rejected dependency is counted once, so the kinds add up to the total.
function violationSummary(rows: Service[]): Record<string, number> {
  const findings = rows.flatMap((row) => row.findings).filter((item) => item.kind);
  return {
    ...Object.fromEntries(
      kinds.map((kind) => [kind.label, findings.filter((item) => item.kind === kind.name).length]),
    ),
    Total: findings.length,
  };
}

function details(row: Service) {
  const lines = [list([row])];
  if (row.entry) {
    const { migration, futureHome, notes, blockers, unverified } = row.entry;
    if (futureHome) {
      lines.push(`\nSuggested future home (after this migration): ${futureHome}`);
    }
    if (notes?.trim()) {
      lines.push(`\nInventory notes:\n${notes.trim()}`);
    }
    lines.push(
      `\nOverall assessment (${migration.complexity}, ${migration.reviewedAt}):\n${migration.reason.trim()}`,
    );
    const deps = migration.dependencies;
    lines.push(
      `\nDependency assessment (${deps.complexity}, ${deps.reviewedAt}):\n${deps.reason.trim()}`,
    );
    if (deps.preparation.length) {
      lines.push('\nRecorded preparation:', ...deps.preparation.map((item) => `- ${item.trim()}`));
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
      lines.push(
        `- ${finding.from}\n  → ${finding.to} [${finding.rule}${finding.kind ? `, ${finding.kind}` : ''}]`,
      );
    }
  } else {
    lines.push(row.analyzed ? 'None found.' : 'Not analyzed; dependency counts are unknown.');
  }
  return lines.join('\n');
}

function frequencies(rows: Service[]) {
  const targets = new Map<string, { kind: Kind; files: Set<string> }>();
  for (const row of rows) {
    for (const finding of row.findings) {
      if (!finding.kind) {
        continue;
      }
      const target = targets.get(finding.to) ?? { kind: finding.kind, files: new Set<string>() };
      target.files.add(finding.from);
      targets.set(finding.to, target);
    }
  }
  return [...targets]
    .map(([dependency, { kind, files }]) => ({ dependency, files: files.size, kind }))
    .sort((a, b) => b.files - a.files || a.dependency.localeCompare(b.dependency));
}

function readAudit() {
  const { graph: data } = readDependencyBoundaries(repository);
  auditSchema.parse(data);
  return { data, json: JSON.stringify(data) };
}

function readDecisions() {
  const config: unknown = createRequire(import.meta.url)(
    path.join(repository, '.dependency-cruiser.cjs'),
  );
  const decisions = z.object({ serviceDependencyDecisions: decisionsSchema }).safeParse(config);
  if (!decisions.success) {
    throw new Error(
      '.dependency-cruiser.cjs must define serviceDependencyDecisions with inject and importForm pattern lists.',
    );
  }
  return decisions.data.serviceDependencyDecisions;
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
        ...(command === 'dependencies' ? { kind: { type: 'string' as const } } : {}),
      },
      allowPositionals: command === 'report',
    });
    if (values.help) {
      process.stdout.write(
        `Usage: pnpm gx services ${command}${command === 'report' ? ' [service]' : ''}${command === 'list' ? ' [--group <group>]' : ''}${command === 'dependencies' ? ' [--kind <kind>]' : ''} [--json]\n`,
      );
      if (command === 'dependencies') {
        process.stdout.write(
          `\n${table(
            ['KIND', 'DESCRIPTION'],
            kinds.map((kind) => [kind.name, kind.label]),
          )}\n`,
        );
      }
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
    const kind = kinds.find((item) => item.name === values.kind);
    if (values.kind !== undefined && !kind) {
      throw new Error(
        `Unknown kind: ${values.kind}. Use "pnpm gx services dependencies --help" to see kinds.`,
      );
    }
    if (positionals.length > 1) {
      throw new Error('Supply at most one service name.');
    }
    const inventory = inventorySchema.parse(
      yaml.load(readFileSync(path.join(repository, legacyInventoryFile), 'utf8')),
    );
    const rows = buildServiceReport(inventory, readAudit().data, readDecisions());
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
      const counts = frequencies(rows).filter((item) => !kind || item.kind === kind.name);
      output = counts;
      text = table(
        ['FILES', 'KIND', 'DEPENDENCY'],
        counts.map((item) => [String(item.files), item.kind, item.dependency]),
      );
    } else if (selected) {
      output = selected;
      text = details(selected);
    } else {
      const counts = summary(rows);
      const violations = violationSummary(rows);
      output = { ...counts, 'Dependency violations': violations };
      text = table(
        ['MIGRATION', 'COUNT', 'GROUP'],
        groups
          .filter((item) => item.name !== 'not-analyzed')
          .map((item) => [item.label, String(counts[item.label]), item.name]),
      );
      text += '\n\nList a group: pnpm gx services list --group <group>\n\n';
      text += table(
        ['DEPENDENCY VIOLATIONS', 'COUNT', 'KIND'],
        [
          ...kinds.map((item) => [item.label, String(violations[item.label]), item.name]),
          ['Total', String(violations.Total), ''],
        ],
      );
      text += '\n\nList a kind: pnpm gx services dependencies --kind <kind>';
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
