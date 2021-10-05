/**
 * @typedef {import('./Offer')} Offer
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
 * @prop {'percent'|'amount'} type
 *
 * @prop {'month'|'year'} cadence
 * @prop {number} amount
 *
 * @prop {boolean} currency_restriction
 * @prop {string} currency
 *
 * @prop {object} tier
 * @prop {string} tier.id
 * @prop {string} tier.name
 */

class OfferMapper {
    /**
     * @param {Offer} offer
     * @returns {OfferDTO}
     */
    static toDTO(offer) {
        return {
            id: offer.id,
            name: offer.name,
            code: offer.code,
            display_title: offer.displayTitle,
            display_description: offer.displayDescription,
            type: offer.type,
            cadence: offer.cadence,
            amount: offer.amount,
            currency_restriction: offer.type === 'amount',
            currency: offer.type === 'amount' ? offer.currency : null,
            tier: {
                id: offer.tier.id,
                name: offer.tier.name
            }
        };
    }
}

module.exports = OfferMapper;
