const ExploreService = require('./explore-service');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.membersService
 * @param {object} deps.postsService
 * @param {object} deps.publicConfigService
 * @param {object} deps.statsService
 * @param {object} deps.stripeService
 */
module.exports = function createExploreService({models, membersService, postsService, publicConfigService, statsService, stripeService}) {
    return new ExploreService({
        MembersService: membersService,
        PostsService: postsService,
        PublicConfigService: publicConfigService,
        StatsService: statsService,
        StripeService: stripeService,
        UserModel: models.User
    });
};
