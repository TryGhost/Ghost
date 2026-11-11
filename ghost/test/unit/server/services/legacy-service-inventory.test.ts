import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import ts from 'typescript';

const coreRoot = path.resolve(__dirname, '../../../..');
const servicesRoot = path.join(coreRoot, 'core/server/services');
const inventoryFile = 'legacy-service-inventory.yaml';
const metadata = ['README.md', inventoryFile];
// Working name of the section for standard services that still have something
// open. Rename it here and in the inventory file.
const standardSection = 'standard';
const facets = [
  'exports',
  'construction',
  'consumers',
  'startup',
  'lifetime',
  'configuration',
  'resources',
  'failures',
] as const;
const facet = z.enum(facets);
const description = z.string().trim().min(1);
const recordedContract = z
  .object({
    summary: description,
    sources: z.array(description).min(1),
    tests: z.array(description),
  })
  .strict();
const dependencyAssessment = z
  .object({
    complexity: z.enum(['straightforward', 'complex', 'not-applicable']),
    reason: description,
    preparation: z.array(description),
    reviewedAt: z.string().regex(/^[0-9a-f]{40}$/),
    sources: z.array(description).min(1),
  })
  .strict();
const migration = z
  .object({
    complexity: z.enum(['straightforward', 'complex', 'not-applicable']),
    modelImpact: z.enum(['fits', 'may-change', 'not-applicable']),
    dependencies: dependencyAssessment,
    reason: description,
    reviewedAt: z.string().regex(/^[0-9a-f]{40}$/),
    sources: z.array(description).min(1),
  })
  .strict();
const extraSchema = z
  .object({
    purpose: description,
    callers: z.array(description).min(1),
    timing: description,
    dependencies: z.array(description),
    failurePolicy: description,
    destination: description,
  })
  .strict();
const legacyEntry = z
  .object({
    kind: z.enum(['directory', 'file']),
    disposition: z.enum(['migrate', 'relocate', 'split', 'review']),
    // Boundary lint reports this service's violations without failing on them.
    dependencyChecks: z.literal('deferred').optional(),
    futureHome: description.optional(),
    status: z.enum(['pending', 'auditing', 'audited']),
    auditedAt: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .optional(),
    entryPoints: z.array(description).min(1),
    notes: description,
    migration,
    contracts: z.partialRecord(facet, recordedContract),
    unverified: z.array(facet),
    blockers: z.array(description),
  })
  .strict();
// What is still open for a service that already meets the standard.
const standardFields = ['extras', 'futureHome', 'lifecycle'];
const standardEntry = z
  .object({
    extras: z.record(description, extraSchema).optional(),
    futureHome: description.optional(),
    lifecycle: z.array(description).min(1).optional(),
  })
  .strict();
const inventorySchema = z
  .object({
    services: z.record(description, legacyEntry),
    [standardSection]: z.record(description, standardEntry),
  })
  .strict();

function assertFileWithin(root: string, relativePath: string) {
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  assert.ok(
    !path.isAbsolute(relativePath) && !relative.startsWith('..') && relative !== '',
    `Evidence must be inside ${root}: ${relativePath}`,
  );
  assert.ok(statSync(resolved).isFile(), `Expected a file: ${relativePath}`);
}

// Extract catalogue names only. Oxlint separately enforces the root's source shape.
function declaredExtras(fileName: string): string[] {
  const source = ts.createSourceFile(
    fileName,
    readFileSync(fileName, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const constants = new Map<string, ts.Expression>();
  let exported: ts.Expression | undefined;
  for (const statement of source.statements) {
    if (ts.isExportAssignment(statement)) {
      exported = statement.expression;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          constants.set(declaration.name.text, declaration.initializer);
        }
      }
    }
  }
  function resolve(
    expression: ts.Expression | undefined,
    seen = new Set<string>(),
  ): ts.Expression | undefined {
    if (!expression) {
      return;
    }
    if (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isTypeAssertionExpression(expression) ||
      ts.isSatisfiesExpression(expression) ||
      ts.isNonNullExpression(expression)
    ) {
      return resolve(expression.expression, seen);
    }
    if (!ts.isIdentifier(expression)) {
      return expression;
    }
    if (seen.has(expression.text)) {
      return;
    }
    seen.add(expression.text);
    return resolve(constants.get(expression.text), seen);
  }
  const initializer = resolve(exported);
  assert.ok(
    initializer && ts.isCallExpression(initializer),
    `Cannot read initializer arguments: ${fileName}`,
  );
  if (!initializer.arguments[2]) {
    return [];
  }
  const extras = resolve(initializer.arguments[2]);
  assert.ok(
    extras && ts.isObjectLiteralExpression(extras),
    `Cannot read declared extras: ${fileName}`,
  );
  return extras.properties
    .flatMap((property) =>
      property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        ? [property.name.text]
        : [],
    )
    .sort();
}

describe('legacy service inventory', function () {
  // Read metadata and source only: importing a service could construct resources or
  // require a database before its real owner has initialized it.
  const raw = yaml.load(readFileSync(path.join(servicesRoot, inventoryFile), 'utf8'));
  const inventory = inventorySchema.parse(raw);
  const legacy = inventory.services;
  const open = inventory[standardSection];
  const onDisk = readdirSync(servicesRoot, { withFileTypes: true }).filter(
    (item) => !metadata.includes(item.name),
  );
  // A service that is not listed as legacy must meet the standard.
  const standard = onDisk.filter((item) => !legacy[item.name]).map((item) => item.name);
  const isFile = (file: string) => statSync(file, { throwIfNoEntry: false })?.isFile() === true;

  it('requires everything that is not a legacy entry to be a directory with an index.ts root', function () {
    for (const name of metadata) {
      assertFileWithin(servicesRoot, name);
    }
    for (const item of onDisk) {
      if (!legacy[item.name]) {
        assert.ok(
          item.isDirectory() && isFile(path.join(servicesRoot, item.name, 'index.ts')),
          `${item.name} is not a legacy entry, so it must be a directory with an index.ts root`,
        );
      }
    }
  });

  it('lists only legacy entries that exist', function () {
    const kinds = new Map(
      onDisk.map((item) => [item.name, item.isDirectory() ? 'directory' : 'file']),
    );
    for (const [name, service] of Object.entries(legacy)) {
      assert.equal(
        kinds.get(name),
        service.kind,
        `Remove the legacy entry for ${name} or correct its kind`,
      );
    }
  });

  it(`records open items in ${standardSection} only for services that are not legacy`, function () {
    for (const name of Object.keys(open)) {
      assert.ok(!legacy[name], `${name} is a legacy entry; record its open items there`);
      assert.ok(standard.includes(name), `${name} is not a service directory`);
    }
  });

  it(`allows only ${standardFields.join(', ')} in ${standardSection}`, function () {
    const entries = (raw as Record<string, Record<string, object>>)[standardSection]!;
    for (const [name, fields] of Object.entries(entries)) {
      const keys = Object.keys(fields);
      assert.ok(keys.length > 0, `${name} has nothing open; remove the entry`);
      assert.deepEqual(
        keys.filter((key) => !standardFields.includes(key)),
        [],
        `${name} has fields that do not belong in ${standardSection}`,
      );
    }
  });

  for (const name of standard) {
    it(`${name} has exactly the catalogued extras`, function () {
      const extras = open[name]?.extras ?? {};
      assert.deepEqual(
        declaredExtras(path.join(servicesRoot, name, 'index.ts')),
        Object.keys(extras).sort(),
        'Catalogue every extra and remove stale catalogue entries',
      );
      for (const extra of Object.values(extras)) {
        for (const caller of extra.callers) {
          assertFileWithin(coreRoot, caller);
        }
      }
    });
  }

  for (const [name, service] of Object.entries(legacy)) {
    it(`${name} has valid evidence, migration assessment and explicit audit gaps`, function () {
      assert.equal(
        service.migration.complexity === 'not-applicable',
        service.migration.modelImpact === 'not-applicable',
        'Non-service entries must use not-applicable for both migration dimensions',
      );
      if (service.migration.complexity === 'not-applicable') {
        assert.equal(
          service.disposition,
          'relocate',
          'Only supporting code marked for relocation can skip migration assessment',
        );
      }
      if (service.migration.modelImpact === 'may-change') {
        assert.equal(
          service.migration.complexity,
          'complex',
          'An open model question requires a complex migration assessment',
        );
      }
      const dependencies = service.migration.dependencies;
      if (dependencies.complexity === 'not-applicable') {
        assert.equal(
          service.migration.complexity,
          'not-applicable',
          'Only confirmed non-services can skip dependency migration assessment',
        );
      }
      for (const source of dependencies.sources) {
        assertFileWithin(coreRoot, source);
      }
      for (const source of service.migration.sources) {
        assertFileWithin(coreRoot, source);
      }

      assert.equal(new Set(service.entryPoints).size, service.entryPoints.length);
      for (const entryPoint of service.entryPoints) {
        assert.ok(
          service.kind === 'file' ? entryPoint === name : entryPoint.startsWith(`${name}/`),
          `Entry point belongs to another root: ${entryPoint}`,
        );
        if (service.kind === 'directory') {
          assertFileWithin(path.join(servicesRoot, name), entryPoint.slice(name.length + 1));
        } else {
          assertFileWithin(servicesRoot, entryPoint);
        }
      }

      const recorded = Object.keys(service.contracts);
      assert.deepEqual(
        [...recorded, ...service.unverified].sort(),
        [...facets].sort(),
        'Every facet must be recorded or unverified, exactly once',
      );
      for (const contract of Object.values(service.contracts)) {
        assert.ok(contract);
        for (const source of contract.sources) {
          assertFileWithin(coreRoot, source);
        }
        for (const test of contract.tests) {
          assert.ok(test.startsWith('test/'), `Expected a test path: ${test}`);
          assertFileWithin(path.join(coreRoot, 'test'), test.slice('test/'.length));
        }
      }

      if (service.status === 'pending') {
        assert.equal(recorded.length, 0, 'Use auditing when evidence has been recorded');
      } else {
        assert.ok(recorded.length > 0, 'Audit status requires recorded evidence');
      }
      if (service.status === 'auditing') {
        assert.ok(service.unverified.length > 0, 'Use audited when all facets have been recorded');
      } else if (service.status === 'audited') {
        assert.equal(service.unverified.length, 0, 'Unverified facets block a complete audit');
      }
    });
  }
});
