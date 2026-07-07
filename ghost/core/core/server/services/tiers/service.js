const createFacade = require('../../../shared/container/create-facade');
const createTiersService = require('./create');

module.exports = createFacade('tiers', () => createTiersService({
    models: require('../../models'),
    domainEvents: require('../../lib/common/domain-events')
}));
