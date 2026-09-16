/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Default (stub) bindings for the seam ports that wrap filesystem or
 * server-only services in ghost/core. Each stub's rationale is documented in
 * docs/provenance.md.
 */
import type {
  AssetHashPort,
  BlogIconPort,
  CardAssetsPort,
  ImageSizeCachePort,
  SettingsPort,
  UrlUtilsPort,
} from './types.ts';

/**
 * Replaces frontend/services/asset-hash: content-based file hashing needs fs,
 * so `getHashForFile` returns null (asset-url.js then falls back to the
 * global hash) and the global hash is a stable constant instead of Ghost's
 * per-boot md5-of-timestamp.
 */
export function createAssetHash(globalHash = 'themerender'): AssetHashPort {
  return {
    getHashForFile() {
      return null;
    },
    clearCache() {
      // no cache to clear
    },
    globalHash,
  };
}

/**
 * Replaces frontend/services/assets-minification cardAssets (the `// BAD
 * REQUIRE` in ghost_head.js). Ghost decides whether cards.min.{js,css} exist
 * by minifying card assets according to the active theme's package.json
 * `config.card_assets`; the stub computes the same answer from that config
 * value without touching the filesystem:
 * - undefined/true → all cards included → files exist
 * - false → nothing included → no files
 * - {include: [...]} → files exist when the include list is non-empty
 * - {exclude: [...]} → files exist (Ghost ships ~20 cards; excluding some
 *   still leaves output) — an exclude list covering every card is a
 *   documented false-positive.
 */
export function createCardAssets(cardAssetConfig: any = true): CardAssetsPort {
  function hasAnyFile(): boolean {
    if (cardAssetConfig === false) {
      return false;
    }
    if (
      cardAssetConfig &&
      typeof cardAssetConfig === 'object' &&
      Array.isArray(cardAssetConfig.include)
    ) {
      return cardAssetConfig.include.length > 0;
    }
    return true;
  }

  return {
    hasFile() {
      return hasAnyFile();
    },
  };
}

// Minimal path.extname over URL-ish strings (replaces require('path') in blog-icon.js)
function extname(p: string): string {
  const base = p.split('/').pop() || '';
  const idx = base.lastIndexOf('.');
  return idx <= 0 ? '' : base.slice(idx);
}

/**
 * Copied from ghost/core/core/server/lib/image/blog-icon.js @ 407e032dc7
 * (getIconUrl/getIconType/getIconExt/getSourceIconExt only — getIconDimensions
 * & getIconPath need fs/image-size and are server-only). Transforms: class →
 * factory over {settingsCache, urlUtils}, `path.extname` → local extname.
 * Settings snapshot note: the Content API serves `icon` as an absolute URL;
 * urlFor({relativeUrl}) passes absolute inputs through unchanged, so the
 * resize-path replaces still apply correctly.
 */
export function createBlogIcon({
  settingsCache,
  urlUtils,
}: {
  settingsCache: SettingsPort;
  urlUtils: UrlUtilsPort;
}): BlogIconPort {
  function getIconExt(icon?: string): string {
    const blogIcon = icon || settingsCache.get('icon');

    // If the native format is supported, return the native format
    if (blogIcon.match(/.ico$/i)) {
      return 'ico';
    }

    if (blogIcon.match(/.jpe?g$/i)) {
      return 'jpeg';
    }

    if (blogIcon.match(/.png$/i)) {
      return 'png';
    }

    // Default to png for all other types
    return 'png';
  }

  function getIconType(icon?: string): string {
    const ext = getIconExt(icon);

    return ext === 'ico' ? 'x-icon' : ext;
  }

  function getSourceIconExt(icon?: string): string {
    const blogIcon = icon || settingsCache.get('icon');
    return extname(blogIcon).toLowerCase().substring(1);
  }

  function getIconUrl({
    absolute = false,
    fallbackToDefault = true,
  }: { absolute?: boolean; fallbackToDefault?: boolean } = {}): string | null {
    const blogIcon = settingsCache.get('icon');

    if (blogIcon) {
      // Resize + format icon to one of the supported file extensions
      const sourceExt = getSourceIconExt(blogIcon);
      const destintationExt = getIconExt(blogIcon);

      if (sourceExt === 'ico') {
        // Resize not supported (prevent a redirect)
        return urlUtils.urlFor({ relativeUrl: blogIcon }, absolute ? true : undefined);
      }

      if (sourceExt !== destintationExt) {
        const formattedIcon = blogIcon.replace(
          /\/content\/images\//,
          `/content/images/size/w256h256/format/${getIconExt(blogIcon)}/`,
        );
        return urlUtils.urlFor({ relativeUrl: formattedIcon }, absolute ? true : undefined);
      }

      const sizedIcon = blogIcon.replace(/\/content\/images\//, '/content/images/size/w256h256/');
      return urlUtils.urlFor({ relativeUrl: sizedIcon }, absolute ? true : undefined);
    }

    if (fallbackToDefault) {
      return urlUtils.urlFor({ relativeUrl: '/favicon.ico' }, absolute ? true : undefined);
    }

    return null;
  }

  return { getIconUrl, getIconType, getIconExt };
}

/**
 * Replaces server/lib/image cachedImageSizeFromUrl: probing image dimensions
 * needs storage/network access with Node streams. Returning null makes
 * meta/image-dimensions.js omit width/height (documented delta — og:image
 * dimension tags are absent from ghost_head output).
 */
export function createImageSizeCache(): ImageSizeCachePort {
  return {
    getCachedImageSizeFromUrl() {
      return Promise.resolve(null);
    },
  };
}

/**
 * Replaces server/adapters/storage/utils isInternalImage: the original asks
 * the storage adapter; the stub pattern-matches Ghost's content paths, which
 * is what the local storage adapter amounts to.
 */
export function createIsInternalImage(urlUtils: UrlUtilsPort) {
  return function isInternalImage(url: string): boolean {
    if (typeof url !== 'string') {
      return false;
    }
    const siteUrl = urlUtils.getSiteUrl();
    const contentPathRe = /\/content\/(images|media|files)\//;
    if (/^https?:\/\//.test(url)) {
      return url.startsWith(siteUrl) && contentPathRe.test(url);
    }
    return contentPathRe.test(url);
  };
}

/**
 * Replaces frontend/services/routing registry.getRssUrl: the registry walks
 * mounted collection routers; with the default single collection the index
 * RSS feed lives at /rss/. Documented delta for custom routes.yaml setups.
 */
export function createGetRssUrl(urlUtils: UrlUtilsPort) {
  return function getRssUrl(options: { absolute?: boolean } = {}): string {
    return urlUtils.urlFor({ relativeUrl: '/rss/' }, undefined, options.absolute);
  };
}

/**
 * Replaces @tryghost/image-transform canTransformToFormat (the package drags
 * sharp). List mirrors image-transform's supported output formats.
 */
export function canTransformToFormat(format: string): boolean {
  return ['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp'].includes(format);
}

/**
 * Simple `{var}` interpolating i18n port used as the default themeI18n /
 * themeI18next binding. Matches @tryghost/i18n's theme-namespace behavior when
 * no locale file exists: the key is the string, bindings interpolate into
 * single-brace placeholders. Real theme locale loading is injectable.
 */
export function createSimpleThemeI18n() {
  return {
    t(key: string, bindings?: Record<string, any>): string {
      if (!key) {
        return '';
      }
      if (!bindings) {
        return key;
      }
      return key.replace(/\{(\w+)\}/g, function (match, name) {
        return Object.prototype.hasOwnProperty.call(bindings, name)
          ? String(bindings[name])
          : match;
      });
    },
  };
}
