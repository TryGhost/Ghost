import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

// require, not import: this must resolve to the same CommonJS module instance
// the boot layer loads, so the uninitialised state below is the real pre-boot
// state and not a parallel ESM copy.
const memberJobs = require('../../../../../../core/server/services/members/jobs');

// Nothing initialises the module here, which is the state the guard exists
// for: a delivery that lands before boot has wired the tasks must fail loudly
// rather than reading undefined.
describe('member jobs: cleanup task guards', function () {
  it('fails a clean-tokens run before init()', function () {
    assert.throws(() => memberJobs.cleanTokens(), /Member jobs used before init\(\)/);
  });

  it('fails a clean-expired-comped run before init()', function () {
    assert.throws(() => memberJobs.cleanExpiredComped(), /Member jobs used before init\(\)/);
  });
});
