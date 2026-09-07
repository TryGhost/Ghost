import { beforeEach, describe, expect, it } from 'vitest';
import {
  getStoredFeatureFlagOverrides,
  syncFeatureFlagOverrides,
} from '../../../src/utils/feature-flag-overrides';

describe('feature flag overrides', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores flags listed in the labs query parameter', () => {
    expect(syncFeatureFlagOverrides('?labs=testFlag,secondFlag')).toEqual([
      'testFlag',
      'secondFlag',
    ]);
    expect(getStoredFeatureFlagOverrides()).toEqual(['testFlag', 'secondFlag']);
  });

  it('supports repeated labs query parameters', () => {
    expect(syncFeatureFlagOverrides('?labs=testFlag&labs=secondFlag')).toEqual([
      'testFlag',
      'secondFlag',
    ]);
  });

  it('uses stored overrides when the URL has no labs parameter', () => {
    syncFeatureFlagOverrides('?labs=testFlag');

    expect(syncFeatureFlagOverrides('?page=2')).toEqual(['testFlag']);
  });

  it('replaces stored overrides when the URL specifies new flags', () => {
    syncFeatureFlagOverrides('?labs=testFlag');

    expect(syncFeatureFlagOverrides('?labs=secondFlag')).toEqual(['secondFlag']);
    expect(getStoredFeatureFlagOverrides()).toEqual(['secondFlag']);
  });

  it('clears stored overrides for an empty labs parameter', () => {
    syncFeatureFlagOverrides('?labs=testFlag');

    expect(syncFeatureFlagOverrides('?labs=')).toEqual([]);
    expect(getStoredFeatureFlagOverrides()).toEqual([]);
  });

  it('ignores malformed stored overrides', () => {
    sessionStorage.setItem('ghost-admin:labs-overrides', '{invalid');

    expect(getStoredFeatureFlagOverrides()).toEqual([]);
  });
});
