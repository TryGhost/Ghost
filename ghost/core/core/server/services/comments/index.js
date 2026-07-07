const createFacade = require('../../../shared/container/create-facade');
const createCommentsService = require('./create');

module.exports = createFacade('comments', () => createCommentsService({
    models: require('../../models'),
    settingsCache: require('../../../shared/settings-cache'),
    urlUtils: require('../../../shared/url-utils'),
    knex: require('../../data/db').knex,
    urlService: require('../url'),
    members: require('../members'),
    settingsHelpers: require('../settings-helpers'),
    labs: require('../../../shared/labs')
}));
