const NewslettersService = require('./service.js');
const SingleUseTokenProvider = require('../members/SingleUseTokenProvider');
const mail = require('../mail');
const models = require('../../models');
const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');

module.exports = new NewslettersService({
    NewsletterModel: models.Newsletter,
    config,
    mail,
    settingsCache,
    SingleUseTokenModel: models.SingleUseToken,
    SingleUseTokenProvider,
    urlUtils
});
