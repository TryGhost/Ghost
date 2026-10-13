import { describe, expect, it } from 'vitest';
import { appPathFromLocation, appPathRoute, normaliseAppPath } from './app-path';

const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

describe('normaliseAppPath', () => {
  it('spells a path as the URL parser does, so the same route compares equal', () => {
    expect(normaliseAppPath('/episodes/a b')).toBe('/episodes/a%20b');
    expect(normaliseAppPath('/episodes/a%20b')).toBe('/episodes/a%20b');
  });

  it('resolves `..` within the app, so a path can never climb out of it', () => {
    expect(normaliseAppPath('/../../settings')).toBe('/settings');
    expect(normaliseAppPath('/%2e%2e/settings?x=1#y')).toBe('/settings?x=1#y');
  });
});

describe('appPathFromLocation', () => {
  it('reads the app’s route from what follows its page in Admin’s address', () => {
    expect(appPathFromLocation('abc', at('/apps/abc/episodes/12', '?tab=notes'))).toBe(
      '/episodes/12?tab=notes',
    );
    expect(appPathFromLocation('abc', at('/apps/abc'))).toBe('/');
    expect(appPathFromLocation('abc', at('/apps/abc', '?tab=notes'))).toBe('/?tab=notes');
  });

  it('reads nothing that isn’t a path the app could have reported', () => {
    expect(appPathFromLocation('abc', at('/apps/abc//evil.example/'))).toBe('/');
    expect(appPathFromLocation('abc', at('/apps/abcdef/episodes'))).toBe('/');
  });
});

describe('appPathRoute', () => {
  it('puts the app’s route after its page, leaving the page itself for `/`', () => {
    expect(appPathRoute('abc', '/episodes/12')).toBe('/apps/abc/episodes/12');
    expect(appPathRoute('abc', '/')).toBe('/apps/abc');
    expect(appPathRoute('abc', '/?tab=notes')).toBe('/apps/abc?tab=notes');
  });
});
