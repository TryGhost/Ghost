class TagsPublicServiceWrapper {
    async init() {
        if (this.api) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const adapterManager = require('../adapter-manager');
        const config = require('../../../shared/config');
        const EventAwareCacheWrapper = require('@tryghost/event-aware-cache-wrapper');
        const EventRegistry = require('../../lib/common/events');

        let tagsCache;
        if (config.get('hostSettings:tagsPublicCache:enabled')) {
            let tagsPublicCache = adapterManager.getAdapter('cache:tagsPublic');
            tagsCache = new EventAwareCacheWrapper({
                cache: tagsPublicCache,
                resetEvents: ['site.changed'],
                eventRegistry: EventRegistry
            });
        }

        let cache;
        if (tagsCache) {
            // @NOTE: exposing cache through getter and setter to not loose the context of "this"
            cache = {
                get() {
                    return tagsCache.get(...arguments);
                },
                set() {
                    return tagsCache.set(...arguments);
                }
            };
        }
        this.api = {
            cache: cache
        };
    }
}

module.exports = new TagsPublicServiceWrapper();
