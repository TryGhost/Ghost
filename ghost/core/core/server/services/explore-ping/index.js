const ExplorePingService = require('./ExplorePingService');
const config = require('../../../shared/config');
const labs = require('../../../shared/labs');
const logging = require('@tryghost/logging');
const ghostVersion = require('@tryghost/version');
const request = require('@tryghost/request');
const settingsCache = require('../../../shared/settings-cache');
const posts = require('../posts/posts-service');
const members = require('../members');

// Export the creation function for testing
module.exports.createService = function createService() {
    return new ExplorePingService({
        settingsCache,
        config,
        labs,
        logging,
        ghostVersion,
        request,
        posts: posts(),
        members
    });
};

module.exports.init = async function init() {
    const explorePingService = module.exports.createService();

    // The final intention is to have this run on a schedule
    // For the initial version, we'll just ping when the server starts
    await explorePingService.ping();
};
