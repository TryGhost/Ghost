export function getMembersNavActiveRoutes(): string[] {
    return ['members', 'member', 'member.new'];
}

export function isMembersNavActive({
    isOnMembers,
    hasActiveMemberView,
    isMembersExpanded,
    isMembersSectionRouteActive
}: {
    isOnMembers: boolean;
    hasActiveMemberView: boolean;
    isMembersExpanded: boolean;
    isMembersSectionRouteActive: boolean;
}): boolean {
    if (isOnMembers) {
        if (!hasActiveMemberView) {
            return true;
        }

        return !isMembersExpanded;
    }

    return isMembersSectionRouteActive;
}
