import { describe, expect, it } from 'vitest';

import { APP_FAILURE_CODES, isAppFailureCode, isOutdatedReviewCode } from '../src/index.ts';

describe('APP_FAILURE_CODES', () => {
  it('puts each code in one set only', () => {
    expect(new Set(APP_FAILURE_CODES).size).toBe(APP_FAILURE_CODES.length);
  });

  it('is safe to look codes up by, unlike names every object has', () => {
    expect(isAppFailureCode('APP_NOT_INSTALLED')).toBe(true);
    expect(isAppFailureCode('constructor')).toBe(false);
    expect(isOutdatedReviewCode('APP_INSTALLATION_UNINSTALLED')).toBe(true);
    expect(isOutdatedReviewCode('APP_MANIFEST_INVALID')).toBe(false);
  });
});
