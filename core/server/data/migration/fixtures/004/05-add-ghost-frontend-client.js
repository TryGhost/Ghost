// Create a new `ghost-frontend` client for use in themes
var models  = require('../../../../models'),

    frontendClient  = require('../fixtures').models.Client[1],
    message = 'Add ghost-frontend client fixture';

module.exports = function addGhostFrontendClient(options, logger) {
    return models.Client.findOne({slug: frontendClient.slug}).then(function (client) {
        if (!client) {
            logger.info(message);
            return models.Client.add(frontendClient, options);
        } else {
            logger.warn(message);
        }
    });
};
