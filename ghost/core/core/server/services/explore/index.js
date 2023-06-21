const ExploreService = require('./ExploreService');

const MembersService = require('../members');
const PostsService = require('../posts/posts-service')();
const PublicConfigService = require('../public-config');
const StatsService = require('../stats');
const StripeService = require('../stripe');

const models = require('../../models');

module.exports = new ExploreService({
    MembersService,
    PostsService,
    PublicConfigService,
    StatsService,
    StripeService,
    UserModel: models.User
});
