// createDefaultDeps URL normalization — the @tryghost/config-url-helpers
// contract enforced at the seam (origin oracle:
// node_modules/@tryghost/config-url-helpers/lib/config-url-helpers.js):
// getSiteUrl always carries a trailing slash; getAdminUrl gets a trailing
// slash, the site's subdirectory appended, and duplicate subdirectories
// removed.
import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'vitest';
import {createDefaultDeps} from '../../src/seam/defaults.ts';
import {teardownTestDeps} from '../utils/renderer-test-utils.ts';

afterEach(function () {
    teardownTestDeps();
});

function deps(siteUrl: string, adminUrl?: string) {
    return createDefaultDeps({siteUrl, key: 'testkey', adminUrl, settingsPayload: {}});
}

describe('createDefaultDeps url normalization', function () {
    it('getSiteUrl always ends with a trailing slash', function () {
        assert.equal(deps('https://example.com').urlUtils.getSiteUrl(), 'https://example.com/');
        assert.equal(deps('https://example.com/').urlUtils.getSiteUrl(), 'https://example.com/');
        assert.equal(deps('https://example.com/blog').urlUtils.getSiteUrl(), 'https://example.com/blog/');
    });

    it('getSubdir derives from the normalized site url', function () {
        assert.equal(deps('https://example.com/blog').urlUtils.getSubdir(), '/blog');
        assert.equal(deps('https://example.com').urlUtils.getSubdir(), '');
    });

    it('getAdminUrl appends a trailing slash', function () {
        assert.equal(deps('https://example.com', 'https://admin.example.com').urlUtils.getAdminUrl(), 'https://admin.example.com/');
    });

    it('getAdminUrl appends the site subdirectory (config-url-helpers oracle)', function () {
        assert.equal(
            deps('https://example.com/blog', 'https://admin.example.com').urlUtils.getAdminUrl(),
            'https://admin.example.com/blog/'
        );
    });

    it('getAdminUrl deduplicates an already-present subdirectory', function () {
        assert.equal(
            deps('https://example.com/blog/', 'https://example.com/blog').urlUtils.getAdminUrl(),
            'https://example.com/blog/'
        );
    });

    it('getAdminUrl stays undefined when no admin url is configured', function () {
        assert.equal(deps('https://example.com').urlUtils.getAdminUrl(), undefined);
    });
});
