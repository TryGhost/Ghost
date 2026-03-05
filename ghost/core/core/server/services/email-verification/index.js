const EmailVerificationService = require('./email-verification-service');
const SingleUseTokenProvider = require('../members/single-use-token-provider');
const mail = require('../mail');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const emailAddressService = require('../email-address');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const MAGIC_LINK_TOKEN_MAX_USAGE_COUNT = 7;

module.exports = new EmailVerificationService({
    VerifiedEmailModel: models.VerifiedEmail,
    NewsletterModel: models.Newsletter,
    SettingsModel: models.Settings,
    AutomatedEmailModel: models.AutomatedEmail,
    mail,
    singleUseTokenProvider: new SingleUseTokenProvider({
        SingleUseTokenModel: models.SingleUseToken,
        validityPeriod: MAGIC_LINK_TOKEN_VALIDITY,
        validityPeriodAfterUsage: MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE,
        maxUsageCount: MAGIC_LINK_TOKEN_MAX_USAGE_COUNT
    }),
    urlUtils,
    emailAddressService
});
