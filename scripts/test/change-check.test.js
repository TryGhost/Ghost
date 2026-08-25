import { describe, it } from 'node:test';
import assert from 'node:assert';

import { buildIgnoreMatcher } from '../lib/git.js';
import { INTERNAL_DOCS_PATTERN } from '../lib/constants.js';

// The same matcher pathHasChanges builds, over paths as git reports them.
const PACKAGE_DIR = 'koenig/kg-utils';
const isIgnored = buildIgnoreMatcher(PACKAGE_DIR, [INTERNAL_DOCS_PATTERN]);

describe('INTERNAL_DOCS_PATTERN', () => {
  it('does not ignore the package README, which npm publishes', () => {
    assert.strictEqual(isIgnored(`${PACKAGE_DIR}/README.md`), false);
  });

  it('does not ignore a README in any casing npm would resolve', () => {
    for (const name of ['readme.md', 'Readme.md', 'ReadMe.md', 'READme.md', 'rEaDmE.md']) {
      assert.strictEqual(isIgnored(`${PACKAGE_DIR}/${name}`), false, name);
    }
  });

  it('ignores repo-only markdown', () => {
    for (const name of ['AGENTS.md', 'CLAUDE.md', 'CHANGELOG.md', 'docs/testing.md']) {
      assert.strictEqual(isIgnored(`${PACKAGE_DIR}/${name}`), true, name);
    }
  });

  it('ignores markdown at any depth', () => {
    assert.strictEqual(isIgnored(`${PACKAGE_DIR}/.claude/guide.md`), true);
  });

  it('does not ignore anything that is not markdown', () => {
    for (const name of ['package.json', 'lib/index.js', 'src/readme.ts']) {
      assert.strictEqual(isIgnored(`${PACKAGE_DIR}/${name}`), false, name);
    }
  });
});
