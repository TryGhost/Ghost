import {formatNumber} from '@tryghost/shade';

const formatNumberSafe: (value: number) => string = formatNumber as (value: number) => string;

export function getMembersNavActiveRoutes(membersForwardEnabled: boolean): string[] {
    if (membersForwardEnabled) {
        return ['members-forward', 'members', 'member', 'member.new'];
    }

    return ['members', 'member', 'member.new'];
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

export function formatMemberCount(value: number): string {
    return formatNumberSafe(value);
}
