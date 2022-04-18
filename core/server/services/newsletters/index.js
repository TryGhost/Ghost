const NewslettersService = require('./service.js');
const SingleUseTokenProvider = require('../members/SingleUseTokenProvider');
const mail = require('../mail');
const models = require('../../models');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');

module.exports = new NewslettersService({
    NewsletterModel: models.Newsletter,
    mail,
    settingsCache,
    SingleUseTokenModel: models.SingleUseToken,
    SingleUseTokenProvider,
    urlUtils
});
