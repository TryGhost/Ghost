export function getMembersNavActiveRoutes(): string[] {
    return ['members', 'member', 'member.new'];
}

export function isMembersNavActive({
    membersForwardEnabled,
    isOnMembersRoute,
    hasActiveMemberView,
    isMembersExpanded,
    isLegacyMembersRouteActive
}: {
    membersForwardEnabled: boolean;
    isOnMembersRoute: boolean;
    hasActiveMemberView: boolean;
    isMembersExpanded: boolean;
    isLegacyMembersRouteActive: boolean;
}): boolean {
    if (!membersForwardEnabled) {
        return isLegacyMembersRouteActive;
    }

    if (isOnMembersRoute) {
        if (!hasActiveMemberView) {
            return true;
        }

        return !isMembersExpanded;
    }

    return isLegacyMembersRouteActive;
}
