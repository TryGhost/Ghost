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
    it('uses the legacy route active state when members forward is disabled', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: false,
            isOnMembersForward: false,
            hasActiveMemberView: false,
            isLegacyMembersRouteActive: true
        })).toBe(true);
    });

    it('marks the base Members link inactive when a saved member view is active', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersForward: true,
            hasActiveMemberView: true,
            isLegacyMembersRouteActive: false
        })).toBe(false);
    });

    it('falls back to the base Members link when no saved member view is active', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersForward: true,
            hasActiveMemberView: false,
            isLegacyMembersRouteActive: false
        })).toBe(true);
    });
});
