import { describe, expect, it } from 'vitest';

import {
  APP_RESOURCES,
  APP_SCOPES,
  APP_PERMISSION_KEYS,
  isAppPermissionKey,
} from '../src/scopes.ts';

describe('the scope registry', () => {
  it('names each scope after its resource, which the registry has', () => {
    for (const name of APP_PERMISSION_KEYS) {
      const { resource, wording } = APP_SCOPES[name];
      expect(name.split(':')[0], name).toBe(resource);
      expect(Object.keys(APP_RESOURCES)).toContain(resource);
      // A sentence that stands on its own.
      expect(wording, name).toMatch(/^[A-Z][^.]*\.$/);
    }
  });

  it('has no member scopes and nothing that hands out lasting access', () => {
    expect(
      APP_PERMISSION_KEYS.filter((name) =>
        /^(?:member|webhook|theme|invite|role|setting|integration|redirect|route)/.test(name),
      ),
    ).toEqual([]);
    expect(APP_PERMISSION_KEYS.filter((name) => name.startsWith('page:'))).toEqual([]);
  });

  it('knows its own names only', () => {
    expect(isAppPermissionKey('post:read')).toBe(true);
    expect(isAppPermissionKey('post:*')).toBe(false);
    expect(isAppPermissionKey('toString')).toBe(false);
    expect(isAppPermissionKey(undefined)).toBe(false);
  });
});
