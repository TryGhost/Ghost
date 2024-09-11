const moment = require('moment-timezone');

/**
 * A cache that stores all the member ids that have been seen today
 * @class LastSeenAtCache
 * @constructor
 * @param {Object} settingsCache - An instance of the settings cache
 * @property {Set} _cache - A set that stores all the member ids that have been seen today
 * @property {Object} _settingsCache - An instance of the settings cache
 * @property {string} _startOfDay - The start of the current day in the site timezone, formatted in ISO 8601
 * @method add - Adds a member id to the cache
 * @method shouldUpdateMember - Checks if a member should be updated
 * @method clear - Clears the cache
 * 
 */
class LastSeenAtCache {
    constructor({settingsCache}) {
        this._cache = new Set();
        this._settingsCache = settingsCache;
        this._startOfDay = this._getStartOfCurrentDay();
    }

    add(memberId) {
        this._cache.add(memberId);
    }

    shouldUpdateMember(memberId) {
        return !this._has(memberId);
    }

    clear() {
        this._cache.clear();
    }

    _has(memberId) {
        this._refresh();
        return this._cache.has(memberId);
    }

    _shouldClear() {
        return this._startOfDay !== this._getStartOfCurrentDay();
    }

    _refresh() {
        if (this._shouldClear()) {
            this.clear();
            this._startOfDay = this._getStartOfCurrentDay();
        }
    }

    /**
     * Returns the start of the current day in the site timezone
     * @returns {string} The start of the current day in the site timezone, formatted as a ISO 8601 string
     */
    _getStartOfCurrentDay() {
        const timezone = this._settingsCache.get('timezone') || 'Etc/UTC';
        return moment().tz(timezone).startOf('day').utc().toISOString();
    }
}

module.exports = LastSeenAtCache;