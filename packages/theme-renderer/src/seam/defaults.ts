/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Default seam binding: Content API over fetch + settings snapshot + copied
 * url-utils + documented stubs, assembled into a full RendererDeps.
 *
 * `createDefaultDeps` is synchronous over an already-loaded settings snapshot;
 * `loadDefaultDeps` performs the async settings fetch first (the only async
 * step — everything downstream of the seam is sync or placeholder-based).
 */
import _ from '../utils/lodash.ts';
import { createContentApi } from './content-api.ts';
import { createConfig } from './config.ts';
import { createSettingsCache, loadSettings, type SettingsSnapshot } from './settings.ts';
import { createUrlUtils, deduplicateSubdirectory } from './url-utils.ts';
import { createUrlService } from './url-service.ts';
import {
  canTransformToFormat,
  createAssetHash,
  createBlogIcon,
  createCardAssets,
  createGetRssUrl,
  createImageSizeCache,
  createIsInternalImage,
  createSimpleThemeI18n,
} from './stubs.ts';
import type { LoggingPort, RendererDeps } from './types.ts';

export interface DefaultDepsOptions {
  /** Site URL of the Ghost instance, e.g. http://localhost:2368/ */
  siteUrl: string;
  /** Content API key */
  key: string;
  /** Admin URL when it differs from the site URL */
  adminUrl?: string;
  fetch?: typeof globalThis.fetch;
  /** Plain config object (`:`-separated lookup) merged over sensible defaults */
  config?: Record<string, any>;
  /** Custom theme settings values (the `@custom` frame) */
  customThemeSettings?: Record<string, any>;
  /** The active theme's package.json `config.card_assets` value */
  cardAssetConfig?: any;
  logging?: LoggingPort;
  /** Settings payload override (skips the need for loadSettings in tests) */
  settingsPayload?: Record<string, any>;
}

const noopLogging: LoggingPort = {
  info() {
    /* no-op */
  },
  warn() {
    /* no-op */
  },
  error() {
    /* no-op */
  },
};

// Mirrors @tryghost/config-url-helpers getSiteUrl — the injected url is
// normalized once at the seam entry, always carrying a trailing slash.
function normalizeSiteUrl(siteUrl: string): string {
  if (!siteUrl.match(/\/$/)) {
    siteUrl += '/';
  }
  return siteUrl;
}

// Mirrors @tryghost/config-url-helpers getAdminUrl: trailing slash, site
// subdirectory appended, duplicate subdirectory removed. (The npm helper's
// deduplicateSubdirectory also collapses extraneous slashes first — done
// inline here because the url-utils copy of deduplicateSubdirectory,
// taken from @tryghost/url-utils, lacks that cleanup line.)
function normalizeAdminUrl(adminUrl: string | undefined, siteUrl: string): string | undefined {
  if (!adminUrl) {
    return undefined;
  }

  const subdirPathname = new URL(siteUrl).pathname;
  const subdir = subdirPathname === '/' ? '' : subdirPathname.replace(/\/$/, '');

  if (!adminUrl.match(/\/$/)) {
    adminUrl += '/';
  }

  adminUrl = `${adminUrl}${subdir}`;

  if (!adminUrl.match(/\/$/)) {
    adminUrl += '/';
  }

  adminUrl = adminUrl.replace(/(^|[^:])\/\/+/g, '$1/');
  adminUrl = deduplicateSubdirectory(adminUrl, siteUrl);
  return adminUrl;
}

export function createDefaultDeps(
  options: DefaultDepsOptions,
  snapshot?: SettingsSnapshot,
): RendererDeps {
  const resolvedSnapshot = snapshot ?? createSettingsCache(options.settingsPayload ?? {});
  const { settings, labs } = resolvedSnapshot;

  // Normalize the injected absolute URLs once, at the seam entry.
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const adminUrl = normalizeAdminUrl(options.adminUrl, siteUrl);

  const urlUtils = createUrlUtils({
    getSiteUrl: () => siteUrl,
    getAdminUrl: () => adminUrl,
  });

  const config = createConfig(
    _.merge(
      {
        url: siteUrl,
        // shared/config defaults.json caching:301:maxAge — permanent-redirect
        // Cache-Control (urlUtils.redirect301 / pretty-urls read it)
        caching: { 301: { maxAge: 31536000 } },
      },
      options.config,
    ),
  );

  const api = createContentApi({
    siteUrl,
    key: options.key,
    fetch: options.fetch,
  });

  const themeI18n = createSimpleThemeI18n();

  return {
    settings,
    labs,
    customThemeSettings: {
      getAll() {
        return options.customThemeSettings ?? {};
      },
    },
    config,
    settingsHelpers: {
      // Non-public server-side calculations — default to disabled and
      // let the embedder inject real answers (documented deltas).
      isWebAnalyticsEnabled: () => false,
      isStripeConnected: () => Boolean(settings.get('paid_members_enabled')),
    },
    urlUtils,
    urlService: createUrlService(urlUtils),
    api,
    assetHash: createAssetHash(),
    cardAssets: createCardAssets(options.cardAssetConfig),
    blogIcon: createBlogIcon({ settingsCache: settings, urlUtils }),
    imageSizeCache: createImageSizeCache(),
    themeI18n,
    themeI18next: themeI18n,
    logging: options.logging ?? noopLogging,
    misc: {
      // No internal-keys service outside the server: the injected
      // Content API key doubles as the frontend key (portal/search
      // script attributes) — documented delta.
      getFrontendKey: () => Promise.resolve(options.key),
      isInternalImage: createIsInternalImage(urlUtils),
      getRssUrl: createGetRssUrl(urlUtils),
      canTransformToFormat,
    },
  };
}

export async function loadDefaultDeps(options: DefaultDepsOptions): Promise<RendererDeps> {
  const snapshot = options.settingsPayload
    ? createSettingsCache(options.settingsPayload)
    : await loadSettings({
        siteUrl: normalizeSiteUrl(options.siteUrl),
        key: options.key,
        fetch: options.fetch,
      });
  return createDefaultDeps(options, snapshot);
}
