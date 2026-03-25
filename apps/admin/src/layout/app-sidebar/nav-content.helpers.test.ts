import {describe, expect, it} from 'vitest';
import {getMembersNavActiveRoutes, isMembersNavActive} from './nav-content.helpers';

describe('getMembersNavActiveRoutes', () => {
    it('returns the members routes owned by the members section', () => {
        expect(getMembersNavActiveRoutes()).toEqual([
            'members',
            'member',
            'member.new'
        ]);
    });
});

describe('isMembersNavActive', () => {
    it('marks the base Members link active when a saved member view is active but collapsed', () => {
        expect(isMembersNavActive({
            isOnMembers: true,
            hasActiveMemberView: true,
            isMembersExpanded: false,
            isMembersSectionRouteActive: true
        })).toBe(true);
    });

    it('marks the base Members link inactive when a saved member view is active and expanded', () => {
        expect(isMembersNavActive({
            isOnMembers: true,
            hasActiveMemberView: true,
            isMembersExpanded: true,
            isMembersSectionRouteActive: true
        })).toBe(false);
    });

    it('falls back to the base Members link when no saved member view is active', () => {
        expect(isMembersNavActive({
            isOnMembers: true,
            hasActiveMemberView: false,
            isMembersExpanded: false,
            isMembersSectionRouteActive: false
        })).toBe(true);
    });

    it('uses the section route active state when outside the members list route', () => {
        expect(isMembersNavActive({
            isOnMembers: false,
            hasActiveMemberView: false,
            isMembersExpanded: false,
            isMembersSectionRouteActive: true
        })).toBe(true);
    });
});
