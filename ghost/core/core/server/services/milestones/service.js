const createFacade = require('../../../shared/container/create-facade');
const createMilestonesService = require('./create');

module.exports = createFacade('milestones', () => {
    const config = require('../../../shared/config');
    return createMilestonesService({
        models: require('../../models'),
        domainEvents: require('../../lib/common/domain-events'),
        knex: require('../../data/db').knex,
        settingsCache: require('../../../shared/settings-cache'),
        getMilestonesConfig: () => config.get('milestones')
    });
});
