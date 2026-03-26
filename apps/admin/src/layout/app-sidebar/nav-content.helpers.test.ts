import {describe, expect, it} from 'vitest';
import {getMembersNavActiveRoutes, isMembersNavActive} from './nav-content.helpers';

describe('getMembersNavActiveRoutes', () => {
    it('always includes members-forward alongside the legacy members routes', () => {
        expect(getMembersNavActiveRoutes()).toEqual([
            'members-forward',
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
            isMembersExpanded: false,
            isLegacyMembersRouteActive: true
        })).toBe(true);
    });

    it('marks the base Members link active when a saved member view is active but collapsed', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersForward: true,
            hasActiveMemberView: true,
            isMembersExpanded: false,
            isLegacyMembersRouteActive: false
        })).toBe(true);
    });

    it('marks the base Members link inactive when a saved member view is active and expanded', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersForward: true,
            hasActiveMemberView: true,
            isMembersExpanded: true,
            isLegacyMembersRouteActive: false
        })).toBe(false);
    });

    it('falls back to the base Members link when no saved member view is active', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersForward: true,
            hasActiveMemberView: false,
            isMembersExpanded: false,
            isLegacyMembersRouteActive: false
        })).toBe(true);
    });
});
