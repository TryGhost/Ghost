import { describe, it } from 'node:test';
import assert from 'node:assert';

import { checkInitScripts } from '../ci/check-migration-integrity.ts';

const INIT = 'ghost/core/server/data/migrations/init';

// `git diff --name-status -z` output.
function nameStatus(...entries: string[][]): string {
  return entries.map((fields) => fields.join('\0') + '\0').join('');
}

describe('checkInitScripts', () => {
  it('flags an added init script', () => {
    const error = checkInitScripts(nameStatus(['A', `${INIT}/3-backfill.ts`]));
    assert.match(error ?? '', /added ghost\/core\/server\/data\/migrations\/init\/3-backfill\.js/);
  });

  it('flags an added init script with a non-ASCII name', () => {
    const error = checkInitScripts(nameStatus(['A', `${INIT}/3-résumé.ts`]));
    assert.match(error ?? '', /added .*\/init\/3-résumé\.js/);
  });

  it('flags a deleted init script', () => {
    const error = checkInitScripts(nameStatus(['D', `${INIT}/2-create-fixtures.ts`]));
    assert.match(error ?? '', /removed .*\/init\/2-create-fixtures\.js/);
  });

  it('flags a rename to a new recorded name', () => {
    const error = checkInitScripts(
      nameStatus(['R100', `${INIT}/2-create-fixtures.ts`, `${INIT}/2-seed-fixtures.ts`]),
    );
    assert.match(error ?? '', /removed .*\/init\/2-create-fixtures\.js/);
    assert.match(error ?? '', /added .*\/init\/2-seed-fixtures\.js/);
  });

  it('flags an init script moved into a version folder', () => {
    const error = checkInitScripts(
      nameStatus([
        'R100',
        `${INIT}/2-create-fixtures.ts`,
        'ghost/core/server/data/migrations/versions/6.80/2-create-fixtures.ts',
      ]),
    );
    assert.match(error ?? '', /removed .*\/init\/2-create-fixtures\.js/);
  });

  it('passes a body edit', () => {
    assert.strictEqual(checkInitScripts(nameStatus(['M', `${INIT}/1-create-tables.ts`])), null);
  });

  it('passes a .js to .ts conversion, however git pairs the files', () => {
    assert.strictEqual(
      checkInitScripts(
        nameStatus(
          ['R085', `${INIT}/1-create-tables.js`, `${INIT}/2-create-fixtures.ts`],
          ['R090', `${INIT}/2-create-fixtures.js`, `${INIT}/1-create-tables.ts`],
        ),
      ),
      null,
    );
    assert.strictEqual(
      checkInitScripts(
        nameStatus(['D', `${INIT}/1-create-tables.js`], ['A', `${INIT}/1-create-tables.ts`]),
      ),
      null,
    );
  });

  it('ignores versioned migrations', () => {
    assert.strictEqual(
      checkInitScripts(nameStatus(['A', 'ghost/core/server/data/migrations/versions/6.80/x.ts'])),
      null,
    );
  });
});
