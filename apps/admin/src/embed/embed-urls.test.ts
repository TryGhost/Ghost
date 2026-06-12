import {describe, expect, it} from 'vitest';
import {
    buildBillingIframeSrc,
    buildExploreApiUrl,
    buildExploreIframeSrc,
    buildMigrateApiUrl,
    buildMigrateIframeSrc,
    buildSiteSrcUrl
} from './embed-urls';

describe('buildSiteSrcUrl', () => {
    it('adds the admin params and cache-busting guid', () => {
        expect(buildSiteSrcUrl('https://example.com', 'abc123'))
            .toBe('https://example.com/?v=abc123&admin=1&admin_toolbar=0');
    });

    it('omits the guid param when not provided', () => {
        expect(buildSiteSrcUrl('https://example.com'))
            .toBe('https://example.com/?admin=1&admin_toolbar=0');
    });

    it('normalizes a trailing slash on the blog url', () => {
        expect(buildSiteSrcUrl('https://example.com/blog/', 'g'))
            .toBe('https://example.com/blog/?v=g&admin=1&admin_toolbar=0');
    });
});

describe('buildBillingIframeSrc', () => {
    it('returns the billing url for the root pro route', () => {
        expect(buildBillingIframeSrc('https://billing.ghost.org/', '#/pro'))
            .toBe('https://billing.ghost.org/');
    });

    it('appends the child route from the hash', () => {
        expect(buildBillingIframeSrc('https://billing.ghost.org', '#/pro/billing'))
            .toBe('https://billing.ghost.org/billing');
    });

    it('keeps query params from the hash (e.g. checkout action)', () => {
        expect(buildBillingIframeSrc('https://billing.ghost.org', '#/pro?action=checkout'))
            .toBe('https://billing.ghost.org?action=checkout');
    });

    it('ignores non-pro hashes', () => {
        expect(buildBillingIframeSrc('https://billing.ghost.org', '#/posts'))
            .toBe('https://billing.ghost.org');
    });
});

describe('buildExploreIframeSrc', () => {
    it('returns the explore root url by default', () => {
        expect(buildExploreIframeSrc()).toBe('https://ghost.org/explore/');
        expect(buildExploreIframeSrc('')).toBe('https://ghost.org/explore/');
    });

    it('appends sub paths', () => {
        expect(buildExploreIframeSrc('tag/news')).toBe('https://ghost.org/explore/tag/news');
        expect(buildExploreIframeSrc('/tag/news')).toBe('https://ghost.org/explore/tag/news');
    });

    it('never uses the admin-rendered connect route as iframe src', () => {
        expect(buildExploreIframeSrc('connect')).toBe('https://ghost.org/explore/');
    });
});

describe('buildExploreApiUrl', () => {
    it('returns host + subdir without protocol or trailing slash', () => {
        expect(buildExploreApiUrl('https://example.com', '')).toBe('example.com');
        expect(buildExploreApiUrl('https://example.com:2368', '/blog')).toBe('example.com:2368/blog');
        expect(buildExploreApiUrl('https://example.com', '/blog/')).toBe('example.com/blog');
    });
});

describe('buildMigrateIframeSrc', () => {
    it('returns the migrate app url', () => {
        expect(buildMigrateIframeSrc()).toBe('https://migrate.ghost.org');
    });

    it('preselects a platform via query param', () => {
        expect(buildMigrateIframeSrc('wordpress')).toBe('https://migrate.ghost.org?platform=wordpress');
    });
});

describe('buildMigrateApiUrl', () => {
    it('returns origin + admin root without trailing slash', () => {
        expect(buildMigrateApiUrl('https://example.com', '/ghost/')).toBe('https://example.com/ghost');
        expect(buildMigrateApiUrl('https://example.com', '/blog/ghost/')).toBe('https://example.com/blog/ghost');
    });
});
