const createFacade = require('../../../shared/container/create-facade');
const createTagsPublicService = require('./create');

module.exports = createFacade('tagsPublic', () => {
    const config = require('../../../shared/config');
    const adapterManager = require('../adapter-manager').default;
    return createTagsPublicService({
        events: require('../../lib/common/events'),
        cacheAdapter: config.get('hostSettings:tagsPublicCache:enabled') ? adapterManager.getAdapter('cache:tagsPublic') : null
    });
});
