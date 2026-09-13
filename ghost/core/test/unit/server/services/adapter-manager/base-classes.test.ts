import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { baseClassPackages } from '../../../../../core/server/services/adapter-manager/base-classes';

const sourcePath = path.join(
  __dirname,
  '../../../../../core/server/services/adapter-manager/base-classes.ts',
);

describe('base-classes', function () {
  it('names exactly the packages the base classes are imported from', function () {
    // bin/validate-adapters.js fails a build when an adapter ships its own copy of
    // one of these, so a name drifting from the imports would silently stop
    // covering a base class. Both live in this file, so the imports win. (That
    // every type has an entry at all is the compiler's job, not this test's.)
    const source = fs.readFileSync(sourcePath, 'utf8');
    const imported = [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)';$/gm)]
      .map(([, specifier]) => specifier)
      .filter((specifier) => !specifier.startsWith('.'));

    assert.deepEqual(Object.values(baseClassPackages).sort(), imported.sort());
  });
});
