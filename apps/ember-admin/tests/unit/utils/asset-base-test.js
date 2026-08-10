import {describe, it} from 'mocha';
import {expect} from 'chai';
import {prefixAssetUrl, resolveAssetBase} from 'ghost-admin/utils/asset-base';

/**
 * Create a minimal document fragment containing a <script> tag with the
 * given src. Uses a real DOMParser so the querySelector logic in
 * resolveAssetBase runs against actual DOM nodes.
 */
function docWithScript(src) {
    const doc = document.implementation.createHTMLDocument('test');
    const script = doc.createElement('script');
    script.src = src;
    doc.body.appendChild(script);
    return doc;
}

function emptyDoc() {
    return document.implementation.createHTMLDocument('test');
}

describe('Unit: Util: asset-base', function () {
    describe('script detection', function () {
        it('extracts base from a non-fingerprinted script (ghost.js)', function () {
            const doc = docWithScript('http://localhost:2368/ghost/assets/ghost.js');
            const result = resolveAssetBase(doc);

            expect(result).to.equal('http://localhost:2368/ghost/');
        });

        it('extracts base from a fingerprinted script (ghost-{hash}.js)', function () {
            const doc = docWithScript('http://127.0.0.1:2368/ghost/assets/ghost-a1b2c3d4e5.js');
            const result = resolveAssetBase(doc);

            expect(result).to.equal('http://127.0.0.1:2368/ghost/');
        });

        it('extracts CDN origin from a CDN-hosted script', function () {
            const doc = docWithScript('https://cdn.example.com/admin-forward/assets/ghost-a1b2c3d4e5.js');
            const result = resolveAssetBase(doc);

            expect(result).to.equal('https://cdn.example.com/admin-forward/');
        });

        it('handles a subdirectory install', function () {
            const doc = docWithScript('http://example.com/blog/ghost/assets/ghost.js');
            const result = resolveAssetBase(doc);

            expect(result).to.equal('http://example.com/blog/ghost/');
        });
    });

    describe('fallback', function () {
        it('falls back when no script is found', function () {
            const result = resolveAssetBase(emptyDoc());

            expect(result).to.match(/^https?:\/\//);
            expect(result).to.include('/ghost/');
            expect(result).to.match(/\/$/);
        });

        it('falls back when script has no admin root prefix (test/dev environment)', function () {
            // In the Ember test environment, ghost.js is served at /assets/ghost.js
            // without the /ghost/ admin root prefix. The function should fall through
            // to ghostPaths rather than returning a bare origin with no admin root.
            const doc = docWithScript('/assets/ghost.js');
            const result = resolveAssetBase(doc);

            expect(result).to.match(/^https?:\/\//);
            expect(result).to.include('/ghost/');
            expect(result).to.match(/\/$/);
        });
    });

    describe('new URL() safety', function () {
        it('script-derived result works with new URL()', function () {
            const doc = docWithScript('http://localhost:2368/ghost/assets/ghost-abc123.js');
            const base = resolveAssetBase(doc);

            const koenigUrl = new URL(`${base}assets/koenig-lexical/koenig-lexical.umd.js`);
            expect(koenigUrl.href).to.equal(
                'http://localhost:2368/ghost/assets/koenig-lexical/koenig-lexical.umd.js'
            );
        });

        it('fallback result works with new URL()', function () {
            const base = resolveAssetBase(emptyDoc());

            // This is the exact pattern used by fetchKoenigLexical and importComponent —
            // a relative path is NOT valid input for new URL(), so the base must be absolute.
            expect(() => new URL(`${base}assets/koenig-lexical/koenig-lexical.umd.js`)).to.not.throw();
        });
    });

    describe('prefixAssetUrl', function () {
        it('prefixes a relative URL with the asset base', function () {
            const result = prefixAssetUrl('assets/ghost-dark.css');

            expect(result).to.match(/^https?:\/\//);
            expect(result).to.include('assets/ghost-dark.css');
        });

        it('returns an absolute http URL unchanged (no double-prefixing)', function () {
            const absoluteUrl = 'http://cdn.example.com/admin-forward/assets/ghost-dark-abc123.css';
            const result = prefixAssetUrl(absoluteUrl);

            expect(result).to.equal(absoluteUrl);
        });

        it('returns an absolute https URL unchanged (no double-prefixing)', function () {
            const absoluteUrl = 'https://assets.ghost.io/admin-forward/assets/ghost-dark-9695bb0264af063aa642b1e451293d1a.css';
            const result = prefixAssetUrl(absoluteUrl);

            expect(result).to.equal(absoluteUrl);
        });

        it('handles URLs rewritten by broccoli-asset-rev with CDN prepend', function () {
            // broccoli-asset-rev rewrites string literals in compiled JS,
            // turning 'assets/ghost-dark.css' into
            // 'https://cdn.example.com/admin-forward/assets/ghost-dark-{hash}.css'.
            // prefixAssetUrl must not add another prefix on top.
            const rewrittenUrl = 'https://cdn.example.com/admin-forward/assets/ghost-dark-a1b2c3d4.css';
            const result = prefixAssetUrl(rewrittenUrl);

            expect(result).to.equal(rewrittenUrl);
            expect(result).to.not.include('https://cdn.example.com/admin-forward/https://');
        });
    });
});
