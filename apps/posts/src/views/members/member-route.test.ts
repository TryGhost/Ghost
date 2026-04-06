import {buildMembersForwardDetailUrl, buildMembersUrl} from './member-route';
import {describe, expect, it} from 'vitest';

describe('buildMembersUrl', () => {
    it('uses the canonical filter query parameter', () => {
        expect(buildMembersUrl({
            filter: 'status:paid'
        })).toBe('/members?filter=status%3Apaid');
    });

    it('ignores unsupported extra query params', () => {
        expect(buildMembersUrl({
            filter: 'emails.post_id:post_123',
            query: {
                postAnalytics: 'post_123'
            }
        } as never)).toBe('/members?filter=emails.post_id%3Apost_123');
    });
});

describe('buildMembersForwardDetailUrl', () => {
    it('builds a static members-forward detail route when no id is provided', () => {
        expect(buildMembersForwardDetailUrl()).toBe('/members-forward/detail');
    });

    it('encodes route segments safely when an id is provided', () => {
        expect(buildMembersForwardDetailUrl('member/with space')).toBe('/members-forward/member%2Fwith%20space');
    });
});
