import { describe, expect, it } from 'vitest';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { describeChanges } from './changes';

const manifest = (overrides: Partial<AppManifest> = {}): AppManifest => ({
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
  manifest_url: 'https://podcast.example.com/ghost-app.json',
  identity_key: { kty: 'OKP', crv: 'Ed25519', x: 'xQcVt_FXHEk7Uv4dKhUL2nR5DwwsLVW4pu2il-5sX_s' },
  backend_key: { kty: 'OKP', crv: 'Ed25519', x: 'H7aU67-okztSJD3-0znkVDiCU-izOI3I851CZX8XDyk' },
  development: false,
  ...overrides,
});

const approved = {
  manifest_url: 'https://podcast.example.com/ghost-app.json',
  manifest: manifest(),
};

describe('describeChanges', () => {
  it('shows each changed field before and after, with a label a publisher reads', () => {
    const reviewed = {
      manifest_url: approved.manifest_url,
      manifest: manifest({
        name: 'Podcasts',
        author: { name: 'Example', url: 'https://example.com/' },
      }),
    };

    expect(
      describeChanges(approved, reviewed, [
        { path: 'author.name', requires_approval: true },
        { path: 'name', requires_approval: true },
      ]),
    ).toEqual([
      {
        field: 'name',
        label: 'Name',
        before: 'Podcast',
        after: 'Podcasts',
        requiresApproval: true,
      },
      {
        field: 'author.name',
        label: 'Developer',
        before: 'Example Audio',
        after: 'Example',
        requiresApproval: true,
      },
    ]);
  });

  it('shows an app that moved as its new install link, and where its page runs', () => {
    const reviewed = {
      manifest_url: 'https://podcast.example.net/ghost-app.json',
      manifest: manifest({
        manifest_url: 'https://podcast.example.net/ghost-app.json',
        surfaces: [{ type: 'admin_page', url: 'https://podcast.example.net/admin' }],
      }),
    };

    expect(
      describeChanges(approved, reviewed, [
        { path: 'manifest_url', requires_approval: true },
        { path: 'surfaces[0].url', requires_approval: true },
      ]).map(({ label, before, after }) => [label, before, after]),
    ).toEqual([
      [
        'Install link',
        'https://podcast.example.com/ghost-app.json',
        'https://podcast.example.net/ghost-app.json',
      ],
      ['Page in Admin', 'https://podcast.example.com/admin', 'https://podcast.example.net/admin'],
    ]);
  });

  it('shows a switch to or from a development build', () => {
    const reviewed = { ...approved, manifest: manifest({ development: true }) };

    expect(
      describeChanges(approved, reviewed, [{ path: 'development', requires_approval: true }]).map(
        ({ label, before, after }) => [label, before, after],
      ),
    ).toEqual([['Development build', 'No', 'Yes']]);
  });

  // A publisher can't judge a key, and a new backend key applies without a review anyway.
  it('leaves out a new backend key', () => {
    const reviewed = {
      ...approved,
      manifest: manifest({
        backend_key: {
          kty: 'OKP',
          crv: 'Ed25519',
          x: 'Z_QKSqF5_5W5r2LfGwj1UyVOFyFew44-bMShKMwpCfo',
        },
      }),
    };

    expect(
      describeChanges(approved, reviewed, [{ path: 'backend_key.x', requires_approval: false }]),
    ).toEqual([]);
  });

  it('shows an icon as one change, whether it is named or served by the app', () => {
    const reviewed = {
      manifest_url: approved.manifest_url,
      manifest: manifest({ icon: { url: 'https://podcast.example.com/icon.svg' } }),
    };

    expect(
      describeChanges(approved, reviewed, [
        { path: 'icon.name', requires_approval: false },
        { path: 'icon.url', requires_approval: true },
      ]),
    ).toEqual([
      {
        field: 'icon',
        label: 'Icon',
        before: 'audio-lines',
        after: 'https://podcast.example.com/icon.svg',
        requiresApproval: true,
      },
    ]);
  });

  it('lists changes that need approval before those that do not', () => {
    const reviewed = {
      manifest_url: approved.manifest_url,
      manifest: manifest({ name: 'Podcasts', description: 'New words.' }),
    };

    expect(
      describeChanges(approved, reviewed, [
        { path: 'description', requires_approval: false },
        { path: 'name', requires_approval: true },
      ]).map(({ field, requiresApproval }) => [field, requiresApproval]),
    ).toEqual([
      ['name', true],
      ['description', false],
    ]);
  });

  it('shows a field Admin does not know yet by its name, as JSON', () => {
    const reviewed = {
      manifest_url: approved.manifest_url,
      manifest: { ...manifest(), cards: [{ name: 'player' }] } as AppManifest,
    };

    expect(
      describeChanges(approved, reviewed, [{ path: 'cards[0].name', requires_approval: true }]),
    ).toEqual([
      {
        field: 'cards',
        label: 'cards',
        before: null,
        after: '[{"name":"player"}]',
        requiresApproval: true,
      },
    ]);
  });
});
