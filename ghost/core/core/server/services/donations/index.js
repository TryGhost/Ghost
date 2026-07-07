const createFacade = require('../../../shared/container/create-facade');
const createDonationService = require('./create');

module.exports = createFacade('donations', () => createDonationService({
    models: require('../../models')
}));
