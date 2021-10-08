const settingsCache = require('../../../shared/settings-cache');
const tpl = require('@tryghost/tpl');
const mailService = require('../../services/mail');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils');
const Invites = require('./invites');

module.exports = new Invites({
    settingsCache,
    tpl,
    logging,
    mailService,
    urlUtils
});
