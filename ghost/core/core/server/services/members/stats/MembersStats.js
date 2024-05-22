const moment = require('moment-timezone');

const dateFormat = 'YYYY-MM-DD HH:mm:ss';
class MembersStats {
    /**
     * @param {Object} config
     * @param {Object} config.db - an instance holding knex connection to the database
     * @param {Object} config.settingsCache - an instance of the Ghost Settings Cache
     * @param {Boolean} config.isSQLite - flag identifying if storage is connected to SQLite
     */
    constructor({db, settingsCache, isSQLite}) {
        this._db = db;
        this._settingsCache = settingsCache;
        this._isSQLite = isSQLite;
    }

    /**
     * Fetches count of all members
     */
    async getTotalMembers() {
        const result = await this._db.knex.raw('SELECT COUNT(id) AS total FROM members');
        return this._isSQLite ? result[0].total : result[0][0].total;
    }

    /**
     *
     * @param {Number | String} days  - number of days to fetch of 'all-time' to get for all existing records
     * @param {Number} totalMembers - number of registered members
     * @param {String} siteTimezone - site's current timezone
     */
    async getTotalMembersInRange({days, totalMembers, siteTimezone}) {
        if (days === 'all-time') {
            return totalMembers;
        }

        const startOfRange = moment.tz(siteTimezone).subtract(days - 1, 'days').startOf('day').utc().format(dateFormat);
        const result = await this._db.knex.raw('SELECT COUNT(id) AS total FROM members WHERE created_at >= ?', [startOfRange]);
        return this._isSQLite ? result[0].total : result[0][0].total;
    }

    /**
     * Fetches member signups for current day
     *
     * @param {String} siteTimezone - site's current timezone
     */
    async getNewMembersToday({siteTimezone}) {
        const startOfToday = moment.tz(siteTimezone).startOf('day').utc().format(dateFormat);
        const result = await this._db.knex.raw('SELECT count(id) AS total FROM members WHERE created_at >= ?', [startOfToday]);
        return this._isSQLite ? result[0].total : result[0][0].total;
    }

    /**
     *
     * @param {Number | String} days  - number of days to fetch of 'all-time' to get for all existing records
     * @param {Number} totalMembers - number of registered members
     * @param {String} siteTimezone - site's current timezone
     */
    async getTotalMembersOnDatesInRange({days, totalMembers, siteTimezone}) {
        const startOfRange = moment.tz(siteTimezone).subtract(days - 1, 'days').startOf('day').utc().format(dateFormat);
        const tzOffsetMins = moment.tz(siteTimezone).utcOffset();

        let result;

        if (this._isSQLite) {
            const dateModifier = `${Math.sign(tzOffsetMins) === -1 ? '' : '+'}${tzOffsetMins} minutes`;

            result = await this._db.knex('members')
                .select(this._db.knex.raw('DATE(created_at, ?) AS created_at, COUNT(DATE(created_at, ?)) AS count', [dateModifier, dateModifier]))
                .where((builder) => {
                    if (days !== 'all-time') {
                        builder.whereRaw('created_at >= ?', [startOfRange]);
                    }
                }).groupByRaw('DATE(created_at, ?)', [dateModifier]);
        } else {
            const mins = Math.abs(tzOffsetMins) % 60;
            const hours = (Math.abs(tzOffsetMins) - mins) / 60;
            const utcOffset = `${Math.sign(tzOffsetMins) === -1 ? '-' : '+'}${hours}:${mins < 10 ? '0' : ''}${mins}`;

            result = await this._db.knex('members')
                .select(this._db.knex.raw('DATE(CONVERT_TZ(created_at, \'+00:00\', ?)) AS created_at, COUNT(CONVERT_TZ(created_at, \'+00:00\', ?)) AS count', [utcOffset, utcOffset]))
                .where((builder) => {
                    if (days !== 'all-time') {
                        builder.whereRaw('created_at >= ?', [startOfRange]);
                    }
                })
                .groupByRaw('DATE(CONVERT_TZ(created_at, \'+00:00\', ?))', [utcOffset]);
        }

        // sql doesn't return rows with a 0 count so we build an object
        // with sparse results to reference by date rather than performing
        // multiple finds across an array
        const resultObject = {};
        result.forEach((row) => {
            resultObject[moment(row.created_at).format('YYYY-MM-DD')] = row.count;
        });

        // loop over every date in the range so we can return a contiguous range object
        const totalInRange = Object.values(resultObject).reduce((acc, value) => acc + value, 0);
        let runningTotal = totalMembers - totalInRange;
        let currentRangeDate;

        if (days === 'all-time') {
            // start from the date of first created member
            currentRangeDate = moment(moment(result[0].created_at).format('YYYY-MM-DD')).tz(siteTimezone);
        } else {
            currentRangeDate = moment.tz(siteTimezone).subtract(days - 1, 'days');
        }

        let endDate = moment.tz(siteTimezone).add(1, 'hour');
        const output = {};

        while (currentRangeDate.isBefore(endDate)) {
            let dateStr = currentRangeDate.format('YYYY-MM-DD');
            runningTotal += resultObject[dateStr] || 0;
            output[dateStr] = runningTotal;

            currentRangeDate = currentRangeDate.add(1, 'day');
        }

        return output;
    }

    /**
     * Fetches member's signup statistics
     *
     * @param {Number | String} days  - number of days to fetch of 'all-time' to get for all existing records
     */
    async fetch(days) {
        const siteTimezone = this._settingsCache.get('timezone');
        const totalMembers = await this.getTotalMembers();

        // perform final calculations in parallel
        const [total, totalInRange, totalOnDate, newToday] = await Promise.all([
            totalMembers,
            this.getTotalMembersInRange({days, totalMembers, siteTimezone}),
            this.getTotalMembersOnDatesInRange({days, totalMembers, siteTimezone}),
            this.getNewMembersToday({siteTimezone})
        ]);

        return {
            total,
            total_in_range: totalInRange,
            total_on_date: totalOnDate,
            new_today: newToday
        };
    }
}

module.exports = MembersStats;
