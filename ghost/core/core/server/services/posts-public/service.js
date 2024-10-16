class PostsPublicServiceWrapper {
    async init() {
        if (this.api) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const adapterManager = require('../adapter-manager');
        const config = require('../../../shared/config');
        const EventRegistry = require('../../lib/common/events');

        let postsCache;
        if (config.get('hostSettings:postsPublicCache:enabled')) {
            postsCache = adapterManager.getAdapter('cache:postsPublic');
            EventRegistry.on('site.changed', () => {
                postsCache.reset();
            });
        }

        this.api = {
            cache: postsCache
        };
    }
}

module.exports = new PostsPublicServiceWrapper();
