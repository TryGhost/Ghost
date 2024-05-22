const DynamicRedirectManager = require('@tryghost/express-dynamic-redirects');
const OffersModule = require('@tryghost/members-offers');

const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const models = require('../../models');
const OfferBookshelfRepository = require('./OfferBookshelfRepository');

let redirectManager;

module.exports = {
    async init() {
        redirectManager = new DynamicRedirectManager({
            permanentMaxAge: config.get('caching:customRedirects:maxAge'),
            getSubdirectoryURL: (pathname) => {
                return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
            }
        });
        const repository = new OfferBookshelfRepository(
            models.Offer,
            models.OfferRedemption
        );
        const offersModule = OffersModule.create({
            redirectManager,
            repository
        });

        this.api = offersModule.api;

        await offersModule.init();
    },

    api: null,

    get middleware() {
        return redirectManager.handleRequest;
    }
};
