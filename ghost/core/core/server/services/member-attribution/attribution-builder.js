/**
 * @typedef {object} AttributionResource
 * @prop {string|null} id
 * @prop {string|null} url (absolute URL)
 * @prop {'page'|'post'|'author'|'tag'|'url'|null} type
 * @prop {string|null} title
 * @prop {string|null} referrerSource
 * @prop {string|null} referrerMedium
 * @prop {string|null} referrerUrl
 * @prop {string|null} utmSource
 * @prop {string|null} utmMedium
 * @prop {string|null} utmCampaign
 * @prop {string|null} utmTerm
 * @prop {string|null} utmContent
 */

class Attribution {
    /** @type {import('./url-translator')} */
    #urlTranslator;

    /**
     * @param {object} data
     * @param {string|null} [data.id]
     * @param {string|null} [data.url] Relative to subdirectory
     * @param {'page'|'post'|'author'|'tag'|'url'|null} [data.type]
     * @param {string|null} [data.referrerSource]
     * @param {string|null} [data.referrerMedium]
     * @param {string|null} [data.referrerUrl]
     * @param {string|null} [data.utmSource]
     * @param {string|null} [data.utmMedium]
     * @param {string|null} [data.utmCampaign]
     * @param {string|null} [data.utmTerm]
     * @param {string|null} [data.utmContent]
     */
    constructor({
        id, url, type, referrerSource, referrerMedium, referrerUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent
    }, {urlTranslator}) {
        this.id = id;
        this.url = url;
        this.type = type;
        this.referrerSource = referrerSource;
        this.referrerMedium = referrerMedium;
        this.referrerUrl = referrerUrl;
        this.utmSource = utmSource;
        this.utmMedium = utmMedium;
        this.utmCampaign = utmCampaign;
        this.utmTerm = utmTerm;
        this.utmContent = utmContent;

        /**
         * @private
         */
        this.#urlTranslator = urlTranslator;
    }

    /**
     * Converts the instance to a parsed instance with more information about the resource included.
     * It does:
     * - Uses the passed model and adds a title to the attribution
     * - If the resource exists and has a new url, it updates the url if possible
     * - Returns an absolute URL instead of a relative one
     * @param {Object|null} [model] The Post/User/Tag model of the resource associated with this attribution
     * @returns {AttributionResource}
     */
    getResource(model) {
        if (!this.id || this.type === 'url' || !this.type || !model) {
            if (!this.url) {
                return {
                    id: null,
                    type: null,
                    url: null,
                    title: null,
                    referrerSource: this.referrerSource,
                    referrerMedium: this.referrerMedium,
                    referrerUrl: this.referrerUrl,
                    utmSource: this.utmSource,
                    utmMedium: this.utmMedium,
                    utmCampaign: this.utmCampaign,
                    utmTerm: this.utmTerm,
                    utmContent: this.utmContent
                };
            }
            return {
                id: null,
                type: 'url',
                url: this.#urlTranslator.relativeToAbsolute(this.url),
                title: this.#urlTranslator.getUrlTitle(this.url),
                referrerSource: this.referrerSource,
                referrerMedium: this.referrerMedium,
                referrerUrl: this.referrerUrl,
                utmSource: this.utmSource,
                utmMedium: this.utmMedium,
                utmCampaign: this.utmCampaign,
                utmTerm: this.utmTerm,
                utmContent: this.utmContent
            };
        }

        const updatedUrl = this.#urlTranslator.getUrlByResourceId(this.id, {absolute: true});

        return {
            id: model.id,
            type: this.type,
            url: updatedUrl,
            title: model.get('title') ?? model.get('name') ?? this.#urlTranslator.getUrlTitle(this.url),
            referrerSource: this.referrerSource,
            referrerMedium: this.referrerMedium,
            referrerUrl: this.referrerUrl,
            utmSource: this.utmSource,
            utmMedium: this.utmMedium,
            utmCampaign: this.utmCampaign,
            utmTerm: this.utmTerm,
            utmContent: this.utmContent
        };
    }

    /**
     * Same as getResource, but fetches the model by ID instead of passing it as a parameter
     */
    async fetchResource() {
        if (!this.id || this.type === 'url' || !this.type) {
            // No fetch required
            return this.getResource();
        }

        // Fetch model
        const model = await this.#urlTranslator.getResourceById(this.id, this.type);
        return this.getResource(model);
    }
}

/**
 * Convert a UrlHistory to an attribution object
 */
class AttributionBuilder {
    /** @type {import('./url-translator')} */
    urlTranslator;
    /** @type {import('./referrer-translator')} */
    referrerTranslator;

    /**
     */
    constructor({urlTranslator, referrerTranslator}) {
        this.urlTranslator = urlTranslator;
        this.referrerTranslator = referrerTranslator;
    }

    /**
     * Creates an Attribution object with the dependencies injected
     */
    build({id, url, type, referrerSource, referrerMedium, referrerUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent}) {
        return new Attribution({
            id,
            url,
            type,
            referrerSource,
            referrerMedium,
            referrerUrl,
            utmSource,
            utmMedium,
            utmCampaign,
            utmTerm,
            utmContent
        }, {urlTranslator: this.urlTranslator});
    }

    /**
     * Last Post Algorithm™️
     * @param {import('./url-history').UrlHistoryArray} history
     * @returns {Promise<Attribution>}
     */
    async getAttribution(history) {
        if (history.length === 0) {
            return this.build({
                id: null,
                url: null,
                type: null,
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null,
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            });
        }

        const referrerData = this.referrerTranslator.getReferrerDetails(history) || {
            referrerSource: null,
            referrerMedium: null,
            referrerUrl: null,
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
            utmTerm: null,
            utmContent: null
        };

        // Start at the end. Return the first post we find
        const resources = [];

        // Note: history iterator is ordered from recent to oldest!
        for (const item of history) {
            const resource = await this.urlTranslator.getResourceDetails(item);

            if (resource && resource.type === 'post') {
                return this.build({
                    ...resource,
                    ...referrerData
                });
            }

            // Store to avoid that we need to look it up again
            if (resource) {
                resources.push(resource);
            }
        }

        // No post found?
        // Return first with an id (page, tag, author)
        for (const resource of resources) {
            if (resource.id) {
                return this.build({
                    ...resource,
                    ...referrerData
                });
            }
        }

        // No post/page/tag/author found?
        // Return the last path that was visited
        if (resources.length > 0) {
            return this.build({
                ...referrerData,
                ...resources[0]
            });
        }

        // We only have history items without a path that have invalid ids
        return this.build({
            id: null,
            url: null,
            type: null,
            ...referrerData
        });
    }
}

module.exports = AttributionBuilder;
