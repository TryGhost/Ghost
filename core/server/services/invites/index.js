const settingsCache = require('../../../shared/settings-cache');
const i18n = require('../../../shared/i18n');
const mailService = require('../../services/mail');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils');
const Invites = require('./invites');

module.exports = new Invites({
    settingsCache,
    i18n,
    logging,
    mailService,
    urlUtils
});
