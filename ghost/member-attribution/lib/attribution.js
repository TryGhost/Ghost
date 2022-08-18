/**
 * @typedef {object} Attribution
 * @prop {string|null} [id]
 * @prop {string|null} [url]
 * @prop {string} [type]
 */

/**
 * Convert a UrlHistory to an attribution object
 */
class AttributionBuilder {
    /**
     */
    constructor({urlTranslator}) {
        this.urlTranslator = urlTranslator;
    }

    /**
     * Last Post Algorithm™️
     * @param {UrlHistory} history
     * @returns {Attribution}
     */
    getAttribution(history) {
        if (history.length === 0) {
            return {
                id: null,
                url: null,
                type: null
            };
        }

        // TODO: if something is wrong with the attribution script, and it isn't loading
        // we might get out of date URLs
        // so we need to check the time of each item and ignore items that are older than 24u here!

        // Start at the end. Return the first post we find
        for (const item of history) {
            const typeId = this.urlTranslator.getTypeAndId(item.path);

            if (typeId && typeId.type === 'post') {
                return {
                    url: item.path,
                    ...typeId
                };
            }
        }

        // No post found?
        // Try page or tag or author
        for (const item of history) {
            const typeId = this.urlTranslator.getTypeAndId(item.path);

            if (typeId) {
                return {
                    url: item.path,
                    ...typeId
                };
            }
        }

        // Default to last URL
        // In the future we might decide to exclude certain URLs, that can happen here
        return {
            id: null,
            url: history.last.path,
            type: 'url'
        };
    }
}

module.exports = AttributionBuilder;
