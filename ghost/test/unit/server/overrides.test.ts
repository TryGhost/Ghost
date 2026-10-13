import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import '../../../core/server/overrides';

const localRequire = createRequire(__filename);
const luxon: typeof import('luxon') = localRequire('luxon');

describe('Overrides', function () {
  it('sets global timezone to UTC', function () {
    assert.equal(luxon.DateTime.local().zoneName, 'UTC');
  });
});
