const NewslettersService = require('./newsletters-service.js');
const SingleUseTokenProvider = require('../members/single-use-token-provider');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const MAGIC_LINK_TOKEN_MAX_USAGE_COUNT = 7;

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.urlUtils
 * @param {object} deps.limits
 * @param {object} deps.mail
 * @param {object} deps.labs
 * @param {object} deps.emailAddressService
 */
module.exports = function createNewslettersService({models, urlUtils, limits, mail, labs, emailAddressService}) {
    return new NewslettersService({
        NewsletterModel: models.Newsletter,
        MemberModel: models.Member,
        mail,
        singleUseTokenProvider: new SingleUseTokenProvider({
            SingleUseTokenModel: models.SingleUseToken,
            validityPeriod: MAGIC_LINK_TOKEN_VALIDITY,
            validityPeriodAfterUsage: MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE,
            maxUsageCount: MAGIC_LINK_TOKEN_MAX_USAGE_COUNT
        }),
        urlUtils,
        limitService: limits,
        labs,
        emailAddressService
    });
};
