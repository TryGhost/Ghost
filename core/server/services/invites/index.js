const settingsCache = require('../../../shared/settings-cache');
const mailService = require('../../services/mail');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils');
const Invites = require('./invites');

module.exports = new Invites({
    settingsCache,
    logging,
    mailService,
    urlUtils
});
