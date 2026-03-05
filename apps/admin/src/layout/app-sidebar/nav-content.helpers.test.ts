import {describe, expect, it} from 'vitest';
import {getMembersNavActiveRoutes, isMembersNavActive} from './nav-content.helpers';

describe('getMembersNavActiveRoutes', () => {
    it('includes members-forward route when members forward is enabled', () => {
        expect(getMembersNavActiveRoutes(true)).toEqual([
            'members-forward',
            'members',
            'member',
            'member.new'
        ]);
    });

    it('does not include members-forward route when members forward is disabled', () => {
        expect(getMembersNavActiveRoutes(false)).toEqual([
            'members',
            'member',
            'member.new'
        ]);
    });
});

describe('isMembersNavActive', () => {
    it('uses legacy route active state when members forward is disabled', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: false,
            isOnMembersForward: false,
            hasActiveMemberView: false,
            isLegacyMembersRouteActive: true
        })).toBe(true);
    });

    it('returns false on members-forward when a saved member view is active', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersForward: true,
            hasActiveMemberView: true,
            isLegacyMembersRouteActive: false
        })).toBe(false);
    });

    it('falls back to members link when on members-forward without active member view', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersForward: true,
            hasActiveMemberView: false,
            isLegacyMembersRouteActive: false
        })).toBe(true);
    });

    it('uses legacy route active state off members-forward when members forward is enabled', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersForward: false,
            hasActiveMemberView: false,
            isLegacyMembersRouteActive: true
        })).toBe(true);
    });
});
