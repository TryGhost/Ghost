/**
 * @typedef {import('./domain/models/Offer')} Offer
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
 * @prop {'once'|'repeating'|'forever'} duration
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
            name: offer.name.value,
            code: offer.code.value,
            display_title: offer.displayTitle.value,
            display_description: offer.displayDescription.value,
            type: offer.type.value,
            cadence: offer.cadence.value,
            amount: offer.amount.value,
            duration: offer.duration.value,
            currency_restriction: offer.type.value === 'amount',
            currency: offer.type.value === 'amount' ? offer.currency : null,
            tier: {
                id: offer.tier.id,
                name: offer.tier.name
            }
        };
    }
}

module.exports = OfferMapper;
