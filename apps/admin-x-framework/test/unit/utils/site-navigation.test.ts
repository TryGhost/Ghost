import { describe, expect, it } from 'vitest';
import {
  getPageNavigationPlacement,
  pagePathForSlug,
  updatePageNavigation,
} from '../../../src/utils/site-navigation';

describe('shared page navigation', () => {
  it('uses aliases in bulk moves while preserving unrelated pages', () => {
    const result = updatePageNavigation(
      [
        { label: 'Home', url: '/home/' },
        { label: 'Custom', url: '/blog/about/' },
        { label: 'About', url: '/about/' },
      ],
      [],
      [
        { label: 'Home', path: '/' },
        { label: 'Custom', path: '/blog/about/' },
      ],
      'secondary',
      'https://example.com/blog/',
      { home: '/', custom: '/blog/about/' },
    );

    expect(result.navigation.map((item) => item.url)).toEqual(['/about/']);
    expect(result.secondaryNavigation.map((item) => item.url)).toEqual(['/home/', '/blog/about/']);
    expect(result.changed).toBe(true);
  });

  it('appends new pages without reordering pages already in the destination', () => {
    const result = updatePageNavigation(
      [
        { label: 'Home', url: '/' },
        { label: 'About', url: '/about/' },
        { label: 'Contact', url: '/contact/' },
      ],
      [],
      [
        { label: 'About', path: '/about/' },
        { label: 'Partners', path: '/partners/' },
      ],
      'primary',
      'https://example.com/',
    );

    expect(result.navigation.map((item) => item.label)).toEqual([
      'Home',
      'About',
      'Contact',
      'Partners',
    ]);
    expect(result.changed).toBe(true);
  });

  it('uses custom routes and falls back to slug URLs on older backends', () => {
    expect(pagePathForSlug('home', { home: '/' })).toBe('/');
    expect(pagePathForSlug('about', { about: '/company/' })).toBe('/company/');
    expect(pagePathForSlug('about')).toBe('/about/');
    expect(pagePathForSlug('about', {})).toBe('/about/');
    expect(pagePathForSlug('toString')).toBe('/toString/');
    expect(pagePathForSlug('')).toBeNull();
  });

  it.each([
    ['/about/', '/about/', 'primary'],
    ['http://example.com/blog/about/?ref=nav#top', '/about/', 'primary'],
    ['http://example.com/about/', '/about/', null],
    ['https://external.com/blog/about/', '/about/', null],
    ['http://example.com/blogger/about/', '/about/', null],
    ['/blog/about/', '/about/', null],
    ['/blog/about/', '/blog/about/', 'primary'],
    ['http://example.com/blog/blog/about/', '/blog/about/', 'primary'],
    ['http://example.com/blog/blog/about/', '/about/', null],
    ['/blog/', '/about/', null],
    ['http://example.com/blog/', '/blog/', null],
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

  it.each([undefined, 'not a URL'])(
    'matches only relative URLs without a valid site URL (%s)',
    (siteUrl) => {
      expect(
        getPageNavigationPlacement([{ label: 'About', url: '/about/' }], [], '/about/', siteUrl),
      ).toBe('primary');
      expect(
        getPageNavigationPlacement(
          [{ label: 'About', url: 'https://other.example/about/' }],
          [],
          '/about/',
          siteUrl,
        ),
      ).toBeNull();
    },
  );

  it.each(['https://example.com/', 'https://example.com/blog/'])(
    'recognizes, moves, and removes slug aliases on %s',
    (siteUrl) => {
      for (const url of ['/home/', `${siteUrl}home/`]) {
        const item = { label: 'Welcome', url };
        const pages = [{ label: 'Home', path: '/' }];
        const routes = { home: '/' };
        expect(getPageNavigationPlacement([item], [], '/', siteUrl, routes)).toBe('primary');
        expect(updatePageNavigation([item], [], pages, 'primary', siteUrl, routes).changed).toBe(
          false,
        );
        const moved = updatePageNavigation([item], [], pages, 'secondary', siteUrl, routes);
        expect(moved).toEqual({ navigation: [], secondaryNavigation: [item], changed: true });
        expect(
          getPageNavigationPlacement([], moved.secondaryNavigation, '/', siteUrl, routes),
        ).toBe('secondary');
        expect(
          updatePageNavigation([], moved.secondaryNavigation, pages, null, siteUrl, routes),
        ).toEqual({ navigation: [], secondaryNavigation: [], changed: true });
      }
    },
  );

  it.each(['primary', 'secondary', null] as const)(
    'preserves unrelated links when placing a nested custom route in %s',
    (placement) => {
      const unrelated = { label: 'About', url: '/about/' };
      const routes = { custom: '/blog/about/' };
      const siteUrl = 'https://example.com/blog/';
      const path = pagePathForSlug('custom', routes);
      const result = updatePageNavigation(
        [unrelated, { label: 'Custom', url: path! }],
        [],
        [{ label: 'Custom', path }],
        placement,
        siteUrl,
        routes,
      );
      expect(result.navigation).toContainEqual(unrelated);
      expect(
        getPageNavigationPlacement(
          result.navigation,
          result.secondaryNavigation,
          path,
          siteUrl,
          routes,
        ),
      ).toBe(placement);
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

  it.each(['Custom label', ''])(
    'moves matching entries without mutating inputs or losing metadata (label: "%s")',
    (label) => {
      const item = Object.freeze({
        label,
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
    },
  );

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
    const outsideSubdir = { label: 'Corporate About', url: 'https://example.com/about/' };
    const result = updatePageNavigation(
      [{ label: 'About', url: '/about/' }, external, outsideSubdir],
      [{ label: 'About', url: '/about/#top' }],
      [{ label: 'About', path: '/about/' }],
      null,
      'https://example.com/blog/',
    );
    expect(result).toEqual({
      navigation: [external, outsideSubdir],
      secondaryNavigation: [],
      changed: true,
    });
  });

  it('removes both a slug alias and its custom-route entry', () => {
    expect(
      updatePageNavigation(
        [{ label: 'Home', url: '/home/' }],
        [{ label: 'Home', url: '/' }],
        [{ label: 'Home', path: '/' }],
        null,
        undefined,
        { home: '/' },
      ),
    ).toEqual({ navigation: [], secondaryNavigation: [], changed: true });
  });

  it('stores new links relative to the site installation', () => {
    expect(
      updatePageNavigation(
        [],
        [],
        [{ label: 'About', path: pagePathForSlug('about') }],
        'primary',
        'https://example.com/blog/',
      ),
    ).toEqual({
      navigation: [{ label: 'About', url: '/about/' }],
      secondaryNavigation: [],
      changed: true,
    });
  });
});
