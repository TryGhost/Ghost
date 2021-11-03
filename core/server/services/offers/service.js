const DynamicRedirectManager = require('@tryghost/express-dynamic-redirects');
const OffersModule = require('@tryghost/members-offers');

const stripeService = require('../stripe');

const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const models = require('../../models');

const redirectManager = new DynamicRedirectManager({
    permanentMaxAge: config.get('caching:customRedirects:maxAge'),
    getSubdirectoryURL: (pathname) => {
        return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
    }
});

module.exports = {
    async init() {
        const offersModule = OffersModule.create({
            OfferModel: models.Offer,
            OfferRedemptionModel: models.OfferRedemption,
            redirectManager: redirectManager,
            stripeAPIService: stripeService.api
        });

        this.api = offersModule.api;

        await offersModule.init();
    },

    api: null,

    middleware: redirectManager.handleRequest
};
