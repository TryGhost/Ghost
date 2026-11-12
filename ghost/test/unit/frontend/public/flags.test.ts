import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CALLING_CODES } from '@tryghost/metafield-types/phone';
import config from '../../../../core/shared/config';

// Portal shows these flags and Admin draws the same countries' flags from Shade's
// country-flag-icons, so the copies here have to stay the same as the version Shade uses: one for
// every country a phone number can be from, and nothing else.
describe('Country flags', function () {
  it('has the flag Admin draws for every country a phone number can be from', function () {
    const source = path.join(
      path.dirname(require.resolve('country-flag-icons/package.json')),
      '3x2',
    );
    const folder = path.join(config.get('paths').publicFilePath, 'flags');
    const countries = Object.keys(CALLING_CODES).sort();

    assert.deepEqual(
      fs
        .readdirSync(folder)
        .map((file) => file.replace(/\.svg$/, ''))
        .sort(),
      countries,
    );
    for (const country of countries) {
      assert.equal(
        fs.readFileSync(path.join(folder, `${country}.svg`), 'utf8'),
        fs.readFileSync(path.join(source, `${country}.svg`), 'utf8'),
        `${country}.svg differs from country-flag-icons: run \`pnpm --filter ghost flags:copy\``,
      );
    }
  });
});
