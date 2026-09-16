/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test utilities mirroring ghost/core/test/utils createHbsResponse plus a
 * standard seam configuration over the default (stub) bindings.
 */
import _ from 'lodash';
import { createDefaultDeps, type DefaultDepsOptions } from '../../src/seam/defaults.ts';
import { configureRendererDeps, resetRendererDeps } from '../../src/seam/deps.ts';
import type { RendererDeps } from '../../src/seam/types.ts';

export const SITE_URL = 'http://localhost:2368/';

export const DEFAULT_SETTINGS_PAYLOAD = {
  title: 'Ghost',
  description: 'Thoughts, stories and ideas.',
  logo: null,
  icon: null,
  accent_color: '#FF1A75',
  cover_image: `${SITE_URL}content/images/2024/01/cover.png`,
  facebook: 'ghost',
  twitter: '@ghost',
  lang: 'en',
  locale: 'en',
  timezone: 'Etc/UTC',
  codeinjection_head: null,
  codeinjection_foot: null,
  navigation: [
    { label: 'Home', url: '/' },
    { label: 'About', url: '/about/' },
  ],
  secondary_navigation: [],
  meta_title: null,
  meta_description: null,
  og_image: null,
  og_title: null,
  og_description: null,
  twitter_image: null,
  twitter_title: null,
  twitter_description: null,
  members_enabled: true,
  paid_members_enabled: false,
  donations_enabled: false,
  recommendations_enabled: false,
  comments_enabled: 'off',
  labs: {},
  site_uuid: '4d3b8f2a-5c1e-4b9a-9f6d-1a2b3c4d5e6f',
  url: SITE_URL,
  version: '6.0',
};

export interface ConfigureTestDepsOptions extends Partial<DefaultDepsOptions> {
  settingsOverrides?: Record<string, any>;
  depsOverrides?: Partial<RendererDeps>;
}

export function configureTestDeps(options: ConfigureTestDepsOptions = {}): RendererDeps {
  const { settingsOverrides, depsOverrides, ...defaultsOptions } = options;
  const deps = createDefaultDeps({
    siteUrl: SITE_URL,
    key: 'testkey',
    settingsPayload: { ...DEFAULT_SETTINGS_PAYLOAD, ...settingsOverrides },
    ...defaultsOptions,
  });
  const merged = { ...deps, ...depsOverrides };
  configureRendererDeps(merged);
  return merged;
}

export function teardownTestDeps(): void {
  resetRendererDeps();
}

/**
 * Mirrors ghost/core/test/utils/index.js createHbsResponse — builds the
 * handlebars options object a helper receives.
 */
export function createHbsResponse({
  renderObject = {},
  templateOptions = {},
  locals = {},
  hash = {},
}: {
  renderObject?: Record<string, any>;
  templateOptions?: Record<string, any>;
  locals?: Record<string, any>;
  hash?: Record<string, any>;
} = {}): any {
  const hbsStructure = {
    data: {
      site: {},
      config: {},
      labs: {},
      root: {
        _locals: {},
      },
    },
    hash,
  };

  _.merge(hbsStructure.data, templateOptions);
  _.merge(hbsStructure.data.root, renderObject);
  _.merge(hbsStructure.data.root, locals);
  hbsStructure.data.root._locals = locals;

  return hbsStructure;
}
