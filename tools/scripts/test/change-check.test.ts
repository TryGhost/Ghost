import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';

import { findPackagesNeedingChangeset } from '../lib/pnpm.ts';
import { INTERNAL_DOCS_PATTERN } from '../lib/constants.ts';
import { WorkspaceFixture } from './workspace-fixture.ts';

// pnpm's own matcher decides, so each case touches one file in its own package
// and a single `[since]` run reports which changes the pattern let through.
const IGNORED = [
  'AGENTS.md',
  'CHANGELOG.md',
  'docs/testing.md',
  '.claude/guide.md',
  'a.md',
  'abcde.md',
  'READMEs.md',
  'XEADME.md',
  'RXADME.md',
  'REXDME.md',
  'REAXME.md',
  'READXE.md',
  'READMX.md',
];
const KEPT = [
  // npm publishes the package README, in any casing it resolves
  'README.md',
  'readme.md',
  'Readme.md',
  'ReadMe.md',
  'rEaDmE.md',
  'package.json',
  'lib/index.js',
  'src/readme.ts',
  'src/page.mdx',
];

describe('INTERNAL_DOCS_PATTERN', () => {
  const cases = [...IGNORED, ...KEPT].map((file, i) => ({ file, name: `pkg-${i}` }));
  let reported: Set<string>;
  let fixture: WorkspaceFixture;

  before(async () => {
    fixture = new WorkspaceFixture({
      'pnpm-workspace.yaml': 'packages:\n  - packages/*\n',
      ...Object.fromEntries(
        cases.map(({ name }) => [`packages/${name}/package.json`, { name, version: '1.0.0' }]),
      ),
    });
    const base = fixture.commit('base');
    const head = fixture.commitOn(
      base,
      Object.fromEntries(
        cases.map(({ file, name }) => [
          `packages/${name}/${file}`,
          file === 'package.json' ? { name, version: '1.0.1' } : 'changed',
        ]),
      ),
    );
    const missing = await findPackagesNeedingChangeset(base, head, [INTERNAL_DOCS_PATTERN], {
      rootDir: fixture.dir,
    });
    reported = new Set(missing);
  });

  after(() => fixture.cleanup());

  it('ignores repo-only markdown at any depth', () => {
    for (const { file, name } of cases.filter((c) => IGNORED.includes(c.file))) {
      assert.strictEqual(reported.has(name), false, file);
    }
  });

  it('keeps the published README and everything that is not markdown', () => {
    for (const { file, name } of cases.filter((c) => KEPT.includes(c.file))) {
      assert.strictEqual(reported.has(name), true, file);
    }
  });
});
