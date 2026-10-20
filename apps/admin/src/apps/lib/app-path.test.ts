import { describe, expect, it } from 'vitest';
import { appEntryPath, appPathFromLocation, appPathRoute, isAppLocation } from './app-path';

const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });
const ENTRY = '/admin';

describe('appEntryPath', () => {
  it('is the path, query and fragment the app’s page is served from', () => {
    expect(appEntryPath('https://app.example/admin')).toBe('/admin');
    expect(appEntryPath('https://app.example')).toBe('/');
    expect(appEntryPath('https://app.example/ghost/?embed=1 x')).toBe('/ghost/?embed=1%20x');
  });
});

describe('appPathFromLocation', () => {
  it('reads the app’s route from the part of Admin’s URL after the app’s page', () => {
    expect(appPathFromLocation('abc', at('/apps/abc/episodes/12', '?tab=notes'), ENTRY)).toBe(
      '/episodes/12?tab=notes',
    );
    expect(appPathFromLocation('abc', at('/apps/abc/'), ENTRY)).toBe('/');
    expect(appPathFromLocation('abc', at('/apps/abc/', '?tab=notes'), ENTRY)).toBe('/?tab=notes');
  });

  it('reads the app’s page on its own as the entry route', () => {
    expect(appPathFromLocation('abc', at('/apps/abc'), ENTRY)).toBe(ENTRY);
  });

  it('returns the entry route for anything that isn’t a path the app could have reported', () => {
    expect(appPathFromLocation('abc', at('/apps/abc//evil.example/'), ENTRY)).toBe(ENTRY);
    expect(appPathFromLocation('abc', at('/apps/abcdef/episodes'), ENTRY)).toBe(ENTRY);
  });
});

describe('appPathRoute', () => {
  it('appends the app’s route to its page, and maps the entry route to the page itself', () => {
    expect(appPathRoute('abc', '/episodes/12', ENTRY)).toBe('/apps/abc/episodes/12');
    expect(appPathRoute('abc', ENTRY, ENTRY)).toBe('/apps/abc');
    expect(appPathRoute('abc', '/', ENTRY)).toBe('/apps/abc/');
    expect(appPathRoute('abc', '/?tab=notes', ENTRY)).toBe('/apps/abc/?tab=notes');
    expect(appPathRoute('abc', '/', '/')).toBe('/apps/abc');
  });

  it('reads back as the same route', () => {
    for (const path of ['/episodes/12', ENTRY, '/', '/?tab=notes', '/a#b']) {
      const route = new URL(appPathRoute('abc', path, ENTRY), 'https://admin.example');
      expect(appPathFromLocation('abc', route, ENTRY), path).toBe(path);
    }
  });
});

describe('isAppLocation', () => {
  it('matches the app’s page on any of its routes, and no other app’s page', () => {
    expect(isAppLocation('abc', at('/apps/abc'))).toBe(true);
    expect(isAppLocation('abc', at('/apps/abc/episodes/12'))).toBe(true);
    expect(isAppLocation('abc', at('/apps/abcdef'))).toBe(false);
    expect(isAppLocation('abc', at('/tags'))).toBe(false);
  });
});
