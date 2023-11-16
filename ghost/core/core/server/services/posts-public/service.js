const logging = require('@tryghost/logging');

class PostsPublicServiceWrapper {
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

        let postsCache;
        if (config.get('hostSettings:postsPublicCache:enabled')) {
            const cache = adapterManager.getAdapter('cache:postsPublic');
            postsCache = new EventAwareCacheWrapper({
                cache,
                logging,
                resetEvents: [
                    'post.deleted',
                    'post.published',
                    'post.published.edited',
                    'post.unpublished',
                    'page.deleted',
                    'page.published',
                    'page.published.edited',
                    'page.unpublished',
                    'post.tag.attached',
                    'post.tag.detached',
                    'page.tag.attached',
                    'page.tag.detached'
                ],
                eventRegistry: EventRegistry
            });
        }

        let cache;
        if (postsCache) {
            // @NOTE: exposing cache through getter and setter to not loose the context of "this"
            cache = {
                get() {
                    return postsCache.get(...arguments);
                },
                set() {
                    return postsCache.set(...arguments);
                }
            };
        }

        this.api = {
            cache: cache
        };
    }
}

module.exports = new PostsPublicServiceWrapper();
