export function getMembersNavActiveRoutes(): string[] {
    // TODO: Remove members-forward once the membersForward flag and legacy route split are gone.
    return ['members-forward', 'members', 'member', 'member.new'];
}

export function isMembersNavActive({
    membersForwardEnabled,
    isOnMembersForward,
    hasActiveMemberView,
    isLegacyMembersRouteActive
}: {
    membersForwardEnabled: boolean;
    isOnMembersForward: boolean;
    hasActiveMemberView: boolean;
    isLegacyMembersRouteActive: boolean;
}): boolean {
    if (!membersForwardEnabled) {
        return isLegacyMembersRouteActive;
    }

    if (isOnMembersForward) {
        return !hasActiveMemberView;
    }

    return isLegacyMembersRouteActive;
}
