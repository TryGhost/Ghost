import type { ICruiseResult } from 'dependency-cruiser';
import type { ServiceEntry } from './lib/service-dependencies.ts';
import { readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { cruise, getAvailableTranspilers } from 'dependency-cruiser';
import {
  SERVICES_ROOT,
  findComputedServiceImports,
  readServiceInventory,
  getServiceDependencyOptions,
  serviceDependencyResolveOptions,
  serviceDependencySourceExclusions,
  serviceDependencyRules,
} from './lib/service-dependencies.ts';

const groupNames = {
  unmigrated: 'Unmigrated retained services',
  migrated: 'Migrated services',
  relocate: 'Supporting code to relocate',
  review: 'Ownership under review',
  unlisted: 'Missing inventory entries',
};

type Group = keyof typeof groupNames;
type ComputedImport = ReturnType<typeof findComputedServiceImports>[number];

function uniqueRelationships<T extends { source: string; resolved: string }>(
  dependencies: T[],
): T[] {
  return [
    ...new Map(
      dependencies.map((dependency) => [
        JSON.stringify([dependency.source, dependency.resolved]),
        dependency,
      ]),
    ).values(),
  ];
}

export function buildServiceDependencyReport(
  names: string[],
  modules: ICruiseResult['modules'],
  computedImports: ComputedImport[],
  inventory: Record<string, ServiceEntry>,
) {
  const entries = [...names].sort().map((name) => {
    const label = inventory[name];
    const group: Group = !label
      ? 'unlisted'
      : label.disposition !== 'retain'
        ? label.disposition
        : label.migrated
          ? 'migrated'
          : 'unmigrated';
    const belongsToEntry = (source: string) =>
      source.startsWith(`${SERVICES_ROOT}/`) &&
      source.slice(SERVICES_ROOT.length + 1).split('/')[0] === name;
    const dependencies = modules
      .filter((module) => belongsToEntry(module.source))
      .flatMap((module) =>
        module.dependencies.map((dependency) => ({
          source: module.source,
          wiring:
            module.source === `${SERVICES_ROOT}/${name}/index.ts` ||
            (!label?.migrated && module.source === `${SERVICES_ROOT}/${name}/index.js`),
          specifier: `${dependency.protocol ?? ''}${dependency.module}`,
          target: dependency.module.startsWith('.')
            ? dependency.resolved
            : `${dependency.protocol ?? ''}${dependency.module}`,
          resolved: dependency.resolved,
          candidate: dependency.valid === false,
          unresolved: dependency.couldNotResolve,
          typeOnly:
            dependency.typeOnly === true ||
            dependency.dependencyTypes.some(
              (type) => type === 'type-only' || type === 'type-import',
            ),
          dependencyTypes: dependency.dependencyTypes,
          rules: (dependency.rules ?? []).map((rule) => rule.name).sort(),
        })),
      )
      .sort((a, b) => a.source.localeCompare(b.source) || a.specifier.localeCompare(b.specifier));
    const candidates = uniqueRelationships(
      dependencies.filter((dependency) => dependency.candidate),
    );
    return {
      name,
      disposition: label?.disposition ?? null,
      migrated: label ? label.migrated === true : null,
      group,
      candidateRelationships: candidates.length,
      targets: [...new Set(candidates.map((dependency) => dependency.target))].sort(),
      affectedFiles: [...new Set(candidates.map((dependency) => dependency.source))].sort(),
      dependencies,
      computedImports: computedImports.filter((item) => belongsToEntry(item.source)),
    };
  });
  const groups = Object.entries(groupNames).map(([key, title]) => {
    const members = entries.filter((entry) => entry.group === key);
    return {
      key,
      title,
      entries: members.length,
      candidateRelationships: members.reduce((sum, entry) => sum + entry.candidateRelationships, 0),
    };
  });
  return {
    schemaVersion: 1,
    scope: SERVICES_ROOT,
    summary: {
      entries: entries.length,
      entriesWithCandidates: entries.filter((entry) => entry.candidateRelationships > 0).length,
      candidateRelationships: entries.reduce((sum, entry) => sum + entry.candidateRelationships, 0),
      unresolvedRelationships: entries.reduce(
        (sum, entry) =>
          sum +
          uniqueRelationships(entry.dependencies.filter((dependency) => dependency.unresolved))
            .length,
        0,
      ),
      computedImports: computedImports.length,
    },
    groups,
    entries,
    inventoryOnlyEntries: Object.keys(inventory)
      .filter((name) => !names.includes(name))
      .sort(),
    limitations: [
      'Candidates are imports to review, not confirmed dependency-injection defects or estimates of migration effort.',
      'Counts are file-to-module relationships, not individual import statements. Zero candidates does not establish correct initialization or lifecycle ownership.',
      'Computed module paths are not resolved. Unresolved imports, globals and runtime state require manual review.',
      'Dependency-cruiser cannot distinguish type-only imports when resolution fails; unresolved candidates need source inspection.',
      'Imports outside the services directory are recorded but not traversed. TypeScript declarations and matching adjacent compiled JavaScript are excluded by the shared policy.',
    ],
  };
}

export type ServiceDependencyReport = ReturnType<typeof buildServiceDependencyReport>;

export async function collectServiceDependencyAudit(root: string) {
  root = realpathSync(root);
  if (
    !(await getAvailableTranspilers()).some(
      (parser) => parser.name === 'typescript' && parser.available,
    )
  ) {
    throw new Error(
      'TypeScript support is unavailable. Run pnpm bootstrap, then pnpm audit:services.',
    );
  }
  const excluded = new RegExp(serviceDependencySourceExclusions(root).join('|'));
  const discovered: Record<string, ServiceEntry> = Object.fromEntries(
    readdirSync(path.join(root, SERVICES_ROOT), { withFileTypes: true })
      .filter(
        (entry) =>
          !excluded.test(`${SERVICES_ROOT}/${entry.name}`) &&
          (entry.isDirectory() ||
            (entry.isFile() &&
              /\.[cm]?[jt]sx?$/.test(entry.name) &&
              !/\.d\.[cm]?ts$/.test(entry.name))),
      )
      .map((entry) => [
        entry.name,
        { kind: entry.isDirectory() ? 'directory' : 'file', disposition: 'review' },
      ]),
  );
  const result = await cruise(
    [SERVICES_ROOT],
    {
      ...getServiceDependencyOptions(root),
      baseDir: root,
      outputType: 'json',
      validate: true,
      ruleSet: { forbidden: serviceDependencyRules(discovered, 'all') },
    },
    serviceDependencyResolveOptions,
  );
  const graph: ICruiseResult =
    typeof result.output === 'string' ? JSON.parse(result.output) : result.output;
  const computedImports = findComputedServiceImports(root, discovered, 'all');
  return buildServiceDependencyReport(
    Object.keys(discovered),
    graph.modules,
    computedImports,
    readServiceInventory(root),
  );
}

export function renderServiceDependencyReport(report: ServiceDependencyReport): string {
  const { summary } = report;
  const lines = [
    '# Service dependency audit',
    '',
    `${summary.candidateRelationships} candidate relationships across ${summary.entriesWithCandidates} of ${summary.entries} entries.`,
    '',
    '| Inventory group | Entries | Candidate relationships |',
    '| --- | ---: | ---: |',
    ...report.groups.map(
      (group) => `| ${group.title} | ${group.entries} | ${group.candidateRelationships} |`,
    ),
  ];
  for (const group of report.groups) {
    const entries = report.entries.filter((entry) => entry.group === group.key);
    if (!entries.length) {
      continue;
    }
    lines.push(
      '',
      `## ${group.title}`,
      '',
      '| Entry | Relationships | Distinct targets | Files |',
      '| --- | ---: | ---: | ---: |',
    );
    for (const entry of entries) {
      lines.push(
        `| ${entry.name} | ${entry.candidateRelationships} | ${entry.targets.length} | ${entry.affectedFiles.length} |`,
      );
    }
    for (const entry of entries.filter((item) => item.candidateRelationships > 0)) {
      lines.push('', `### ${entry.name}`, '');
      for (const target of entry.targets) {
        const evidence = uniqueRelationships(
          entry.dependencies.filter(
            (dependency) => dependency.candidate && dependency.target === target,
          ),
        );
        lines.push(`- \`${target}\``);
        for (const dependency of evidence) {
          lines.push(
            `  - \`${dependency.source}\` imports \`${dependency.specifier}\`${dependency.unresolved ? ' (unresolved)' : ''}`,
          );
        }
      }
    }
  }
  lines.push(
    '',
    '## Static analysis gaps',
    '',
    `${summary.unresolvedRelationships} unresolved relationships; ${summary.computedImports} computed module loads.`,
  );
  for (const entry of report.entries) {
    for (const dependency of uniqueRelationships(
      entry.dependencies.filter((item) => item.unresolved),
    )) {
      lines.push(`- Unresolved: \`${dependency.source}\` imports \`${dependency.specifier}\``);
    }
    for (const item of entry.computedImports) {
      lines.push(`- Computed: \`${item.source}:${item.line}\` — \`\`${item.expression}\`\``);
    }
  }
  if (report.inventoryOnlyEntries.length) {
    lines.push(
      '',
      `Inventory entries absent from the scan: ${report.inventoryOnlyEntries.join(', ')}.`,
    );
  }
  lines.push('', ...report.limitations.map((limitation) => `- ${limitation}`), '');
  return lines.join('\n');
}

if (import.meta.main) {
  try {
    const { values } = parseArgs({
      options: { json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
    });
    if (values.help) {
      console.log(
        'Usage: pnpm audit:services [--json]\nPrint service dependency candidates grouped by inventory status. --json includes all dependency evidence.',
      );
    } else {
      const report = await collectServiceDependencyAudit(
        path.resolve(import.meta.dirname, '../..'),
      );
      console.log(
        values.json ? JSON.stringify(report, null, 2) : renderServiceDependencyReport(report),
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
