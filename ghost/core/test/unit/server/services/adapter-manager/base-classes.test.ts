import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  baseClasses,
  baseClassPackages,
} from '../../../../../core/server/services/adapter-manager/base-classes';

const sourcePath = path.join(
  __dirname,
  '../../../../../core/server/services/adapter-manager/base-classes.ts',
);

describe('base-classes', function () {
  it('lists exactly the packages the base classes are imported from', function () {
    // bin/validate-adapters.js fails a build when an adapter ships its own copy
    // of one of these, so the list drifting out of step with the imports would
    // silently stop covering a base class. Both live in this one file, so the
    // imports are the source of truth.
    const source = fs.readFileSync(sourcePath, 'utf8');
    const imported = [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)';$/gm)]
      .map(([, specifier]) => specifier)
      .filter((specifier) => !specifier.startsWith('.'));

    assert.deepEqual([...baseClassPackages], imported);
    assert.equal(baseClassPackages.length, Object.keys(baseClasses).length);
  });
});
