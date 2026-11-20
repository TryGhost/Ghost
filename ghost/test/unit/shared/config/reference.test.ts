import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildMarkdownReference,
  findUncoveredKeys,
} from '../../../../core/shared/config/reference';

const configDir = path.join(__dirname, '../../../../core/shared/config');

describe('Config reference', function () {
  it('REFERENCE.md is up to date with the schema', function () {
    const committed = fs.readFileSync(path.join(configDir, 'REFERENCE.md'), 'utf8');

    assert.equal(
      committed,
      buildMarkdownReference(),
      'Run `pnpm --filter ghost config:reference` and commit the result.',
    );
  });

  // The allowlist only shrinks: a key leaves it when it gains a schema, and a new key ships with one.
  it('every shipped top-level key has a schema, or is on the allowlist', function () {
    const allowlist: string[] = JSON.parse(
      fs.readFileSync(path.join(configDir, 'uncovered-keys.json'), 'utf8'),
    );
    const uncovered = findUncoveredKeys();

    const unlisted = uncovered.filter((key) => !allowlist.includes(key));
    const covered = allowlist.filter((key) => !uncovered.includes(key));

    assert.deepEqual(
      unlisted,
      [],
      `Add a schema for these keys in core/shared/config/schema/: ${unlisted.join(', ')}`,
    );
    assert.deepEqual(
      covered,
      [],
      `These keys have a schema now. Remove them from uncovered-keys.json: ${covered.join(', ')}`,
    );
  });
});
