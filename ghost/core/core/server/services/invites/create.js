const Invites = require('./invites');

/**
 * @param {object} deps
 * @param {object} deps.settingsCache
 * @param {object} deps.settingsHelpers
 * @param {object} deps.urlUtils
 * @param {object} deps.mailService
 */
module.exports = function createInvitesService({settingsCache, settingsHelpers, urlUtils, mailService}) {
    return new Invites({
        settingsCache,
        settingsHelpers,
        mailService,
        urlUtils
    });
};
