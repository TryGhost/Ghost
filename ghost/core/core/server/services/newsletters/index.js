const createFacade = require('../../../shared/container/create-facade');
const createNewslettersService = require('./create');

module.exports = createFacade('newsletters', () => createNewslettersService({
    models: require('../../models'),
    urlUtils: require('../../../shared/url-utils'),
    limits: require('../limits'),
    mail: require('../mail'),
    labs: require('../../../shared/labs'),
    emailAddressService: require('../email-address')
}));
