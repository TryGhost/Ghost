const settingsCache = require('../../../shared/settings-cache');
const settingsHelpers = require('../settings-helpers');
const mailService = require('../../services/mail');
const urlUtils = require('../../../shared/url-utils');
const Invites = require('./invites');

module.exports = new Invites({
    settingsCache,
    settingsHelpers,
    mailService,
    urlUtils
});
