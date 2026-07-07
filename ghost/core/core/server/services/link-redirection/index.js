const createFacade = require('../../../shared/container/create-facade');
const createLinkRedirectsService = require('./create');

module.exports = createFacade('linkRedirection', () => {
    const config = require('../../../shared/config');
    const adapterManager = require('../adapter-manager').default;
    return createLinkRedirectsService({
        models: require('../../models'),
        urlUtils: require('../../../shared/url-utils'),
        events: require('../../lib/common/events'),
        cacheAdapter: config.get('hostSettings:linkRedirectsPublicCache:enabled') ? adapterManager.getAdapter('cache:linkRedirectsPublic') : null
    });
});
