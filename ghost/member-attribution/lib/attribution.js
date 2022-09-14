/**
 * @typedef {object} AttributionResource
 * @prop {string|null} id
 * @prop {string|null} url (absolute URL)
 * @prop {'page'|'post'|'author'|'tag'|'url'} type
 * @prop {string|null} title
 */

class Attribution {
    /** @type {import('./url-translator')} */
    #urlTranslator;

    /**
     * @param {object} data
     * @param {string|null} [data.id]
     * @param {string|null} [data.url] Relative to subdirectory
     * @param {'page'|'post'|'author'|'tag'|'url'} [data.type]
     */
    constructor({id, url, type}, {urlTranslator}) {
        this.id = id;
        this.url = url;
        this.type = type;

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
            return {
                id: null,
                type: 'url',
                url: this.#urlTranslator.relativeToAbsolute(this.url),
                title: this.#urlTranslator.getUrlTitle(this.url)
            };
        }

        const updatedUrl = this.#urlTranslator.getUrlByResourceId(this.id, {absolute: true});

        return {
            id: model.id,
            type: this.type,
            url: updatedUrl,
            title: model.get('title') ?? model.get('name') ?? this.#urlTranslator.getUrlTitle(this.url)
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
        const model = await this.#urlTranslator.getResourceById(this.id, this.type, {absolute: true});
        return this.getResource(model);
    }
}

/**
 * Convert a UrlHistory to an attribution object
 */
class AttributionBuilder {
    /** @type {import('./url-translator')} */
    urlTranslator;

    /**
     */
    constructor({urlTranslator}) {
        this.urlTranslator = urlTranslator;
    }

    /**
     * Creates an Attribution object with the dependencies injected
     */
    build({id, url, type}) {
        return new Attribution({
            id,
            url,
            type
        }, {urlTranslator: this.urlTranslator});
    }

    /**
     * Last Post Algorithm™️
     * @param {import('./history').UrlHistoryArray} history
     * @returns {Promise<Attribution>}
     */
    async getAttribution(history) {
        if (history.length === 0) {
            return this.build({
                id: null,
                url: null,
                type: null
            });
        }

        // Note: history iterator is ordered from recent to oldest!

        // Start at the end. Return the first post we find
        const resources = [];
        for (const item of history) {
            const resource = await this.urlTranslator.getResourceDetails(item);

            if (resource && resource.type === 'post') {
                return this.build(resource);
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
                return this.build(resource);
            }
        }

        // No post/page/tag/author found?
        // Return the last path that was visited
        if (resources.length > 0) {
            return this.build(resources[0]);
        }

        // We only have history items without a path that have invalid ids
        return this.build({
            id: null,
            url: null,
            type: null
        });
    }
}

module.exports = AttributionBuilder;
