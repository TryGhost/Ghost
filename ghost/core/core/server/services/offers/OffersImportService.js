const logging = require('@tryghost/logging');

class OffersImportService {
    /**
     * @param {object} deps
     * @param {object} deps.offersAPI
     * @param {object} deps.offerRepository
     * @param {typeof logging} [deps.logger]
     */
    constructor({
        offersAPI,
        offerRepository,
        logger = logging
    }) {
        this.offersAPI = offersAPI;
        this.offerRepository = offerRepository;
        this.logger = logger;
    }

    /**
     * Generate a human-readable name/title for an offer based on coupon.
     * @private
     */
    _generateNameFromCoupon(coupon) {
        const durationText = coupon.duration === 'repeating' && coupon.duration_in_months
            ? `for ${coupon.duration_in_months} months`
            : coupon.duration;

        if (coupon.percent_off) {
            return `${coupon.percent_off}% off ${durationText} (${coupon.id})`;
        } else if (coupon.amount_off) {
            const currency = (coupon.currency || 'usd').toUpperCase();
            const amount = coupon.amount_off / 100;
            return `${currency} ${amount} off ${durationText} (${coupon.id})`;
        } else {
            return coupon.id;
        }
    }

    /**
     * Map Stripe coupon to offer creation data.
     * Returns null if unsupported.
     * @private
     */
    _mapCouponToOfferData(coupon, {cadence, tier}) {
        if (!coupon) {
            return null;
        }

        let type;
        let amount;
        let currency = null;

        if (coupon.percent_off) {
            type = 'percent';
            amount = coupon.percent_off;
        } else if (coupon.amount_off) {
            type = 'fixed';
            amount = coupon.amount_off;
            currency = coupon.currency;
            if (!currency) {
                return null;
            }
        } else {
            return null;
        }

        const duration = coupon.duration;
        const durationInMonths = duration === 'repeating'
            ? coupon.duration_in_months
            : null;

        const name = this._generateNameFromCoupon(coupon);

        return {
            name,
            code: coupon.id,
            display_title: name,
            display_description: '',
            type,
            amount,
            cadence,
            duration,
            duration_in_months: durationInMonths,
            currency,
            status: 'archived', // Create the offer as archived by default, so that it can't be used for new signups
            tier: {
                id: tier.id,
                name: tier.name || ''
            },
            stripe_coupon_id: coupon.id
        };
    }

    /**
     * Ensure an offer exists for the given Stripe coupon.
     * Returns offerId or null.
     *
     * @param {object} params
     * @param {object} params.coupon
     * @param {'month'|'year'} params.cadence
     * @param {{id: string, name?: string}} params.tier
     * @param {import('knex').Knex.Transaction} [params.transacting]
     */
    async ensureOfferForCoupon({coupon, cadence, tier, transacting}) {
        if (!coupon?.id) {
            return null;
        }

        if (!this.offerRepository || !this.offersAPI) {
            this.logger.warn('Offer import unavailable: missing repository or offersAPI');
            return null;
        }

        const existing = await this.offerRepository.getByStripeCouponId(coupon.id, {transacting});
        if (existing) {
            return existing.id;
        }

        const offerData = this._mapCouponToOfferData(coupon, {cadence, tier});
        if (!offerData) {
            this.logger.warn(`Skipped creating offer from Stripe coupon ${coupon.id} due to unsupported coupon configuration.`);
            return null;
        }

        try {
            const created = await this.offersAPI.createOffer(offerData, {transacting});
            return created?.id || null;
        } catch (err) {
            this.logger.warn(`Failed to create offer from Stripe coupon ${coupon.id}`);
            this.logger.error(err);
            return null;
        }
    }
}

module.exports = OffersImportService;

