const Offer = require('../domain/models/offer');
const OfferName = require('../domain/models/offer-name');
const OfferCode = require('../domain/models/offer-code');
const OfferTitle = require('../domain/models/offer-title');
const OfferDescription = require('../domain/models/offer-description');
const OfferStatus = require('../domain/models/offer-status');
const OfferMapper = require('./offer-mapper');
const UniqueChecker = require('./unique-checker');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const debug = require('@tryghost/debug')('offers:api');

const messages = {
    offerNotFoundAfterDuplicateError: 'Tried to create duplicate offer for the Stripe coupon {couponId}, but could not find offer in database'
};

class OffersAPI {
    /**
     * @param {import('../offer-bookshelf-repository')} repository
     */
    constructor(repository) {
        this.repository = repository;
    }

    /**
     * @param {object} data
     * @param {string} data.id
     * @param {Object} [options]
     *
     * @returns {Promise<OfferMapper.OfferDTO>}
     */
    async getOffer(data, options = {}) {
        if (options.transacting) {
            const offer = await this.repository.getById(data.id, options);

            return offer ? OfferMapper.toDTO(offer) : null;
        }

        return this.repository.createTransaction(async (transaction) => {
            const offer = await this.repository.getById(data.id, {transacting: transaction});

            if (!offer) {
                return null;
            }

            return OfferMapper.toDTO(offer);
        });
    }

    /**
     * @param {any} data
     * @param {Object} [options]
     *
     * @returns {Promise<OfferMapper.OfferDTO>}
     */
    async createOffer(data, options = {}) {
        return this.repository.createTransaction(async (transaction) => {
            const saveOptions = {...options, transacting: transaction};
            const uniqueChecker = new UniqueChecker(this.repository, transaction);
            const offer = await Offer.create(data, uniqueChecker);

            await this.repository.save(offer, saveOptions);

            return OfferMapper.toDTO(offer);
        });
    }

    /**
     * @param {object} data
     * @param {string} data.id
     * @param {string} [data.name]
     * @param {string} [data.display_title]
     * @param {string} [data.display_description]
     * @param {string} [data.code]
     * @param {string} [data.status]
     * @param {Object} [options]
     *
     * @returns {Promise<OfferMapper.OfferDTO>}
     */
    async updateOffer(data, options = {}) {
        return await this.repository.createTransaction(async (transaction) => {
            const updateOptions = {...options, transacting: transaction};
            const uniqueChecker = new UniqueChecker(this.repository, transaction);

            const offer = await this.repository.getById(data.id, updateOptions);

            if (!offer) {
                return null;
            }

            if (Reflect.has(data, 'name')) {
                const name = OfferName.create(data.name);
                await offer.updateName(name, uniqueChecker);
            }

            if (Reflect.has(data, 'code')) {
                const code = OfferCode.create(data.code);
                await offer.updateCode(code, uniqueChecker);
            }

            if (Reflect.has(data, 'display_title')) {
                const title = OfferTitle.create(data.display_title);
                offer.displayTitle = title;
            }

            if (Reflect.has(data, 'display_description')) {
                const description = OfferDescription.create(data.display_description);
                offer.displayDescription = description;
            }

            if (Reflect.has(data, 'status')) {
                const status = OfferStatus.create(data.status);
                offer.status = status;
            }

            await this.repository.save(offer, updateOptions);

            return OfferMapper.toDTO(offer);
        });
    }

    /**
     * @param {object} options
     * @param {string} options.filter
     * @returns {Promise<OfferMapper.OfferDTO[]>}
     */
    async listOffers(options) {
        return await this.repository.createTransaction(async (transaction) => {
            const opts = {transacting: transaction, filter: options.filter};

            const offers = await this.repository.getAll(opts);

            return offers.map(OfferMapper.toDTO);
        });
    }

    /**
     * @param {object} options
     * @param {string} options.subscriptionId
     * @param {string} options.tierId
     * @param {'month'|'year'} options.cadence
     * @param {'signup'|'retention'} [options.redemptionType]
     * @returns {Promise<OfferMapper.OfferDTO[]>}
     */
    async listOffersAvailableToSubscription({subscriptionId, tierId, cadence, redemptionType}) {
        debug(`listOffersAvailableToSubscription: subscriptionId=${subscriptionId}, tierId=${tierId}, cadence=${cadence}, redemptionType=${redemptionType}`);

        if (!subscriptionId || !tierId || !cadence) {
            throw new errors.IncorrectUsageError({
                message: 'subscriptionId, tierId, and cadence are required'
            });
        }

        return await this.repository.createTransaction(async (transaction) => {
            const allOffers = await this.repository.getAll({
                transacting: transaction,
                filter: 'status:active'
            });

            debug(`listOffersAvailableToSubscription: found ${allOffers.length} active offers`);

            if (allOffers.length === 0) {
                debug(`listOffersAvailableToSubscription: no active offers exist`);
                return [];
            }

            // Filter by tier and cadence
            let available = allOffers.filter(offer => offer.tier.id === tierId && offer.cadence.value === cadence);
            debug(`listOffersAvailableToSubscription: ${available.length} offers match tier and cadence`);

            if (available.length === 0) {
                const tierIds = [...new Set(allOffers.map(o => o.tier.id))];
                const cadences = [...new Set(allOffers.map(o => o.cadence.value))];
                debug(`listOffersAvailableToSubscription: no offers match - available tiers: [${tierIds.join(', ')}], available cadences: [${cadences.join(', ')}]`);

                return [];
            }

            // Filter by redemption type if specified
            if (redemptionType) {
                const beforeFilter = available.length;
                available = available.filter(offer => offer.redemptionType.value === redemptionType);

                debug(`listOffersAvailableToSubscription: ${available.length} offers match redemption type (filtered ${beforeFilter - available.length})`);
            }

            // Filter out trial offers (can't apply trials to existing subscriptions)
            const beforeTrialFilter = available.length;
            available = available.filter(offer => offer.type.value !== 'trial');

            if (beforeTrialFilter > available.length) {
                debug(`listOffersAvailableToSubscription: filtered out ${beforeTrialFilter - available.length} trial offers`);
            }

            // Filter out offers already redeemed on this subscription
            const redeemedOfferIds = await this.repository.getRedeemedOfferIdsForSubscription({
                subscriptionId,
                transacting: transaction
            });

            const beforeRedeemedFilter = available.length;
            available = available.filter(offer => !redeemedOfferIds.includes(offer.id));

            if (redeemedOfferIds.length > 0) {
                debug(`listOffersAvailableToSubscription: filtered ${beforeRedeemedFilter - available.length} already-redeemed offers`);
            }

            debug(`listOffersAvailableToSubscription: returning ${available.length} available offers`);
            return available.map(OfferMapper.toDTO);
        });
    }

    /**
     * @param {object} coupon
     * @param {string} coupon.id
     * @param {number} [coupon.percent_off]
     * @param {number} [coupon.amount_off]
     * @param {string} [coupon.currency]
     * @param {string} coupon.duration
     * @param {number} [coupon.duration_in_months]
     * @param {string} cadence
     * @param {object} tier
     * @param {object} [options]
     * @param {object} [options.transacting]
     *
     * @returns {Promise<OfferMapper.OfferDTO>}
     */
    async ensureOfferForStripeCoupon(coupon, cadence, tier, options = {}) {
        const run = async (transaction) => {
            const txOptions = {...options, transacting: transaction};

            const existing = await this.repository.getByStripeCouponId(coupon.id, txOptions);
            if (existing) {
                return OfferMapper.toDTO(existing);
            }

            const uniqueChecker = new UniqueChecker(this.repository, transaction);
            const offer = await Offer.createFromStripeCoupon(coupon, cadence, tier, uniqueChecker);

            try {
                await this.repository.save(offer, txOptions);
            } catch (err) {
                // Handle race condition: another request may have created the offer
                // between the check and save. If so, return the existing offer.
                if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT') {
                    const createdOffer = await this.repository.getByStripeCouponId(coupon.id, txOptions);
                    if (createdOffer) {
                        return OfferMapper.toDTO(createdOffer);
                    }

                    const error = new errors.InternalServerError({
                        message: tpl(messages.offerNotFoundAfterDuplicateError, {couponId: coupon.id}),
                        err
                    });
                    logging.error(error);
                    throw error;
                }
                throw err;
            }

            return OfferMapper.toDTO(offer);
        };

        if (options.transacting) {
            return run(options.transacting);
        }

        return this.repository.createTransaction(run);
    }
}

module.exports = OffersAPI;
