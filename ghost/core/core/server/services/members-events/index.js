const createFacade = require('../../../shared/container/create-facade');
const createMembersEventsService = require('./create');

module.exports = createFacade('membersEvents', () => createMembersEventsService({
    models: require('../../models'),
    domainEvents: require('../../lib/common/domain-events'),
    events: require('../../lib/common/events'),
    settingsCache: require('../../../shared/settings-cache'),
    knex: require('../../data/db').knex,
    labs: require('../../../shared/labs'),
    members: require('../members'),
    deploymentConfig: require('../../../shared/config')
}));
