import { describe, expect, it } from 'vitest';
import {
  getPageNavigationPlacement,
  pagePathForSlug,
  updatePageNavigation,
} from '../../../src/utils/site-navigation';

describe('shared page navigation', () => {
  it('uses custom routes and falls back to slug URLs on older backends', () => {
    expect(pagePathForSlug('home', { home: '/' })).toBe('/');
    expect(pagePathForSlug('about')).toBe('/about/');
    expect(pagePathForSlug('toString')).toBe('/toString/');
    expect(pagePathForSlug('')).toBeNull();
  });

  it.each([
    ['/about/', '/about/', 'primary'],
    ['http://example.com/blog/about/?ref=nav#top', '/about/', 'primary'],
    ['http://example.com/about/', '/about/', null],
    ['https://external.com/blog/about/', '/about/', null],
    ['/blog/', '/', null],
    ['/blog/', '/blog/', 'primary'],
    ['http://example.com/blog/', '/', 'primary'],
  ] as const)(
    'matches %s against %s without conflating installation and page paths',
    (url, path, expected) => {
      expect(
        getPageNavigationPlacement([{ label: 'Item', url }], [], path, 'http://example.com/blog/'),
      ).toBe(expected);
    },
  );

  it('recognizes slug aliases but gives explicit custom-route destinations precedence', () => {
    const item = { label: 'Home', url: '/home/' };
    expect(getPageNavigationPlacement([item], [], '/', undefined, { home: '/' })).toBe('primary');
    expect(
      getPageNavigationPlacement([item], [], '/', undefined, { home: '/', other: '/home/' }),
    ).toBeNull();
    expect(
      getPageNavigationPlacement([item], [], '/home/', undefined, { home: '/', other: '/home/' }),
    ).toBe('primary');
  });

  it('moves matching entries without mutating inputs or losing metadata', () => {
    const item = Object.freeze({
      label: 'Custom label',
      url: '/home/?ref=nav',
      icon: 'house',
      visibility: 'members',
    });
    const primary = [item];
    const result = updatePageNavigation(
      primary,
      [],
      [{ label: 'Home', path: '/' }],
      'secondary',
      undefined,
      { home: '/' },
    );
    expect(result).toEqual({ navigation: [], secondaryNavigation: [item], changed: true });
    expect(primary).toEqual([item]);
    expect(result.secondaryNavigation[0]).not.toBe(item);
  });

  it('preserves order and references for no-op placement changes', () => {
    const primary = [
      { label: 'About', url: '/about/' },
      { label: 'Home', url: '/' },
    ];
    const secondary: [] = [];
    const result = updatePageNavigation(
      primary,
      secondary,
      [{ label: 'About', path: '/about/' }],
      'primary',
    );
    expect(result.changed).toBe(false);
    expect(result.navigation).toBe(primary);
    expect(result.secondaryNavigation).toBe(secondary);
  });

  it('removes all matching entries from both menus without removing external links', () => {
    const external = { label: 'Elsewhere', url: 'https://elsewhere.test/about/' };
    const result = updatePageNavigation(
      [{ label: 'About', url: '/about/' }, external],
      [{ label: 'About', url: '/about/#top' }],
      [{ label: 'About', path: '/about/' }],
      null,
    );
    expect(result).toEqual({ navigation: [external], secondaryNavigation: [], changed: true });
  });
});
