import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { globSync } from 'glob';
// @ts-expect-error transform is exported at runtime but missing from the published types
import { transform as I18nextTransform } from 'i18next-parser';
import { describe, it } from 'vitest';

const LOCALES_DIR = path.join(import.meta.dirname, '../locales');

// i18next-parser escapes non-printable Unicode (ZWNJ, NBSP, bidi marks) and
// formats through pushFile(); serialise with it so the oracle can't drift.
function serialise(filePath: string, catalog: unknown): string {
  const transform = new I18nextTransform({ indentation: 4, lineEnding: 'lf' });
  let output = '';
  transform.push = (file: { contents: Buffer }) => {
    output = file.contents.toString('utf8');
    return true;
  };
  transform.pushFile(filePath, catalog);
  return output;
}

describe('locale files match `pnpm translate` output', function () {
  for (const file of globSync('*/*.json', { cwd: LOCALES_DIR }).sort()) {
    it(file, function () {
      const source = fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8');
      assert.equal(
        serialise(file, JSON.parse(source)),
        source,
        `${file} differs from what i18next-parser writes; run \`pnpm --filter @tryghost/i18n translate\` and commit the result`,
      );
    });
  }
});
