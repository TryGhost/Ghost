import { describe, expect, it } from 'vitest';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { isDevelopmentApp, movedBetween, servedFrom } from './served-from';

const at = (manifestUrl: string, pageUrl: string) => ({
  manifest_url: manifestUrl,
  manifest: {
    surfaces: [{ type: 'admin_page', url: pageUrl }],
  } as AppManifest,
});

describe('servedFrom', () => {
  it('names the host the app’s page loads from', () => {
    const { manifest } = at(
      'https://cdn.example.net/app.json',
      'https://podcast.example.com/admin',
    );

    expect(servedFrom(manifest)).toBe('podcast.example.com');
    expect(isDevelopmentApp(manifest)).toBe(false);
  });

  it('marks an app served from the developer’s machine', () => {
    expect(
      isDevelopmentApp(at('http://localhost:5173/a.json', 'http://localhost:5173/').manifest),
    ).toBe(true);
  });
});

describe('movedBetween', () => {
  const approved = at('https://podcast.example.com/app.json', 'https://podcast.example.com/admin');

  it('is a move when the page runs on another host', () => {
    expect(
      movedBetween(
        approved,
        at('https://podcast.example.com/app.json', 'https://evil.example/admin'),
      ),
    ).toEqual({ from: 'podcast.example.com', to: 'evil.example' });
  });

  it('is a move when updates would be read from another host', () => {
    expect(
      movedBetween(
        approved,
        at('https://evil.example/app.json', 'https://podcast.example.com/admin'),
      ),
    ).toEqual({ from: 'podcast.example.com', to: 'evil.example' });
  });

  it('is not a move when only paths change on the same hosts', () => {
    expect(
      movedBetween(
        approved,
        at('https://podcast.example.com/v2/app.json', 'https://podcast.example.com/v2/'),
      ),
    ).toBeNull();
  });
});
