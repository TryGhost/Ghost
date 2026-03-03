import type {NavigationPreferences} from '@/hooks/user-preferences';

export function buildExpandedPayload(
    expanded: NavigationPreferences['expanded'] | undefined,
    expandedKey: keyof NavigationPreferences['expanded'],
    value: boolean
): Partial<NavigationPreferences['expanded']> {
    return {
        ...expanded,
        [expandedKey]: value
    };
}
