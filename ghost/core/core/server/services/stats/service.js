const createFacade = require('../../../shared/container/create-facade');
const createStatsService = require('./create');

module.exports = createFacade('stats', () => {
    const config = require('../../../shared/config');
    const adapterManager = require('../adapter-manager').default;
    return createStatsService({
        knex: require('../../data/db').knex,
        models: require('../../models'),
        urlService: require('../url'),
        cacheAdapter: config.get('hostSettings:statsCache:enabled') ? adapterManager.getAdapter('cache:stats') : null
    });
});
