/**
 * @typedef {import('../domain/models/Offer')} Offer
 */

/**
 * @typedef {object} OfferDTO
 * @prop {string} id
 * @prop {string} name
 * @prop {string} code
 *
 * @prop {string} display_title
 * @prop {string} display_description
 *
 * @prop {'percent'|'fixed'|'trial'} type
 *
 * @prop {'month'|'year'} cadence
 * @prop {number} amount
 *
 * @prop {boolean} currency_restriction
 * @prop {string} currency
 *
 * @prop {'once'|'repeating'|'forever'|'trial'} duration
 * @prop {null|number} duration_in_months
 *
 * @prop {'active'|'archived'} status
 * @prop {number} redemption_count
 *
 * @prop {object} tier
 * @prop {string} tier.id
 * @prop {string} tier.name
 * @prop {string} created_at
 * @prop {string|null} last_redeemed
 */

class OfferMapper {
    /**
     * @param {Offer} offer
     * @returns {OfferDTO}
     */
    static toDTO(offer) {
        return {
            id: offer.id,
            name: offer.name.value,
            code: offer.code.value,
            display_title: offer.displayTitle.value,
            display_description: offer.displayDescription.value,
            type: offer.type.value,
            cadence: offer.cadence.value,
            amount: offer.amount.value,
            duration: offer.duration.value.type,
            duration_in_months: offer.duration.value.type === 'repeating' ? offer.duration.value.months : null,
            currency_restriction: offer.type.value === 'fixed',
            currency: offer.type.value === 'fixed' ? offer.currency.value : null,
            status: offer.status.value,
            redemption_count: offer.redemptionCount,
            tier: {
                id: offer.tier.id,
                name: offer.tier.name
            },
            created_at: offer.createdAt,
            last_redeemed: offer.lastRedeemed
        };
    }
}

module.exports = OfferMapper;
