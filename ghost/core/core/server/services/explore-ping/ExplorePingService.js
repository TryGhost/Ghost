module.exports = class ExplorePingService {
    constructor({PublicConfigService, config, labs, logging, ghostVersion, request}) {
        this.PublicConfigService = PublicConfigService;
        this.config = config;
        this.labs = labs;
        this.logging = logging;
        this.ghostVersion = ghostVersion;
        this.request = request;
    }

    constructPayload() {
        const {url, title, description, icon, locale, twitter, facebook} = this.PublicConfigService.site;
        return {
            ghost: this.ghostVersion.full,
            url,
            title,
            description,
            icon,
            locale,
            twitter,
            facebook
        };
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
