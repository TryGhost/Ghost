import { describe, expect, it, vi } from 'vitest';
import type { Config } from '@tryghost/admin-x-framework/api/config';
import type { Setting } from '@tryghost/admin-x-framework/api/settings';
import type { SiteData } from '@tryghost/admin-x-framework/api/site';
import {
  type PostCardConfigPorts,
  type PostCardConfigSources,
  buildCardConfigPost,
  buildPostCardConfig,
  getCardVisibilitySettings,
} from './card-config';

const settingsFrom = (values: Record<string, Setting['value']>): Setting[] =>
  Object.entries(values).map(([key, value]) => ({ key, value }));

const baseSettings = {
  title: 'Test Site',
  description: 'Thoughts, stories and ideas.',
  unsplash: true,
  transistor: false,
  members_signup_access: 'all',
  stripe_connect_publishable_key: null,
  stripe_connect_secret_key: null,
  stripe_secret_key: null,
  stripe_publishable_key: null,
};

const config = { stripeDirect: false, klipy: { apiKey: null }, labs: {} } as Config;
const site = { url: 'https://example.com/blog', site_uuid: 'site-uuid' } as SiteData;
const owner = { roles: [{ name: 'Owner' }] } as const;
const contributor = { roles: [{ name: 'Contributor' }] } as const;
const unsplashHeaders = { Authorization: 'Client-ID test', 'X-Unsplash-Cache': true };

const ports: PostCardConfigPorts = {
  fetchEmbed: vi.fn(),
  fetchAutocompleteLinks: vi.fn(),
  searchLinks: vi.fn(),
  fetchLabels: vi.fn(),
  createSnippet: vi.fn(),
  deleteSnippet: vi.fn(),
};

const sources = (overrides: Partial<PostCardConfigSources> = {}): PostCardConfigSources => ({
  settings: settingsFrom(baseSettings),
  config,
  site,
  currentUser: owner,
  unsplashHeaders,
  pinturaConfig: null,
  post: buildCardConfigPost({ displayName: 'post', visibility: 'members' }, 'public'),
  snippets: [],
  ...overrides,
});

describe('buildCardConfigPost', () => {
  it('returns undefined without a post', () => {
    expect(buildCardConfigPost(undefined, 'public')).toBeUndefined();
  });

  it('narrows the post to the fields cards read', () => {
    expect(
      buildCardConfigPost(
        { displayName: 'page', showTitleAndFeatureImage: false, visibility: 'paid' },
        'public',
      ),
    ).toEqual({
      displayName: 'page',
      isPage: true,
      showTitleAndFeatureImage: false,
      visibility: 'paid',
    });
  });

  it('falls back to the site default visibility for an unsaved post', () => {
    expect(buildCardConfigPost({ displayName: 'post' }, 'members')).toEqual({
      displayName: 'post',
      isPage: false,
      showTitleAndFeatureImage: true,
      visibility: 'members',
    });
  });
});

describe('getCardVisibilitySettings', () => {
  it('restricts pages to web-only visibility', () => {
    expect(getCardVisibilitySettings({ isPage: true, displayName: 'page' })).toBe('web only');
    expect(getCardVisibilitySettings({ isPage: false, displayName: 'post' })).toBe('web and email');
    expect(getCardVisibilitySettings(undefined)).toBe('web and email');
  });
});

describe('buildPostCardConfig', () => {
  it('assembles the Ember editor card config', () => {
    const cardConfig = buildPostCardConfig(sources(), ports);

    expect(cardConfig).toMatchObject({
      unsplash: unsplashHeaders,
      klipy: null,
      pinturaConfig: null,
      renderLabels: true,
      feature: { transistor: false, paywallImprovements: false },
      deprecated: { headerV1: true },
      membersEnabled: true,
      siteTitle: 'Test Site',
      siteDescription: 'Thoughts, stories and ideas.',
      siteUrl: 'https://example.com/blog/',
      siteUuid: 'site-uuid',
      stripeEnabled: false,
      visibilitySettings: 'web and email',
      post: { displayName: 'post', isPage: false, visibility: 'members' },
      snippets: [],
    });
    expect(cardConfig.fetchEmbed).toBe(ports.fetchEmbed);
    expect(cardConfig.fetchAutocompleteLinks).toBe(ports.fetchAutocompleteLinks);
    expect(cardConfig.searchLinks).toBe(ports.searchLinks);
    expect(cardConfig.fetchLabels).toBe(ports.fetchLabels);
    expect(cardConfig.createSnippet).toBe(ports.createSnippet);
    expect(cardConfig.deleteSnippet).toBe(ports.deleteSnippet);
  });

  it('drops Unsplash when the integration is off', () => {
    const cardConfig = buildPostCardConfig(
      sources({ settings: settingsFrom({ ...baseSettings, unsplash: false }) }),
      ports,
    );

    expect(cardConfig.unsplash).toBeNull();
  });

  it('passes Klipy through only when an API key is configured', () => {
    const klipy = { apiKey: 'key', contentFilter: 'off' };
    const cardConfig = buildPostCardConfig(sources({ config: { ...config, klipy } }), ports);

    expect(cardConfig.klipy).toEqual(klipy);
  });

  it('hides labels from contributors', () => {
    const cardConfig = buildPostCardConfig(sources({ currentUser: contributor }), ports);

    expect(cardConfig.renderLabels).toBe(false);
  });

  it('reads feature flags from settings and labs', () => {
    const cardConfig = buildPostCardConfig(
      sources({
        settings: settingsFrom({ ...baseSettings, transistor: true }),
        config: { ...config, labs: { paywallImprovements: true } },
      }),
      ports,
    );

    expect(cardConfig.feature).toEqual({ transistor: true, paywallImprovements: true });
  });

  it('treats invite-only member signup as members disabled', () => {
    const cardConfig = buildPostCardConfig(
      sources({ settings: settingsFrom({ ...baseSettings, members_signup_access: 'invite' }) }),
      ports,
    );

    expect(cardConfig.membersEnabled).toBe(false);
  });

  it('reports Stripe as enabled from connect keys', () => {
    const cardConfig = buildPostCardConfig(
      sources({
        settings: settingsFrom({
          ...baseSettings,
          stripe_connect_publishable_key: 'pk',
          stripe_connect_secret_key: 'sk',
        }),
      }),
      ports,
    );

    expect(cardConfig.stripeEnabled).toBe(true);
  });

  it('limits pages to web-only card visibility', () => {
    const cardConfig = buildPostCardConfig(
      sources({ post: buildCardConfigPost({ displayName: 'page' }, 'public') }),
      ports,
    );

    expect(cardConfig.visibilitySettings).toBe('web only');
  });

  it('passes pintura and snippets through untouched', () => {
    const pinturaConfig = { jsUrl: 'https://cdn/pintura.js', cssUrl: 'https://cdn/pintura.css' };
    const snippets = [{ id: '1', name: 'Sign-off', value: '{"root":{}}' }];
    const cardConfig = buildPostCardConfig(sources({ pinturaConfig, snippets }), ports);

    expect(cardConfig.pinturaConfig).toBe(pinturaConfig);
    expect(cardConfig.snippets).toBe(snippets);
  });
});
