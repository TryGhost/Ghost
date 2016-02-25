// Create a new `ghost-frontend` client for use in themes
var models  = require('../../../../models'),
    Promise = require('bluebird'),

    frontendClient  = require('../fixtures').models.Client[1];

module.exports = function addGhostFrontendClient(options, logInfo) {
    return models.Client.findOne({slug: frontendClient.slug}).then(function (client) {
        if (!client) {
            logInfo('Add ghost-frontend client fixture');
            return models.Client.add(frontendClient, options);
        }
        return Promise.resolve();
    });
};
