const models = require('../../models');
const request = require('@tryghost/request');
const adapterManager = require('../../services/adapter-manager');

// eslint-disable-next-line no-promise-executor-return
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    /**
     * Attempt to reproduce stale cache issue
     *
     * GET <PROTOCOL>://<HOST>/ghost/api/admin/stale_cache_repro/?k=<CONTENT_API_KEY>&j=<JUNK_CACHE_ENTRIES_COUNT>
     */
    async repro(frame) {
        const contentAPIKey = frame.original.query.k;
        const junkCacheEntriesCount = frame.original.query.j || 1000;
        const protocol = frame.original.url.secure ? 'https' : 'http';
        const host = frame.original.url.host.replace(/localhost/, '127.0.0.1');

        const triggerCacheInvalidation = async () => {
            await request(`${protocol}://${host}/ghost/api/admin/stale_cache_repro/invalidate_cache/`, {method: 'GET'});
        };

        const cache = adapterManager.getAdapter('cache:postsPublic');

        // Create a new post
        const post = await models.Post.add({
            title: `Repro stale cache test post ${Date.now()}`,
            status: 'published'
        }, frame.options);

        // Clear any existing caches and wait 1s to ensure they are cleared
        await triggerCacheInvalidation();
        await sleep(1000);

        // Request post via content API to ensure it gets cached
        const preCacheRes = await request(`${protocol}://${host}/ghost/api/content/posts/${post.id}/?key=${contentAPIKey}`, {method: 'GET'});
        const preCacheResPost = JSON.parse(preCacheRes.body).posts[0];
        const cacheKeyCountPreClear = (await cache.keys()).length;

        // Fill Redis with junk to repro high SCAN times when invalidating cache
        await Promise.all(
            Array.from({length: junkCacheEntriesCount}).map((_, idx) => {
                const key = `{"identifier":{"id":"${post.id}_${idx}"},"method":"read","options":{}}`;
                const data = {posts: [post.toJSON()], u: idx};

                return cache.set(key, data);
            })
        );

        // Edit the post and trigger cache invalidation
        await models.Post.edit({
            title: `${post.get('title')} - edited`
        }, {...frame.options, id: post.id});

        await triggerCacheInvalidation();

        // Request post via content API to check if was retrieved from Redis
        const postCacheClearRes = await request(`${protocol}://${host}/ghost/api/content/posts/${post.id}/?key=${contentAPIKey}`, {method: 'GET'});
        const postCacheClearResPost = JSON.parse(postCacheClearRes.body).posts[0];
        const cacheKeyCountPostClear = (await cache.keys()).length;
        const wasPostRetrievedFromRedis = preCacheResPost.title === postCacheClearResPost.title;

        // Sleep for 1s and check if cache key count has changed
        await sleep(1000);
        const cacheKeyCountPostSleep = (await cache.keys()).length;

        // Clean up - Remove post
        await models.Post.destroy({...frame.options, id: post.id});

        return {
            post_id: post.id,
            post_title: preCacheResPost.title,
            edited_post_title: postCacheClearResPost.title,
            was_edited_post_retrieved_from_redis: wasPostRetrievedFromRedis,
            cache_key_count_pre_cache_clear: cacheKeyCountPreClear,
            cache_key_count_post_cache_clear: cacheKeyCountPostClear,
            cache_key_count_post_1s_sleep: cacheKeyCountPostSleep
        };
    },
    /**
     * Trigger cache invalidation
     *
     * GET <PROTOCOL>://<HOST>/ghost/api/admin/stale_cache_repro/invalidate_cache
     */
    invalidateCache: {
        headers: {
            cacheInvalidate: true
        },
        permissions: false,
        async query() {
            this.headers.cacheInvalidate = true;
        }
    }
};
