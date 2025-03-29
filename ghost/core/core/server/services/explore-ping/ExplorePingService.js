module.exports = class ExplorePingService {
    /**
     * @param {object} deps
     * @param {{getPublic: () => import('../../../shared/settings-cache/CacheManager').PublicSettingsCache}} deps.settingsCache
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
        /* eslint-disable camelcase */
        const {title, description, icon, locale, accent_color, twitter, facebook} = this.settingsCache.getPublic();

        // Get post statistics
        const [totalPosts, lastPublishedAt, firstPublishedAt] = await Promise.all([
            this.posts.stats.getTotalPostsPublished(),
            this.posts.stats.getMostRecentlyPublishedPostDate(),
            this.posts.stats.getFirstPublishedPostDate()
        ]);

        // Get member statistics with error handling
        let totalMembers = null;
        try {
            totalMembers = await this.members.stats.getTotalMembers();
        } catch (err) {
            this.logging.warn('Failed to fetch member statistics', {
                error: err.message,
                context: 'explore-ping-service'
            });
            // Continue without member statistics
        }

        return {
            ghost: this.ghostVersion.full,
            url: this.config.get('url'),
            title,
            description,
            icon,
            locale,
            accent_color,
            twitter,
            facebook,
            posts_first: firstPublishedAt ? firstPublishedAt.toISOString() : null,
            posts_last: lastPublishedAt ? lastPublishedAt.toISOString() : null,
            posts_total: totalPosts,
            members_total: totalMembers
        };
        /* eslint-enable camelcase */
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

        const exploreUrl = this.config.get('explore:url');
        if (!exploreUrl) {
            this.logging.warn('Explore URL not set');
            return;
        }

        const payload = await this.constructPayload();
        await this.makeRequest(exploreUrl, payload);
    }
};
