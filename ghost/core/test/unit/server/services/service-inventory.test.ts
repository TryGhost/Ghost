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
const entry = z
  .object({
    kind: z.enum(['directory', 'file']),
    disposition: z.enum(['retain', 'relocate', 'review']),
    status: z.enum(['pending', 'auditing', 'audited']),
    entryPoints: z.array(description).min(1),
    notes: description,
    contracts: z.partialRecord(facet, recordedContract),
    unverified: z.array(facet),
    blockers: z.array(description),
  })
  .strict();
const inventorySchema = z
  .object({
    version: z.literal(1),
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
    it(`${name} has valid evidence and explicit audit gaps`, function () {
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
