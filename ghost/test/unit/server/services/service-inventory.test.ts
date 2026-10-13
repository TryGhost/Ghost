import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

const coreRoot = path.resolve(__dirname, '../../../..');
const servicesRoot = path.join(coreRoot, 'core/server/services');
const metadata = ['README.md', 'service-inventory.yaml'];
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
const migration = z
  .object({
    complexity: z.enum(['straightforward', 'complex', 'not-applicable']),
    modelImpact: z.enum(['fits', 'may-change', 'not-applicable']),
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
const entry = z
  .object({
    kind: z.enum(['directory', 'file']),
    disposition: z.enum(['retain', 'relocate', 'review']),
    status: z.enum(['pending', 'auditing', 'audited']),
    migrated: z.literal(true).optional(),
    extras: z.record(description, extraSchema).optional(),
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
const inventorySchema = z
  .object({
    exemplaryMigration: description,
    services: z.record(description, entry),
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

describe('service migration inventory', function () {
  // Read metadata only: importing the catalogue could construct resources or
  // require a database before a service's real owner has initialized it.
  const inventory = inventorySchema.parse(
    yaml.load(readFileSync(path.join(servicesRoot, 'service-inventory.yaml'), 'utf8')),
  );

  it('identifies a migrated service as the example to follow', function () {
    const example = inventory.services[inventory.exemplaryMigration];
    assert.ok(example, 'The exemplary migration must exist in the inventory');
    assert.equal(example.migrated, true, 'The example must use defineService');
  });

  it('accounts for every service directory and standalone file', function () {
    for (const name of metadata) {
      assertFileWithin(servicesRoot, name);
    }
    const actual = readdirSync(servicesRoot, { withFileTypes: true })
      .filter((item) => !metadata.includes(item.name))
      .map((item) => {
        assert.ok(item.isDirectory() || item.isFile(), `Unexpected entry kind: ${item.name}`);
        return [item.name, item.isDirectory() ? 'directory' : 'file'];
      })
      .sort(([a], [b]) => a.localeCompare(b));
    const expected = Object.entries(inventory.services)
      .map(([name, service]) => [name, service.kind])
      .sort(([a], [b]) => a.localeCompare(b));

    assert.deepEqual(actual, expected, 'Update the inventory when a service entry changes');
  });

  for (const [name, service] of Object.entries(inventory.services)) {
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
      if (service.migrated) {
        assert.notEqual(
          service.migration.complexity,
          'not-applicable',
          'A migrated service cannot be classified as a non-service',
        );
      }
      for (const extra of Object.values(service.extras ?? {})) {
        for (const caller of extra.callers) {
          assertFileWithin(coreRoot, caller);
        }
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
