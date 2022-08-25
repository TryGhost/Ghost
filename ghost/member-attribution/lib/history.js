/**
 * @typedef {Object} UrlHistoryItem
 * @prop {string} path
 * @prop {number} time
 */

/**
 * @typedef {UrlHistoryItem[]} UrlHistoryArray
 */

/**
 * Represents a validated history
 */
class UrlHistory {
    /**
     * @private
     * @param {UrlHistoryArray} urlHistory
     */
    constructor(urlHistory) {
        /** @private */
        this.history = urlHistory;
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

    /**
     * @private
     * @param {any[]} history
     * @returns {boolean}
     */
    static isValidHistory(history) {
        for (const item of history) {
            if (typeof item?.path !== 'string' || !Number.isSafeInteger(item?.time)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param {unknown} urlHistory
     * @returns {UrlHistory}
     */
    static create(urlHistory) {
        if (!Array.isArray(urlHistory)) {
            return new UrlHistory([]);
        }

        if (!this.isValidHistory(urlHistory)) {
            return new UrlHistory([]);
        }

        const now = Date.now();
        const filteredHistory = urlHistory.filter((item) => {
            return now - item.time < this.MAX_AGE;
        });

        return new UrlHistory(filteredHistory);
    }

    /**
     * @private
     */
    static MAX_AGE = 1000 * 60 * 60 * 24;
}

module.exports = UrlHistory;
