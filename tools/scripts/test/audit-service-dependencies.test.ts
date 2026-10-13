import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import {
  collectServiceDependencyAudit,
  renderServiceDependencyReport,
} from '../audit-service-dependencies.ts';
import { SERVICES_ROOT } from '../lib/service-dependencies.ts';

test('scans every entry before joining inventory labels and retains all evidence', async (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ghost-service-audit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  put('ghost/core/shared/config.ts', 'export const enabled = true; export interface Unused {}');
  put(
    `${SERVICES_ROOT}/alpha/index.ts`,
    "import '../../../shared/config'; import 'missing-root-dependency';",
  );
  put(
    `${SERVICES_ROOT}/alpha/service.ts`,
    "import '../../../shared/config'; require('../../../shared/config'); import 'node:path'; import './test/helper'; export function load(name: string) { return require(name); }",
  );
  // Not imported by the root: scanning only reachable implementations would miss it.
  put(`${SERVICES_ROOT}/alpha/other.ts`, "import '../../../shared/config';");
  // Folder names must not conceal a helper used by service implementation.
  put(`${SERVICES_ROOT}/alpha/test/helper.ts`, "import '../../../../shared/config';");
  put(
    `${SERVICES_ROOT}/quiet/service.ts`,
    "import type {Unused} from '../../../shared/config'; export const quiet = true;",
  );
  mkdirSync(path.join(root, SERVICES_ROOT, 'empty'));
  put(`${SERVICES_ROOT}/move.js`, "require('node:os');");
  put(`${SERVICES_ROOT}/review/index.js`, "require('node:path'); require('./service');");
  put(`${SERVICES_ROOT}/review/service.ts`, 'export const ready = true;');
  put(`${SERVICES_ROOT}/new/service.ts`, "import 'node:path';");
  put(
    `${SERVICES_ROOT}/service-inventory.yaml`,
    JSON.stringify({
      services: {
        alpha: { kind: 'directory', disposition: 'retain', migrated: true },
        quiet: { kind: 'directory', disposition: 'retain' },
        empty: { kind: 'directory', disposition: 'retain' },
        'move.js': { kind: 'file', disposition: 'relocate' },
        review: { kind: 'directory', disposition: 'review' },
        gone: { kind: 'directory', disposition: 'retain' },
      },
    }),
  );

  const report = await collectServiceDependencyAudit(root);
  assert.deepEqual(
    report.summary,
    {
      entries: 6,
      entriesWithCandidates: 3,
      candidateRelationships: 6,
      unresolvedRelationships: 1,
      computedImports: 1,
    },
    JSON.stringify(
      report.entries.map(({ name, dependencies }) => ({ name, dependencies })),
      null,
      2,
    ),
  );
  assert.deepEqual(
    report.groups.map(({ key, entries, candidateRelationships }) => [
      key,
      entries,
      candidateRelationships,
    ]),
    [
      ['unmigrated', 2, 0],
      ['migrated', 1, 4],
      ['relocate', 1, 1],
      ['review', 1, 0],
      ['unlisted', 1, 1],
    ],
  );
  assert.deepEqual(report.inventoryOnlyEntries, ['gone']);
  const alpha = report.entries.find((entry) => entry.name === 'alpha');
  assert.ok(alpha);
  assert.equal(alpha.migrated, true);
  assert.deepEqual(alpha.targets, ['ghost/core/shared/config.ts', 'node:path']);
  assert.equal(alpha.affectedFiles.length, 3);
  assert.ok(
    alpha.dependencies
      .filter((dependency) => dependency.source.endsWith('/index.ts'))
      .every((dependency) => dependency.wiring),
  );
  assert.ok(
    alpha.dependencies
      .filter((dependency) => dependency.candidate)
      .every((dependency) => !dependency.wiring),
  );
  const review = report.entries.find((entry) => entry.name === 'review');
  assert.ok(review);
  assert.ok(review.dependencies.every((dependency) => dependency.wiring));
  assert.equal(
    review.dependencies.find((dependency) => dependency.specifier === './service')?.resolved,
    `${SERVICES_ROOT}/review/service.ts`,
  );
  assert.equal(
    alpha.dependencies.filter((dependency) => dependency.source.endsWith('/index.ts')).length,
    2,
  );
  assert.ok(
    alpha.dependencies
      .filter((dependency) => dependency.candidate)
      .every((dependency) => dependency.rules.length > 0),
  );
  assert.deepEqual(alpha.computedImports, [
    {
      source: `${SERVICES_ROOT}/alpha/service.ts`,
      line: 1,
      expression: 'require(name)',
    },
  ]);
  const quiet = report.entries.find((entry) => entry.name === 'quiet');
  assert.ok(quiet);
  assert.equal(quiet.dependencies[0]?.typeOnly, true);
  assert.equal(quiet.dependencies[0]?.candidate, false);
  assert.equal(quiet.dependencies[0]?.unresolved, false);
  assert.equal(
    alpha.dependencies.filter(
      (dependency) =>
        dependency.source.endsWith('/service.ts') && dependency.resolved.endsWith('/config.ts'),
    ).length,
    2,
  );
  assert.equal(report.entries.find((entry) => entry.name === 'new')?.migrated, null);
  assert.equal(report.entries.find((entry) => entry.name === 'new')?.disposition, null);
  assert.ok(
    alpha.dependencies.some(
      (dependency) =>
        dependency.specifier === './test/helper' && !dependency.candidate && !dependency.unresolved,
    ),
  );
  assert.ok(
    alpha.dependencies.some(
      (dependency) =>
        dependency.source === `${SERVICES_ROOT}/alpha/test/helper.ts` &&
        dependency.candidate &&
        dependency.target === 'ghost/core/shared/config.ts',
    ),
  );

  const markdown = renderServiceDependencyReport(report);
  assert.match(markdown, /6 candidate relationships across 3 of 6 entries/);
  assert.match(markdown, /\| empty \| 0 \| 0 \| 0 \|/);
  assert.match(markdown, /## Ownership under review/);
  assert.match(markdown, /## Supporting code to relocate/);
  assert.match(markdown, /## Missing inventory entries/);
  assert.ok(markdown.includes(`${SERVICES_ROOT}/alpha/other.ts`));
  assert.match(markdown, /missing-root-dependency/);
  assert.match(markdown, /require\(name\)/);
  assert.match(markdown, /not confirmed dependency-injection defects/);
  assert.deepEqual(JSON.parse(JSON.stringify(report)), report);
});

test('adjacent compiled output does not change source evidence or hide authored JavaScript', async (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ghost-service-audit-output-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  const sources = {
    'ghost/core/shared/config.ts': 'export const enabled = true;',
    [`${SERVICES_ROOT}/alpha/index.ts`]: "import './service.js';",
    [`${SERVICES_ROOT}/alpha/service.ts`]:
      "import '../../../shared/config.js'; import './helper'; export function load(name: string) { return require(name); }",
    [`${SERVICES_ROOT}/standalone.ts`]: "export {enabled} from '../../shared/config';",
  };
  for (const [file, content] of Object.entries(sources)) {
    put(file, content);
  }
  put(`${SERVICES_ROOT}/alpha/helper.js`, "module.exports = require('../../../shared/config.js');");
  put(
    `${SERVICES_ROOT}/service-inventory.yaml`,
    JSON.stringify({
      services: {
        alpha: { kind: 'directory', disposition: 'retain' },
        'standalone.ts': { kind: 'file', disposition: 'retain' },
      },
    }),
  );

  const before = await collectServiceDependencyAudit(root);
  assert.deepEqual(before.summary, {
    entries: 2,
    entriesWithCandidates: 2,
    candidateRelationships: 3,
    unresolvedRelationships: 0,
    computedImports: 1,
  });
  const alpha = before.entries.find((entry) => entry.name === 'alpha');
  assert.ok(alpha);
  assert.ok(
    alpha.dependencies.some(
      (dependency) => dependency.source.endsWith('/helper.js') && dependency.candidate,
    ),
  );
  assert.ok(
    alpha.dependencies.some(
      (dependency) =>
        dependency.specifier === './service.js' && dependency.resolved.endsWith('/service.ts'),
    ),
  );
  assert.ok(
    alpha.dependencies.some(
      (dependency) =>
        dependency.specifier === './helper' && dependency.resolved.endsWith('/helper.js'),
    ),
  );
  for (const [file, content] of Object.entries(sources)) {
    const compiled = ts.transpileModule(content, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    put(file.replace(/\.ts$/, '.js'), compiled.outputText);
  }

  assert.deepEqual(await collectServiceDependencyAudit(root), before);
});

test('CLI help describes the stdout formats and rejects unknown flags', () => {
  const script = path.resolve(import.meta.dirname, '../audit-service-dependencies.ts');
  const help = execFileSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
  assert.match(help, /pnpm audit:services \[--json\]/);
  assert.match(help, /all dependency evidence/);
  assert.throws(
    () => execFileSync(process.execPath, [script, '--not-an-option'], { stdio: 'pipe' }),
    /Command failed/,
  );
});
