import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import '../../../core/server/overrides';

const localRequire = createRequire(__filename);
const luxon = localRequire<typeof import('luxon')>('luxon');

describe('Overrides', function () {
  it('sets global timezone to UTC', function () {
    assert.equal(luxon.DateTime.local().zoneName, 'UTC');
  });
});
