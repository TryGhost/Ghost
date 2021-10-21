const DomainEvents = require('@tryghost/domain-events');
const OfferCreatedEvent = require('@tryghost/members-offers').events.OfferCreatedEvent;

class PaymentsService {
    /**
     * @param {object} deps
     * @param {any} deps.Offer
     * @param {import('@tryghost/members-offers/lib/application/OffersAPI')} deps.offersAPI
     * @param {any} deps.stripeAPIService
     */
    constructor(deps) {
        /** @private */
        this.OfferModel = deps.Offer;
        /** @private */
        this.offersAPI = deps.offersAPI;
        /** @private */
        this.stripeAPIService = deps.stripeAPIService;

        DomainEvents.subscribe(OfferCreatedEvent, async (event) => {
            await this.getCouponForOffer(event.data.offer.id);
        });
    }

    /**
     * @param {string} offerId
     *
     * @returns {Promise<{id: string}>}
     */
    async getCouponForOffer(offerId) {
        const row = await this.OfferModel.where({id: offerId}).query().select('stripe_coupon_id').first();
        if (!row) {
            return null;
        }
        if (!row.stripe_coupon_id) {
            const offer = await this.offersAPI.getOffer({id: offerId});
            await this.createCouponForOffer(offer);
            return this.getCouponForOffer(offerId);
        }
        return {
            id: row.stripe_coupon_id
        };
    }

    /**
     * @param {import('@tryghost/members-offers/lib/application/OfferMapper').OfferDTO} offer
     */
    async createCouponForOffer(offer) {
        /** @type {import('stripe').Stripe.CouponCreateParams} */
        const couponData = {
            name: offer.name,
            duration: offer.duration
        };

        if (offer.duration === 'repeating') {
            couponData.duration_in_months = offer.duration_in_months;
        }

        if (offer.type === 'percent') {
            couponData.percent_off = offer.amount;
        } else {
            couponData.amount_off = offer.amount;
            couponData.currency = offer.currency;
        }

        const coupon = await this.stripeAPIService.createCoupon(couponData);

        await this.OfferModel.edit({
            stripe_coupon_id: coupon.id
        }, {
            id: offer.id
        });
    }
}

module.exports = PaymentsService;
