import { parseManifest } from './manifest';

const MANIFEST_URL = 'https://calendar.example/manifest.json';
const ADMIN_ORIGIN = 'https://site.example';

const valid = {
  name: 'Content calendar',
  description: 'See every scheduled and published post on a calendar.',
  icon: 'CalendarDays',
  url: './',
  surfaces: ['page'],
};

describe('parseManifest', () => {
  it('accepts a valid manifest and resolves relative URLs', () => {
    const result = parseManifest(valid, MANIFEST_URL, ADMIN_ORIGIN);

    expect(result).toEqual({
      ok: true,
      manifest: {
        name: 'Content calendar',
        description: 'See every scheduled and published post on a calendar.',
        icon: 'calendar-days',
        url: 'https://calendar.example/',
        surfaces: ['page'],
      },
    });
  });

  it('keeps the developer’s name and rejects one that’s too long', () => {
    const named = parseManifest({ ...valid, developer: ' Ghost ' }, MANIFEST_URL, ADMIN_ORIGIN);
    const tooLong = parseManifest(
      { ...valid, developer: 'x'.repeat(61) },
      MANIFEST_URL,
      ADMIN_ORIGIN,
    );

    expect(named.ok && named.manifest.developer).toBe('Ghost');
    expect(tooLong.ok).toBe(false);
  });

  it('rejects an icon Lucide doesn’t have, or an image URL', () => {
    expect(parseManifest({ ...valid, icon: 'not-an-icon' }, MANIFEST_URL, ADMIN_ORIGIN).ok).toBe(
      false,
    );
    expect(parseManifest({ ...valid, icon: './icon.svg' }, MANIFEST_URL, ADMIN_ORIGIN).ok).toBe(
      false,
    );
  });

  it('keeps a hex brand colour and rejects anything else', () => {
    const result = parseManifest({ ...valid, color: '#FA5D00' }, MANIFEST_URL, ADMIN_ORIGIN);
    expect(result.ok && result.manifest.color).toBe('#fa5d00');
    for (const color of ['orange', '#fa5d', 'rgb(250, 93, 0)', 42]) {
      expect(parseManifest({ ...valid, color }, MANIFEST_URL, ADMIN_ORIGIN).ok).toBe(false);
    }
  });

  it('allows plain HTTP only for local addresses', () => {
    const local = parseManifest(valid, 'http://localhost:5174/manifest.json', ADMIN_ORIGIN);
    const remote = parseManifest(valid, 'http://calendar.example/manifest.json', ADMIN_ORIGIN);

    expect(local.ok).toBe(true);
    expect(remote.ok).toBe(false);
  });

  it('rejects unknown fields and unsupported surfaces', () => {
    const result = parseManifest(
      { ...valid, scopes: ['posts'], surfaces: ['card'] },
      MANIFEST_URL,
      ADMIN_ORIGIN,
    );

    expect(result.ok).toBe(false);
    if (!result.ok && 'problems' in result) {
      expect(result.problems.map((problem) => problem.title)).toEqual([
        'Unknown field: scopes',
        'Unsupported surface: card',
      ]);
    }
  });

  it('accepts nav links inside the app and normalises their paths', () => {
    const result = parseManifest(
      {
        ...valid,
        nav: [
          { label: 'Week', path: '/week' },
          { label: 'Upcoming', path: '/a/../upcoming' },
        ],
      },
      MANIFEST_URL,
      ADMIN_ORIGIN,
    );

    expect(result.ok && result.manifest.nav).toEqual([
      { label: 'Week', path: '/week' },
      { label: 'Upcoming', path: '/upcoming' },
    ]);
  });

  it('rejects nav links that leave the app, repeat home, or run long', () => {
    const result = parseManifest(
      {
        ...valid,
        nav: [
          { label: 'Elsewhere', path: 'https://evil.example' },
          { label: 'Home', path: '/' },
          { label: 'A label that is far too long', path: '/long' },
        ],
      },
      MANIFEST_URL,
      ADMIN_ORIGIN,
    );

    expect(result.ok).toBe(false);
    if (!result.ok && 'problems' in result) {
      expect(result.problems).toHaveLength(3);
    }
  });

  it('rejects an app served from the same origin as Admin', () => {
    const result = parseManifest(
      { ...valid, url: 'https://site.example/app/' },
      MANIFEST_URL,
      ADMIN_ORIGIN,
    );

    expect(result.ok).toBe(false);
  });

  it('rejects something that is not a manifest', () => {
    expect(parseManifest([], MANIFEST_URL, ADMIN_ORIGIN).ok).toBe(false);
    expect(parseManifest({ surfaces: ['page'] }, MANIFEST_URL, ADMIN_ORIGIN).ok).toBe(false);
  });
});
