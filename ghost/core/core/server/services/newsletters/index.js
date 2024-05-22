const NewslettersService = require('./NewslettersService.js');
const SingleUseTokenProvider = require('../members/SingleUseTokenProvider');
const mail = require('../mail');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const limitService = require('../limits');
const labs = require('../../../shared/labs');
const emailAddressService = require('../email-address');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const MAGIC_LINK_TOKEN_MAX_USAGE_COUNT = 3;

module.exports = new NewslettersService({
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
    limitService,
    labs,
    emailAddressService: emailAddressService
});
