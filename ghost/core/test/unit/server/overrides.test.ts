import assert from 'node:assert/strict';
import luxon from 'luxon';
import '../../../core/server/overrides';

describe('Overrides', function () {
  it('sets global timezone to UTC', function () {
    assert.equal(luxon.DateTime.local().zoneName, 'UTC');
  });
});
