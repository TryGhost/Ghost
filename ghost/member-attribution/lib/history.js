/**
 * @typedef {UrlHistoryItem[]} UrlHistoryArray
 */

/**
 * @typedef {Object} UrlHistoryItem
 * @prop {string} path
 * @prop {number} time
 */

/**
 * Represents a validated history
 */
class UrlHistory {
    constructor(urlHistory) {
        this.history = urlHistory && UrlHistory.isValidHistory(urlHistory) ? urlHistory : [];
    }

    get length() {
        return this.history.length;
    }

    /**
     * Iterate from latest item to newest item (reversed!)
     */
    *[Symbol.iterator]() {
        yield* this.history.slice().reverse();
    }

    static isValidHistory(history) {
        return Array.isArray(history) && !history.find(item => !this.isValidHistoryItem(item));
    }

    static isValidHistoryItem(item) {
        return !!item && !!item.path && !!item.time && typeof item.path === 'string' && typeof item.time === 'number' && Number.isSafeInteger(item.time);
    }
}

module.exports = UrlHistory;
