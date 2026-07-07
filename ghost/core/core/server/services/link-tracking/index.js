const createFacade = require('../../../shared/container/create-facade');
const createLinkTrackingService = require('./create');

module.exports = createFacade('linkTracking', () => createLinkTrackingService({
    models: require('../../models'),
    urlUtils: require('../../../shared/url-utils'),
    domainEvents: require('../../lib/common/domain-events'),
    linkRedirection: require('../link-redirection')
}));
