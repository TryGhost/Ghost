import { describe, expect, it } from 'vitest';

import { isUnconfirmedAppCode } from '../../src/identity/index.ts';

describe('isUnconfirmedAppCode', () => {
  it('tells an app Ghost couldn’t confirm from one that is down or broken', () => {
    expect(isUnconfirmedAppCode('APP_IDENTITY_MISMATCH')).toBe(true);
    expect(isUnconfirmedAppCode('APP_MANIFEST_OUTDATED')).toBe(true);
    expect(isUnconfirmedAppCode('APP_CHALLENGE_UNREACHABLE')).toBe(false);
    expect(isUnconfirmedAppCode('APP_MANIFEST_INVALID')).toBe(false);
    expect(isUnconfirmedAppCode(undefined)).toBe(false);
  });
});
