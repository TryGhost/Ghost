const createFacade = require('../../../shared/container/create-facade');
const createAudienceFeedbackService = require('./create');

module.exports = createFacade('audienceFeedback', () => createAudienceFeedbackService({
    models: require('../../models'),
    urlUtils: require('../../../shared/url-utils'),
    urlService: require('../url')
}));
