import {deriveMemberDetailBackPath} from './member-detail-nav';
import {describe, expect, it} from 'vitest';

describe('deriveMemberDetailBackPath', () => {
    it('defaults to the members list when there is no back or post param', () => {
        expect(deriveMemberDetailBackPath('')).toBe('/members');
        expect(deriveMemberDetailBackPath('?foo=bar')).toBe('/members');
    });

    it('returns the back param when it points at the members area (preserving list filters)', () => {
        const search = `?back=${encodeURIComponent('/members?filter=status:paid')}`;
        expect(deriveMemberDetailBackPath(search)).toBe('/members?filter=status:paid');
    });

    it('ignores a back param that points outside the members area', () => {
        expect(deriveMemberDetailBackPath(`?back=${encodeURIComponent('/settings/staff')}`)).toBe('/members');
    });

    it('ignores an absolute URL in the back param to avoid open redirects', () => {
        expect(deriveMemberDetailBackPath(`?back=${encodeURIComponent('https://evil.example.com/members')}`)).toBe('/members');
    });

    it('ignores a protocol-relative URL in the back param', () => {
        // `//evil.com` is the classic protocol-relative open-redirect vector — it must not pass the guard.
        expect(deriveMemberDetailBackPath(`?back=${encodeURIComponent('//evil.example.com')}`)).toBe('/members');
    });

    it('treats any /members-prefixed path as internal (intentional Ember parity)', () => {
        // The guard is a prefix check, matching the Ember controller. A value like
        // `/members.evil.com` therefore passes — harmless because it renders as a
        // same-origin `#/members.evil.com` hash link (SPA 404), never a cross-origin
        // redirect. This test pins that intentional behaviour so it isn't "tightened"
        // without a deliberate decision to diverge from Ember.
        expect(deriveMemberDetailBackPath(`?back=${encodeURIComponent('/members.evil.com')}`)).toBe('/members.evil.com');
    });

    it('falls back to a post-scoped members list when only a post param is present', () => {
        // Mirrors the Ember controller: /members?post=<encodeURIComponent(post)>
        expect(deriveMemberDetailBackPath('?post=abc%20123')).toBe('/members?post=abc%20123');
    });

    it('prefers a valid back param over the post param', () => {
        const search = `?back=${encodeURIComponent('/members?filter=label:vip')}&post=abc`;
        expect(deriveMemberDetailBackPath(search)).toBe('/members?filter=label:vip');
    });
});
