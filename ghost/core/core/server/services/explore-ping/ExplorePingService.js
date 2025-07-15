module.exports = class ExplorePingService {
    /**
     * @param {object} deps
     * @param {{get: (string) => string}} deps.settingsCache
     * @param {object} deps.config
     * @param {object} deps.labs
     * @param {object} deps.logging
     * @param {object} deps.ghostVersion
     * @param {object} deps.request
     * @param {{stats: {
     *   getMostRecentlyPublishedPostDate: () => Promise<Date>,
     *   getFirstPublishedPostDate: () => Promise<Date>,
     *   getTotalPostsPublished: () => Promise<number>
     * }}} deps.posts
     * @param {{stats: {
     *   getTotalMembers: () => Promise<number>
     *   getMRRHistory: () => Promise<number>
     * }}} deps.members
     */
    constructor({settingsCache, config, labs, logging, ghostVersion, request, posts, members}) {
        this.settingsCache = settingsCache;
        this.config = config;
        this.labs = labs;
        this.logging = logging;
        this.ghostVersion = ghostVersion;
        this.request = request;
        this.posts = posts;
        this.members = members;
    }

    async constructPayload() {
        const payload = {
            ghost: this.ghostVersion.full,
            site_uuid: this.settingsCache.get('site_uuid'),
            url: this.config.get('url'),
            theme: this.settingsCache.get('active_theme')
        };

        try {
            const [totalPosts, lastPublishedAt, firstPublishedAt] = await Promise.all([
                this.posts.stats.getTotalPostsPublished(),
                this.posts.stats.getMostRecentlyPublishedPostDate(),
                this.posts.stats.getFirstPublishedPostDate()
            ]);

            payload.posts_total = totalPosts;
            payload.posts_last = lastPublishedAt ? lastPublishedAt.toISOString() : null;
            payload.posts_first = firstPublishedAt ? firstPublishedAt.toISOString() : null;
        } catch (err) {
            this.logging.warn('Failed to fetch post statistics', {
                error: err.message,
                context: 'explore-ping-service'
            });
            payload.posts_total = null;
            payload.posts_last = null;
            payload.posts_first = null;
        }

        if (this.settingsCache.get('explore_ping_growth')) {
            try {
                const totalMembers = await this.members.stats.getTotalMembers();
                const mrr = await this.members.stats.getMRRHistory();
                payload.members_total = totalMembers;
                payload.mrr = mrr;
            } catch (err) {
                this.logging.warn('Failed to fetch member statistics', {
                    error: err.message,
                    context: 'explore-ping-service'
                });
                payload.members_total = null;
                payload.mrr = null;
            }
        }

        return payload;
    }

    async makeRequest(exploreUrl, payload) {
        const json = JSON.stringify(payload);
        this.logging.info('Pinging Explore with Payload', exploreUrl, json);

        try {
            const response = await this.request(exploreUrl, {
                method: 'POST',
                body: json,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            this.logging.info('Explore Response', response.statusCode, response.statusMessage);

            return response;
        } catch (err) {
            this.logging.warn('Explore Error', err.message);
        }
    }

    async ping() {
        if (!this.labs.isSet('explore')) {
            return;
        }

        const exploreUrl = this.config.get('explore:update_url');
        if (!exploreUrl) {
            this.logging.warn('Explore URL not set');
            return;
        }

        if (!this.settingsCache.get('explore_ping')) {
            this.logging.info('Explore ping disabled');
            return;
        }

        const payload = await this.constructPayload();
        await this.makeRequest(exploreUrl, payload);
    }
};
