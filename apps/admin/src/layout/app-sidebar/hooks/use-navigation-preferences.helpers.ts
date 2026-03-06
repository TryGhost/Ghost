import {DEFAULT_NAVIGATION_PREFERENCES, type NavigationPreferences} from '@/hooks/user-preferences';

export function buildExpandedPayload(
    expanded: NavigationPreferences['expanded'] | undefined,
    expandedKey: keyof NavigationPreferences['expanded'],
    value: boolean
): NavigationPreferences['expanded'] {
    return {
        ...(expanded ?? DEFAULT_NAVIGATION_PREFERENCES.expanded),
        [expandedKey]: value
    };
}
