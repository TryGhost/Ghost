import {describe, it, expect} from 'vitest';
import {buildRefUrl} from './helpers';

describe('buildRefUrl', () => {
    it('returns the url unchanged when outbound link tagging is off', () => {
        expect(buildRefUrl('https://example.com/', false, 'mysite.com')).toBe('https://example.com/');
    });

    it('appends ref=<refDomain> when tagging is on', () => {
        expect(buildRefUrl('https://example.com/', true, 'mysite.com')).toBe('https://example.com/?ref=mysite.com');
    });

    it('preserves an existing ref source', () => {
        expect(buildRefUrl('https://example.com/?ref=other', true, 'mysite.com')).toBe('https://example.com/?ref=other');
    });

    it('does not overwrite an existing utm_source', () => {
        const url = 'https://example.com/?utm_source=newsletter';
        expect(buildRefUrl(url, true, 'mysite.com')).toBe(url);
    });

    it('does not overwrite an existing source param', () => {
        const url = 'https://example.com/?source=email';
        expect(buildRefUrl(url, true, 'mysite.com')).toBe(url);
    });

    it('returns the original string for an unparseable url', () => {
        expect(buildRefUrl('not a url', true, 'mysite.com')).toBe('not a url');
    });
});
