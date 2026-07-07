const createFacade = require('../../../shared/container/create-facade');
const createExploreService = require('./create');

module.exports = createFacade('explore', () => createExploreService({
    models: require('../../models'),
    membersService: require('../members'),
    postsService: require('../posts/posts-service-instance')(),
    publicConfigService: require('../public-config'),
    statsService: require('../stats'),
    stripeService: require('../stripe')
}));
