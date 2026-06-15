import {describe, it, expect} from 'vitest';
import {pinAssetVersion} from './asset-base';

describe('pinAssetVersion', () => {
    it('pins a tilde-ranged jsdelivr directory URL', () => {
        expect(pinAssetVersion('https://cdn.jsdelivr.net/ghost/superportal@~3.0/umd', '3.0.2'))
            .toBe('https://cdn.jsdelivr.net/ghost/superportal@3.0.2/umd');
    });

    it('pins a caret range', () => {
        expect(pinAssetVersion('https://cdn.jsdelivr.net/ghost/superportal@^3/umd', '3.0.2'))
            .toBe('https://cdn.jsdelivr.net/ghost/superportal@3.0.2/umd');
    });

    it('pins a bare partial version', () => {
        expect(pinAssetVersion('https://cdn.jsdelivr.net/ghost/superportal@3.0/umd', '3.0.2'))
            .toBe('https://cdn.jsdelivr.net/ghost/superportal@3.0.2/umd');
    });

    it('returns an already-exact URL unchanged when versions match', () => {
        const url = 'https://cdn.jsdelivr.net/ghost/superportal@3.0.2/umd';
        expect(pinAssetVersion(url, '3.0.2')).toBe(url);
    });

    it('pins to a prerelease build version', () => {
        expect(pinAssetVersion('https://cdn.jsdelivr.net/ghost/superportal@~0.0/umd', '0.0.0-spike'))
            .toBe('https://cdn.jsdelivr.net/ghost/superportal@0.0.0-spike/umd');
    });

    it('pins a full file URL and preserves the filename', () => {
        expect(pinAssetVersion('https://cdn.jsdelivr.net/ghost/superportal@~3.0/umd/portal.min.js', '3.0.2'))
            .toBe('https://cdn.jsdelivr.net/ghost/superportal@3.0.2/umd/portal.min.js');
    });

    it('rewrites only the package segment on scoped npm paths', () => {
        expect(pinAssetVersion('https://cdn.jsdelivr.net/npm/@scope/pkg@~1.2/dist/x.js', '1.2.3'))
            .toBe('https://cdn.jsdelivr.net/npm/@scope/pkg@1.2.3/dist/x.js');
    });

    it('preserves a trailing slash', () => {
        expect(pinAssetVersion('https://cdn.jsdelivr.net/ghost/superportal@~3.0/umd/', '3.0.2'))
            .toBe('https://cdn.jsdelivr.net/ghost/superportal@3.0.2/umd/');
    });

    it('preserves query string and hash', () => {
        expect(pinAssetVersion('https://cdn.jsdelivr.net/ghost/superportal@~3.0/umd/portal.min.js?v=1#frag', '3.0.2'))
            .toBe('https://cdn.jsdelivr.net/ghost/superportal@3.0.2/umd/portal.min.js?v=1#frag');
    });

    it('leaves a self-hosted URL without a version segment unchanged', () => {
        const url = 'https://example.com/public/portal';
        expect(pinAssetVersion(url, '3.0.2')).toBe(url);
    });

    it('leaves a dev server URL unchanged', () => {
        const url = 'http://127.0.0.1:4175/src/shell';
        expect(pinAssetVersion(url, '0.0.0')).toBe(url);
    });

    it('returns an empty url unchanged', () => {
        expect(pinAssetVersion('', '3.0.2')).toBe('');
    });

    it('returns a non-absolute input unchanged', () => {
        expect(pinAssetVersion('chunks/shell.min.js', '3.0.2')).toBe('chunks/shell.min.js');
    });

    it('returns the url unchanged when version is empty', () => {
        const url = 'https://cdn.jsdelivr.net/ghost/superportal@~3.0/umd';
        expect(pinAssetVersion(url, '')).toBe(url);
    });

    it('leaves @latest unchanged', () => {
        const url = 'https://cdn.jsdelivr.net/ghost/superportal@latest/umd';
        expect(pinAssetVersion(url, '3.0.2')).toBe(url);
    });

    it('is idempotent', () => {
        const once = pinAssetVersion('https://cdn.jsdelivr.net/ghost/superportal@~3.0/umd', '3.0.2');
        expect(pinAssetVersion(once, '3.0.2')).toBe(once);
    });
});
