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

module.exports = {
    isPurchasableEntry
};
