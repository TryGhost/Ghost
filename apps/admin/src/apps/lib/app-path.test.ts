import { describe, expect, it } from 'vitest';
import {
  appEntryPath,
  appFrameUrl,
  appPathFromLocation,
  appPathRoute,
  isAppLocation,
} from './app-path';

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

  it('returns the entry route for a part the URL parser would read as another site', () => {
    for (const pathname of [
      '/apps/abc/.//site.example/p/1234/',
      '/apps/abc/..//site.example/p/1234/',
      '/apps/abc/a/../..//site.example/',
      '/apps/abc/%2e//site.example/',
      '/apps/abc/%2E%2E//site.example/',
      '/apps/abc/./\\site.example/',
      '/apps/abc/.\t//site.example/',
      '/apps/abc/.\n//site.example/',
    ]) {
      expect(appPathFromLocation('abc', at(pathname), ENTRY), pathname).toBe(ENTRY);
    }
  });
});

describe('appFrameUrl', () => {
  const PAGE = 'https://app.example/admin';

  it('resolves the app’s route against its page', () => {
    for (const [path, url] of [
      ['/admin', PAGE],
      ['/', 'https://app.example/'],
      ['/episodes/12/notes/', 'https://app.example/episodes/12/notes/'],
      ['/search?q=a%20b&page=2', 'https://app.example/search?q=a%20b&page=2'],
      ['/tab#details', 'https://app.example/tab#details'],
      ['/search?next=//site.example/', 'https://app.example/search?next=//site.example/'],
      ['/%2F%2Fsite.example', 'https://app.example/%2F%2Fsite.example'],
      ['/caf%C3%A9', 'https://app.example/caf%C3%A9'],
    ]) {
      expect(appFrameUrl(PAGE, path), path).toBe(url);
    }
  });

  it('gives the app’s page for a route that resolves to another origin, or to nothing', () => {
    for (const path of [
      '//site.example/p/1234/',
      '/\\site.example/',
      '\\\\site.example/',
      '/\t/site.example/',
      'https://site.example/',
      'http://app.example/admin',
      '//',
    ]) {
      expect(appFrameUrl(PAGE, path), path).toBe(PAGE);
    }
  });

  it('only ever gives an address on the app’s origin for a route read from Admin’s URL', () => {
    for (const pathname of ['/apps/abc/.//site.example/p/1234/', '/apps/abc/episodes/12']) {
      const path = appPathFromLocation('abc', at(pathname), ENTRY);
      expect(new URL(appFrameUrl(PAGE, path)).origin, pathname).toBe('https://app.example');
    }
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
