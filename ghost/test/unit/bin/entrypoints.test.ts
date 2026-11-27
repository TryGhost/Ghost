import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Downstream hosting and image tooling runs these from installed trees; they can't be seen from this repo.
const SHIPPED_ENTRYPOINTS = ['generate-data.ts', 'validate-adapters.ts', 'warm-compile-cache.sh'];

const binDir = path.join(__dirname, '../../../bin');

/** Top-level files in bin/, skipping the README, declarations and tsc's emitted output. */
function entrypoints(): string[] {
  return fs
    .readdirSync(binDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name !== 'README.md' && !name.endsWith('.d.ts'))
    .filter(
      (name) =>
        !(name.endsWith('.js') && fs.existsSync(path.join(binDir, name.replace(/\.js$/, '.ts')))),
    );
}

describe('ghost/bin entrypoints', function () {
  it('match the shipped downstream contract', function () {
    assert.deepEqual(
      entrypoints().sort(),
      [...SHIPPED_ENTRYPOINTS].sort(),
      'ghost/bin entrypoints are run by downstream hosting and image tooling outside this repository. ' +
        'Add a new entrypoint to SHIPPED_ENTRYPOINTS. Never remove, rename or move one, or drop it ' +
        'from the list, to make this pass: stop and ask a maintainer to confirm those consumers first. ' +
        'See ghost/bin/README.md.',
    );
  });
});
