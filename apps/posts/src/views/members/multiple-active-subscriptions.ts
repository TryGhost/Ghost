import {z} from 'zod';
import type {User} from '@tryghost/admin-x-framework/api/users';

export const MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD = 'count.active_stripe_customers';
export const MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER = `${MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD}:>1`;
export const NO_MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER = `${MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD}:<2`;

const MultipleActiveSubscriptionsBannerPreferenceSchema = z.looseObject({
    dismissedCount: z.number().finite().optional().catch(undefined),
    dismissedAt: z.string().optional().catch(undefined)
});

const AccessibilityPreferencesSchema = z.looseObject({
    multipleActiveSubscriptionsBanner: MultipleActiveSubscriptionsBannerPreferenceSchema.optional().catch(undefined)
});

export type AccessibilityPreferences = z.infer<typeof AccessibilityPreferencesSchema>;
export type MultipleActiveSubscriptionsBannerPreference = z.infer<typeof MultipleActiveSubscriptionsBannerPreferenceSchema>;

export function isMultipleActiveSubscriptionsFilter(nql: string | undefined): boolean {
    return nql === MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER;
}

export function parseAccessibilityPreferences(accessibility: string | null | undefined): AccessibilityPreferences {
    if (!accessibility) {
        return AccessibilityPreferencesSchema.parse({});
    }

    try {
        const parsed = JSON.parse(accessibility);
        return AccessibilityPreferencesSchema.parse(parsed);
    } catch {
        return AccessibilityPreferencesSchema.parse({});
    }
}

export function getMultipleActiveSubscriptionsBannerPreference(
    accessibility: string | null | undefined
): MultipleActiveSubscriptionsBannerPreference {
    const preferences = parseAccessibilityPreferences(accessibility);
    return preferences.multipleActiveSubscriptionsBanner ?? {};
}

export function buildDismissedMultipleActiveSubscriptionsPreference(
    accessibility: string | null | undefined,
    dismissedCount: number,
    dismissedAt: string
): string {
    const preferences = parseAccessibilityPreferences(accessibility);
    const currentBannerPreference = getMultipleActiveSubscriptionsBannerPreference(accessibility);

    return JSON.stringify({
        ...preferences,
        multipleActiveSubscriptionsBanner: {
            ...currentBannerPreference,
            dismissedCount,
            dismissedAt
        }
    });
}

export function buildUserWithDismissedMultipleActiveSubscriptionsBanner(
    user: User,
    dismissedCount: number,
    dismissedAt: string
): User {
    return {
        ...user,
        accessibility: buildDismissedMultipleActiveSubscriptionsPreference(
            user.accessibility,
            dismissedCount,
            dismissedAt
        )
    };
}
