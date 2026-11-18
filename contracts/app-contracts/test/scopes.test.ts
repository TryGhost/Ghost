import { describe, expect, it } from 'vitest';

import { APP_RESOURCES, APP_SCOPES, APP_SCOPE_NAMES, isAppScopeName } from '../src/scopes.ts';

describe('the scope registry', () => {
  it('names each scope after its resource, which the registry has', () => {
    for (const name of APP_SCOPE_NAMES) {
      const { resource, wording } = APP_SCOPES[name];
      expect(name.split(':')[0], name).toBe(resource);
      expect(Object.keys(APP_RESOURCES)).toContain(resource);
      // A sentence that stands on its own.
      expect(wording, name).toMatch(/^[A-Z][^.]*\.$/);
    }
  });

  it('has no member scopes and nothing that hands out lasting access', () => {
    expect(
      APP_SCOPE_NAMES.filter((name) =>
        /^(?:member|webhook|theme|invite|role|setting|integration|redirect|route)/.test(name),
      ),
    ).toEqual([]);
    expect(APP_SCOPE_NAMES.filter((name) => name.startsWith('page:'))).toEqual([]);
  });

  it('knows its own names only', () => {
    expect(isAppScopeName('post:read')).toBe(true);
    expect(isAppScopeName('post:*')).toBe(false);
    expect(isAppScopeName('toString')).toBe(false);
    expect(isAppScopeName(undefined)).toBe(false);
  });
});
