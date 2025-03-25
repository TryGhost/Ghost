module.exports = class ExplorePingService {
    /**
     * @param {object} deps
     * @param {{getPublic: () => import('../../../shared/settings-cache/CacheManager').PublicSettingsCache}} deps.settingsCache
     * @param {object} deps.config
     * @param {object} deps.labs
     * @param {object} deps.logging
     * @param {object} deps.ghostVersion
     * @param {object} deps.request
     */
    constructor({settingsCache, config, labs, logging, ghostVersion, request}) {
        this.settingsCache = settingsCache;
        this.config = config;
        this.labs = labs;
        this.logging = logging;
        this.ghostVersion = ghostVersion;
        this.request = request;
    }

    constructPayload() {
        /* eslint-disable camelcase */
        const {title, description, icon, locale, accent_color, twitter, facebook} = this.settingsCache.getPublic();
        return {
            ghost: this.ghostVersion.full,
            url: this.config.get('url'),
            title,
            description,
            icon,
            locale,
            accent_color,
            twitter,
            facebook
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
        const exploreUrl = this.config.get('explore:url');

        if (!this.labs.isSet('explore')) {
            return;
        }

        if (!exploreUrl) {
            this.logging.warn('Explore URL not set');
            return;
        }

        const payload = this.constructPayload();
        await this.makeRequest(exploreUrl, payload);
    }
};
