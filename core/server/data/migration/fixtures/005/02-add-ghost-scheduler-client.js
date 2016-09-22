// Create a new `ghost-scheduler` client for use in themes
var models  = require('../../../../models'),

    schedulerClient = require('../utils').findModelFixtureEntry('Client', {slug: 'ghost-scheduler'}),
    message = 'Add ghost-scheduler client fixture';

module.exports = function addGhostFrontendClient(options, logger) {
    return models.Client.findOne({slug: schedulerClient.slug}, options).then(function (client) {
        if (!client) {
            logger.info(message);
            return models.Client.add(schedulerClient, options);
        } else {
            logger.warn(message);
        }
    });
};
