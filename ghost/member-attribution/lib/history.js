/**
 * @typedef {object} Attribution
 * @prop {string|null} [id]
 * @prop {string|null} [url]
 * @prop {string} [type]
 */

/**
 * @typedef {AttributionHistoryItem[]} UrlHistory
 */

/**
 * @typedef {Object} AttributionHistoryItem
 * @prop {string} path
 * @prop {number} time
 */

class UrlHistory {
    /**
     * @param {UrlHistory} [urlHistory]
     */
    constructor(urlHistory) {
        this.history = urlHistory && UrlHistory.isValidHistory(urlHistory) ? urlHistory : [];
    }

    static isValidHistory(history) {
        return Array.isArray(history) && !history.find(item => !this.isValidHistoryItem(item));
    }

    static isValidHistoryItem(item) {
        return !!item && !!item.path && !!item.time && typeof item.path === 'string' && typeof item.time === 'number' && Number.isSafeInteger(item.time);
    }
    
    /**
     * Last Post Algorithm™️
     * @returns {Attribution}
     */
    getAttribution() {
        if (this.history.length === 0) {
            return {
                id: null,
                url: null,
                type: null
            };
        }

        // Possible source_types at this point (we don't need to use source here)
        // - post
        // - page
        // - tag (keep implementation for last)
        // - url (couldn't find a page or post)
        const item = this.history[this.history.length - 1];

        return {
            id: null,
            url: item.path,
            type: 'url'
        };
    }
}

module.exports = UrlHistory;
