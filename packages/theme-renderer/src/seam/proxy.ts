/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The package's version of ghost/core/core/frontend/services/proxy.js —
 * everything the copied helpers/meta files require from the core of Ghost,
 * re-exported here as thin delegates over the configured RendererDeps.
 *
 * Delegation happens at call time (never at import time) so copied modules can
 * be imported before `configureRendererDeps()` runs — mirroring how Ghost's
 * proxy resolves its singletons lazily during boot.
 */
import sanitizeHtml from 'sanitize-html';
import socialUrlsPkg from '@tryghost/social-urls';
import {getRendererDeps} from './deps.ts';
import {withPayloadOwnershipAssertion} from './payload-ownership.ts';
import {SafeString} from './handlebars-env.ts';
import type {ApiBrowseOptions} from './types.ts';

export const getFrontendKey = async (): Promise<string | null> => {
    return getRendererDeps().misc.getFrontendKey();
};

/**
 * Section two: data manipulation
 * Stuff that modifies API data (SDK layer)
 */
export const socialUrls = socialUrlsPkg;

export const blogIcon = {
    getIconUrl(options?: {absolute?: boolean; fallbackToDefault?: boolean}) {
        return getRendererDeps().blogIcon.getIconUrl(options);
    },
    getIconType(icon?: string) {
        return getRendererDeps().blogIcon.getIconType(icon);
    },
    getIconExt(icon?: string) {
        return getRendererDeps().blogIcon.getIconExt(icon);
    }
};

export const cachedImageSizeFromUrl = {
    getCachedImageSizeFromUrl(url: string) {
        return getRendererDeps().imageSizeCache.getCachedImageSizeFromUrl(url);
    }
};

export function isInternalImage(url: string): boolean {
    return getRendererDeps().misc.isInternalImage(url);
}

// Used by router service and {{get}} helper to prepare data for optimal usage in themes
// (body copied from proxy.js prepareContextResource — sanitize-html over
// DOMPurify for the same reason as upstream: DOMPurify needs a DOM)
export function prepareContextResource(data: any): void {
    (Array.isArray(data) ? data : [data]).forEach((resource) => {
        // feature_image_caption contains HTML, making it a SafeString spares theme devs from triple-curlies
        if (resource.feature_image_caption) {
            const sanitizedCaption = sanitizeHtml(resource.feature_image_caption, {
                allowedTags: ['a', 'b', 'i', 'span'],
                allowedAttributes: {'*': ['href', 'style']}
            });
            resource.feature_image_caption = new SafeString(sanitizedCaption);
        }

        // some properties are extracted to local template data to force one way of using it
        delete resource.show_title_and_feature_image;
    });
}

/**
 * Section three: Core API
 * Parts of Ghost core that the frontend currently needs
 */

// Config! Keys used:
// isPrivacyDisabled & referrerPolicy used in ghost_head
export const config = {
    get(key: string) {
        return getRendererDeps().config.get(key);
    },
    isPrivacyDisabled(key: string) {
        return getRendererDeps().config.isPrivacyDisabled(key);
    }
};

export const settingsCache = {
    get(key: string) {
        return getRendererDeps().settings.get(key);
    },
    getPublic() {
        return getRendererDeps().settings.getPublic();
    }
};

// Settings helpers for calculated settings
export const settingsHelpers = {
    isWebAnalyticsEnabled() {
        return getRendererDeps().settingsHelpers.isWebAnalyticsEnabled();
    },
    isStripeConnected() {
        return getRendererDeps().settingsHelpers.isStripeConnected();
    }
};

// Custom theme settings (`@custom` data frame; NOT exported by core's proxy —
// theme-engine reads the cache directly, the package routes it through here)
export const customThemeSettingsCache = {
    getAll() {
        return getRendererDeps().customThemeSettings.getAll();
    }
};

// In-process Content API surface: api[controller][method](options). A Proxy
// forwards controller lookups to the injected ContentApiPort at call time.
// In dev/test the controller is wrapped to enforce the freshly-owned-JSON
// ownership contract (see ./payload-ownership.ts) — a no-op passthrough
// otherwise.
export const api: Record<string, any> = new Proxy({} as Record<string, any>, {
    get(_target, controller: string) {
        return withPayloadOwnershipAssertion(
            (getRendererDeps().api as Record<string, any>)[controller],
            controller
        );
    },
    has(_target, controller: string) {
        return controller in (getRendererDeps().api as Record<string, any>);
    }
});

// URL utils delegate — property-for-property mirror of shared/url-utils
export const urlUtils = {
    urlFor(context: any, data?: any, absolute?: boolean) {
        return getRendererDeps().urlUtils.urlFor(context, data, absolute);
    },
    urlJoin(...parts: any[]) {
        return getRendererDeps().urlUtils.urlJoin(...parts);
    },
    getSiteUrl() {
        return getRendererDeps().urlUtils.getSiteUrl();
    },
    getAdminUrl() {
        return getRendererDeps().urlUtils.getAdminUrl();
    },
    getSubdir() {
        return getRendererDeps().urlUtils.getSubdir();
    },
    relativeToAbsolute(url: string, options?: any) {
        return getRendererDeps().urlUtils.relativeToAbsolute(url, options);
    },
    absoluteToRelative(url: string, options?: any) {
        return getRendererDeps().urlUtils.absoluteToRelative(url, options);
    },
    createUrl(urlPath?: string, absolute?: boolean, trailingSlash?: boolean) {
        return getRendererDeps().urlUtils.createUrl(urlPath, absolute, trailingSlash);
    },
    replacePermalink(permalink: string, resource: any, timezone?: string) {
        return getRendererDeps().urlUtils.replacePermalink(permalink, resource, timezone);
    },
    get STATIC_IMAGE_URL_PREFIX() {
        return getRendererDeps().urlUtils.STATIC_IMAGE_URL_PREFIX;
    }
};

export const urlService = {
    getUrlForResource(resource: any, options?: {absolute?: boolean; withSubdirectory?: boolean}) {
        return getRendererDeps().urlService.getUrlForResource(resource, options);
    },
    ownsResource(identifier: string, resource: any) {
        return getRendererDeps().urlService.ownsResource(identifier, resource);
    }
};

// assets-minification cardAssets replacement (ghost_head's `// BAD REQUIRE`)
export const cardAssets = {
    hasFile(type: 'js' | 'css') {
        return getRendererDeps().cardAssets.hasFile(type);
    }
};

// asset-hash service replacement (meta/asset-url.js)
export const assetHash = {
    getHashForFile(path: string) {
        return getRendererDeps().assetHash.getHashForFile(path);
    },
    clearCache() {
        getRendererDeps().assetHash.clearCache();
    },
    get globalHash() {
        return getRendererDeps().assetHash.globalHash;
    }
};

// routing registry replacement (meta/rss-url.js)
export function getRssUrl(options?: {absolute?: boolean}): string | null {
    return getRendererDeps().misc.getRssUrl(options);
}

// @tryghost/image-transform replacement (utils/images.js)
export function canTransformToFormat(format: string): boolean {
    return getRendererDeps().misc.canTransformToFormat(format);
}

export type {ApiBrowseOptions};
