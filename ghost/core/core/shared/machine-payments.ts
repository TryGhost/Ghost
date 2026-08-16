/**
 * Shared eligibility for agent-purchasable paid content.
 */

type TierLike = {
    type?: string;
};

type PurchasableEntry = {
    visibility?: string;
    tiers?: TierLike[];
};

type LabsService = {
    isSet: (flag: string) => boolean;
};

type SettingsCache = {
    get: (key: string) => unknown;
};

export function isPurchasableEntry(entry: PurchasableEntry | null | undefined): boolean {
    if (!entry) {
        return false;
    }

    if (entry.visibility === 'paid') {
        return true;
    }

    if (entry.visibility !== 'tiers') {
        return false;
    }

    return Array.isArray(entry.tiers)
        && entry.tiers.length > 0
        && entry.tiers.every(tier => tier.type === 'paid');
}

/**
 * Shared enablement check for machine payments (labs + settings + Stripe).
 */
export function isMachinePaymentsEnabled({
    labs,
    settingsCache,
    isStripeConnected
}: {
    labs: LabsService;
    settingsCache: SettingsCache;
    isStripeConnected: () => boolean;
}): boolean {
    return labs.isSet('machinePayments')
        && settingsCache.get('machine_payments_enabled') === true
        && settingsCache.get('llms_enabled') !== false
        && isStripeConnected();
}
