/**
 * @typedef {Object} UrlHistoryItem
 * @prop {string} [path]
 * @prop {string} [id]
 * @prop {string} [type]
 * @prop {string} [referrerSource]
 * @prop {string} [referrerMedium]
 * @prop {string} [referrerUrl]
 * @prop {string} [utmSource]
 * @prop {string} [utmMedium]
 * @prop {string} [utmCampaign]
 * @prop {string} [utmTerm]
 * @prop {string} [utmContent]
 * @prop {number} time
 */

/**
 * @typedef {UrlHistoryItem[]} UrlHistoryArray
 */

/**
 * Types allowed to add in the URLHistory manually
 */
const ALLOWED_TYPES = ['post'];

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
     * @returns {history is UrlHistoryArray}
     */
    static isValidHistory(history) {
        for (const item of history) {
            const isValidIdEntry = typeof item?.id === 'string' && typeof item?.type === 'string' && ALLOWED_TYPES.includes(item.type);
            const isValidPathEntry = typeof item?.path === 'string';
            const isValidReferrerSource = typeof item?.referrerSource === 'string';

            const isValidEntry = isValidPathEntry || isValidIdEntry || isValidReferrerSource;

            if (!isValidEntry || !Number.isSafeInteger(item?.time)) {
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
