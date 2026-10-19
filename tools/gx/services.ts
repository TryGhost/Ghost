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
      }),
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
type Category =
  | 'Migrated'
  | 'Relocation candidate'
  | 'Ownership undecided'
  | 'Needs preparation'
  | 'Straightforward'
  | 'Not inventoried';

function category(entry?: Entry): Category {
  if (!entry) {
    return 'Not inventoried';
  }
  if (entry.migrated) {
    return 'Migrated';
  }
  if (entry.disposition === 'relocate') {
    return 'Relocation candidate';
  }
  if (entry.disposition === 'review') {
    return 'Ownership undecided';
  }
  return entry.migration.complexity === 'straightforward' &&
    entry.migration.dependencies?.complexity === 'straightforward' &&
    entry.migration.modelImpact === 'fits'
    ? 'Straightforward'
    : 'Needs preparation';
}

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
      category: category(entry),
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
    ['SERVICE', 'CATEGORY', 'DISALLOWED DEPS', 'UNRESOLVED', 'OWN ROOT'],
    rows.map((row) => [
      row.name,
      row.category,
      String(row.dependencies?.length ?? '?'),
      String(row.unresolved ?? '?'),
      String(row.ownRoot ?? '?'),
    ]),
  );
}

function summary(rows: Service[]) {
  const entries = rows.filter((row) => row.entry);
  const unmigrated = entries.filter((row) => !row.entry?.migrated);
  const retained = entries.filter((row) => row.entry?.disposition === 'retain');
  const count = (label: Category) => rows.filter((row) => row.category === label).length;
  return {
    'Catalogued entries': entries.length,
    'Retained services': retained.length,
    Migrated: count('Migrated'),
    'Unmigrated entries': unmigrated.length,
    'Unmigrated retained services': retained.filter((row) => !row.entry?.migrated).length,
    'Relocation candidates': count('Relocation candidate'),
    'Ownership undecided': count('Ownership undecided'),
    'Needs preparation': count('Needs preparation'),
    'Straightforward migrations': count('Straightforward'),
    'Straightforward — dependency violations': rows.filter(
      (row) => row.category === 'Straightforward' && row.findings.length,
    ).length,
    'Straightforward — no dependency violations': rows.filter(
      (row) => row.category === 'Straightforward' && row.analyzed && !row.findings.length,
    ).length,
    'Unmigrated entries with dependency violations': unmigrated.filter((row) => row.findings.length)
      .length,
    'Unmigrated retained services with dependency violations': unmigrated.filter(
      (row) => row.entry?.disposition === 'retain' && row.findings.length,
    ).length,
    'Migrated services with dependency violations': rows.filter(
      (row) => row.category === 'Migrated' && row.findings.length,
    ).length,
    'Not analyzed': rows.filter((row) => !row.analyzed).length,
    'Not inventoried': count('Not inventoried'),
  };
}

function details(row: Service) {
  const lines = [list([row])];
  if (row.entry) {
    const { migration, blockers, unverified } = row.entry;
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
      options: { json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
      allowPositionals: command === 'report',
    });
    if (values.help) {
      process.stdout.write(
        `Usage: pnpm gx services ${command}${command === 'report' ? ' [service]' : ''} [--json]\n`,
      );
      return;
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
      output = rows;
      text = list(rows);
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
      output = summary(rows);
      text = table(
        ['MIGRATION', 'COUNT'],
        Object.entries(summary(rows)).map(([label, count]) => [label, String(count)]),
      );
    }
    process.stdout.write(`${values.json ? JSON.stringify(output, null, 2) : text}\n`);
    if (!values.json && command !== 'dependencies') {
      process.stdout.write(
        '\nDependency counts are distinct disallowed targets; ? means not analyzed. Assessments do not establish test coverage or migration readiness.\n',
      );
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
