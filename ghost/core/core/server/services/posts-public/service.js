const createFacade = require('../../../shared/container/create-facade');
const createPostsPublicService = require('./create');

module.exports = createFacade('postsPublic', () => {
    const config = require('../../../shared/config');
    const adapterManager = require('../adapter-manager').default;
    return createPostsPublicService({
        events: require('../../lib/common/events'),
        cacheAdapter: config.get('hostSettings:postsPublicCache:enabled') ? adapterManager.getAdapter('cache:postsPublic') : null
    });
});
