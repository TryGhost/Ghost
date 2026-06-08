const moment = require('moment-timezone');

/**
 * A cache that stores the member ids that have been seen today. This cache is used to avoid having to query the database for the last_seen_at timestamp of a member multiple times in the same day.
 * 
 * @constructor
 * @param {Object} settingsCache - An instance of the settings cache
 * @property {Set} _cache - A set that stores all the member ids that have been seen today
 * @property {Object} _settingsCache - An instance of the settings cache
 * @property {string} _startOfDay - The start of the current day in the site timezone, formatted in ISO 8601
 */
class LastSeenAtCache {
    /**
     * 
     * @param {Object} deps - Dependencies
     * @param {Object} deps.services - The list of service dependencies
     * @param {Object} deps.services.settingsCache - The settings service
     */
    constructor({services: {settingsCache}}) {
        this._cache = new Set();
        this._settingsCache = settingsCache;
        this._startOfDay = this._getStartOfCurrentDay();
    }

    /**
     * @method add - Adds a member id to the cache
     * @param {string} memberId 
     */
    add(memberId) {
        this._cache.add(memberId);
    }

    /**
     * @method remove - Removes a member id from the cache
     * @param {string} memberId 
     */
    remove(memberId) {
        this._cache.delete(memberId);
    }

    /**
     * @method shouldUpdateMember - Checks if a member should be updated
     * @param {string} memberId 
     * @returns {boolean} - Returns true if the member should be updated
     */
    shouldUpdateMember(memberId) {
        return !this._has(memberId);
    }

    /**
     * @method clear - Clears the cache
     */
    clear() {
        this._cache.clear();
    }

    /**
     * @method _has - Refreshes the cache and checks if a member id is in the cache
     * @param {string} memberId 
     * @returns {boolean}
     */
    _has(memberId) {
        this._refresh();
        return this._cache.has(memberId);
    }

    /**
     * @method _shouldClear - Checks if the cache should be cleared, based on the current day
     * @returns {boolean} - Returns true if the cache should be cleared
     */
    _shouldClear() {
        return this._startOfDay !== this._getStartOfCurrentDay();
    }

    /**
     * @method _refresh - Clears the cache if the day has changed
     */
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
        const startOfDay = moment().tz(timezone).startOf('day').utc().toISOString();
        return startOfDay;
    }
}

module.exports = LastSeenAtCache;