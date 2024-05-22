class TagsPublicServiceWrapper {
    async init() {
        if (this.api) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const adapterManager = require('../adapter-manager');
        const config = require('../../../shared/config');
        const EventRegistry = require('../../lib/common/events');

        let tagsCache;
        if (config.get('hostSettings:tagsPublicCache:enabled')) {
            tagsCache = adapterManager.getAdapter('cache:tagsPublic');
            EventRegistry.on('site.changed', () => {
                tagsCache.reset();
            });
        }

        this.api = {
            cache: tagsCache
        };
    }
}

module.exports = new TagsPublicServiceWrapper();
