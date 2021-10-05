const OfferRepository = require('./lib/OfferRepository');
const OffersAPI = require('./lib/OffersAPI');

class OffersModule {
    /**
     * @param {OffersAPI} offersAPI
     */
    constructor(offersAPI) {
        this.api = offersAPI;
    }

    /**
     * @param {object} deps
     * @param {import('@tryghost/express-dynamic-redirects')} deps.redirectManager
     * @param {import('@tryghost/members-stripe-service')} deps.stripeAPIService
     * @param {any} deps.OfferModel
     *
     * @returns {OffersModule}
     */
    static create(deps) {
        const repository = new OfferRepository(deps.OfferModel, deps.stripeAPIService, deps.redirectManager);
        const offersAPI = new OffersAPI(repository);
        return new OffersModule(offersAPI);
    }
}

module.exports = OffersModule;
