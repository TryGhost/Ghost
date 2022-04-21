const NewslettersService = require('./service.js');
const SingleUseTokenProvider = require('../members/SingleUseTokenProvider');
const mail = require('../mail');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');

module.exports = new NewslettersService({
    NewsletterModel: models.Newsletter,
    mail,
    SingleUseTokenModel: models.SingleUseToken,
    SingleUseTokenProvider,
    urlUtils
});
