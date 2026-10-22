import * as assert from 'assert/strict';
import { formatDisplayDateWithRange } from '@/lib/ds-utils';

describe('formatDisplayDateWithRange', function () {
  // Ranges are day counts, today included: Last 90 days is 90, Last 12 months 365
  it('labels a span under 90 days by its date', function () {
    assert.ok(!formatDisplayDateWithRange('2026-03-02', 89).startsWith('Week of'));
  });

  it('labels a span of 90 days or more by week', function () {
    assert.match(formatDisplayDateWithRange('2026-03-02', 90), /^Week of /);
  });

  it('labels a span of 365 days or more by month and year', function () {
    assert.equal(formatDisplayDateWithRange('2026-03-02', 365), 'Mar 2026');
  });
});
