import assert from 'node:assert/strict';
import { moment as legacyMoment } from '#kernel/clock';

// The kernel's own tests are in its package. This one needs Ghost: the instance the kernel
// shares is the one Ghost's overrides configure.
describe('Kernel clock in Ghost', function () {
  it('shares the legacy Moment instance configured by Ghost', function () {
    assert.equal(legacyMoment, require('moment-timezone'));
    assert.equal(legacyMoment('2026-10-13T12:00:00').format('Z'), '+00:00');
  });
});
