const Offer = require('./Offer');

/**
 * @typedef {object} OfferRepositoryOptions
 * @prop {import('knex').Transaction} transacting
 */

/**
 * @param {any} json
 * @returns {Offer.OfferProps}
 */
function toDomain(json) {
    return {
        id: json.id,
        name: json.name,
        code: json.code,
        display_title: json.portal_title,
        display_description: json.portal_description,
        type: json.discount_type,
        amount: json.discount_amount,
        cadence: json.interval,
        currency: json.currency,
        tier: {
            id: json.product.id,
            name: json.product.name
        }
    };
}

class OfferRepository {
    /**
     * @param {{forge: (data: object) => import('bookshelf').Model<Offer.OfferProps>}} OfferModel
     * @param {import('@tryghost/members-stripe-service')} stripeAPIService
     * @param {import('@tryghost/express-dynamic-redirects')} redirectManager
     */
    constructor(OfferModel, stripeAPIService, redirectManager) {
        /** @private */
        this.OfferModel = OfferModel;
        /** @private */
        this.stripeAPIService = stripeAPIService;
        /** @private */
        this.redirectManager = redirectManager;
    }

    /**
     * @template T
     * @param {(t: import('knex').Transaction) => Promise<T>} cb
     * @returns {Promise<T>}
     */
    async createTransaction(cb) {
        return this.OfferModel.transaction(cb);
    }

    /**
     * @param {string} name
     * @param {OfferRepositoryOptions} options
     * @returns {Promise<boolean>}
     */
    async existsByName(name, options) {
        const model = await this.OfferModel.findOne({name}, options);
        if (!model) {
            return false;
        }
        return true;
    }

    /**
     * @param {string} code
     * @param {OfferRepositoryOptions} options
     * @returns {Promise<boolean>}
     */
    async existsByCode(code, options) {
        const model = await this.OfferModel.findOne({code}, options);
        if (!model) {
            return false;
        }
        return true;
    }

    /**
     * @param {string} id
     * @param {OfferRepositoryOptions} options
     * @returns {Promise<Offer>}
     */
    async getById(id, options) {
        const model = await this.OfferModel.findOne({id}, {
            ...options,
            withRelated: ['product']
        });

        const json = model.toJSON();

        return Offer.create(toDomain(json));
    }

    /**
     * @param {OfferRepositoryOptions} options
     * @returns {Promise<Offer[]>}
     */
    async getAll(options) {
        const models = await this.OfferModel.findAll({
            ...options,
            withRelated: ['product']
        });
        return Promise.all(models.toJSON().map(toDomain).map(Offer.create));
    }

    /**
     * @param {Offer} offer
     * @param {OfferRepositoryOptions} options
     * @returns {Promise<void>}
     */
    async save(offer, options) {
        const model = this.OfferModel.forge({
            id: offer.id,
            name: offer.name,
            code: offer.code,
            portal_title: offer.displayTitle,
            portal_description: offer.displayDescription,
            discount_type: offer.type,
            discount_amount: offer.amount,
            interval: offer.cadence,
            product_id: offer.tier.id,
            duration: 'once'
        });

        if (offer.codeChanged || offer.isNew) {
            offer.oldCodes.forEach((code) => {
                this.redirectManager.removeRedirect(code);
            });
            this.redirectManager.addRedirect(`/${offer.code}`, `/#/portal/offers/${offer.id}`, {
                permanent: false
            });
        }

        if (offer.isNew) {
            /** @type {import('stripe').Stripe.CouponCreateParams} */
            const coupon = {
                name: offer.name,
                duration: 'once'
            };

            if (offer.type === 'percent') {
                coupon.percent_off = offer.amount;
            }

            const couponData = await this.stripeAPIService.createCoupon(coupon);
            model.set('stripe_coupon_id', couponData.id);
            await model.save(null, {method: 'insert', ...options});
        } else {
            await model.save(null, {method: 'update', ...options});
        }
    }
}

module.exports = OfferRepository;
