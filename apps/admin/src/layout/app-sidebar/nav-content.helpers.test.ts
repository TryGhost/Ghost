import {describe, expect, it} from 'vitest';
import {isMembersNavActive} from './nav-content.helpers';

describe('isMembersNavActive', () => {
    it('uses the legacy route active state when the feature flag is disabled', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: false,
            isOnMembersRoute: false,
            hasActiveMemberView: false,
            isMembersExpanded: false,
            isLegacyMembersRouteActive: true
        })).toBe(true);
    });

    it('marks the base Members link active when a saved member view is active but collapsed', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersRoute: true,
            hasActiveMemberView: true,
            isMembersExpanded: false,
            isLegacyMembersRouteActive: false
        })).toBe(true);
    });

    it('marks the base Members link inactive when a saved member view is active and expanded', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersRoute: true,
            hasActiveMemberView: true,
            isMembersExpanded: true,
            isLegacyMembersRouteActive: false
        })).toBe(false);
    });

    it('marks the base Members link active on React-owned members routes when no saved member view is active', () => {
        expect(isMembersNavActive({
            membersForwardEnabled: true,
            isOnMembersRoute: true,
            hasActiveMemberView: false,
            isMembersExpanded: false,
            isLegacyMembersRouteActive: false
        })).toBe(true);
    });
});
