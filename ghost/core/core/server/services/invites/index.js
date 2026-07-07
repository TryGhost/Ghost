const createFacade = require('../../../shared/container/create-facade');
const createInvitesService = require('./create');

module.exports = createFacade('invites', () => createInvitesService({
    settingsCache: require('../../../shared/settings-cache'),
    settingsHelpers: require('../settings-helpers'),
    urlUtils: require('../../../shared/url-utils'),
    mailService: require('../mail')
}));
