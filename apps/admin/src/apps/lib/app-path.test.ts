import { describe, expect, it } from 'vitest';
import { appPathFromLocation, appPathRoute, isAppLocation } from './app-path';

const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

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

describe('isAppLocation', () => {
  it('is the app’s page on any of its routes, and no other app’s', () => {
    expect(isAppLocation('abc', at('/apps/abc'))).toBe(true);
    expect(isAppLocation('abc', at('/apps/abc/episodes/12'))).toBe(true);
    expect(isAppLocation('abc', at('/apps/abcdef'))).toBe(false);
    expect(isAppLocation('abc', at('/tags'))).toBe(false);
  });
});
