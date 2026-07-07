/**
 * @param {object} deps
 * @param {object} deps.events
 * @param {object} [deps.cacheAdapter]
 */
module.exports = function createPostsPublicService({events, cacheAdapter = null}) {
    let initialized = false;

    return {
        api: {
            cache: cacheAdapter
        },
        init() {
            if (initialized || !cacheAdapter) {
                return;
            }
            initialized = true;
            events.on('site.changed', () => {
                cacheAdapter.reset();
            });
        }
    };
};
