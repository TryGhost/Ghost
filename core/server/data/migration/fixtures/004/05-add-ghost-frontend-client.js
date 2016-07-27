// Create a new `ghost-frontend` client for use in themes
var models = require('../../../../models'),
    frontendClient = require('../utils').findModelFixtureEntry('Client', {slug: 'ghost-frontend'}),
    message = 'Add ghost-frontend client fixture';

module.exports = function addGhostFrontendClient(options, logger) {
    return models.Client.findOne({slug: frontendClient.slug}, options)
        .then(function (client) {
            if (!client) {
                logger.info(message);
                return models.Client.add(frontendClient, options);
            } else {
                logger.warn(message);
            }
        });
};
