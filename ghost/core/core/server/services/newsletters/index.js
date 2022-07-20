const NewslettersService = require('./service.js');
const SingleUseTokenProvider = require('../members/SingleUseTokenProvider');
const mail = require('../mail');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const limitService = require('../limits');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;

module.exports = new NewslettersService({
    NewsletterModel: models.Newsletter,
    MemberModel: models.Member,
    mail,
    singleUseTokenProvider: new SingleUseTokenProvider(models.SingleUseToken, MAGIC_LINK_TOKEN_VALIDITY),
    urlUtils,
    limitService
});
