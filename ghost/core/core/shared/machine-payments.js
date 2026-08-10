/**
 * Shared eligibility for agent-purchasable paid content.
 *
 * @param {{visibility?: string, tiers?: Array<{type?: string}>}} entry
 * @returns {boolean}
 */
function isPurchasableEntry(entry) {
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
 *
 * @param {{
 *   labs: {isSet: (flag: string) => boolean},
 *   settingsCache: {get: (key: string) => unknown},
 *   isStripeConnected: () => boolean
 * }} deps
 * @returns {boolean}
 */
function isMachinePaymentsEnabled({labs, settingsCache, isStripeConnected}) {
    return labs.isSet('machinePayments')
        && settingsCache.get('machine_payments_enabled') === true
        && settingsCache.get('llms_enabled') !== false
        && isStripeConnected();
}

module.exports = {
    isPurchasableEntry,
    isMachinePaymentsEnabled
};
