const moment = require('moment-timezone');
const Promise = require('bluebird');

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
        const results = await Promise.props({
            total: totalMembers,
            total_in_range: this.getTotalMembersInRange({days, totalMembers, siteTimezone}),
            total_on_date: this.getTotalMembersOnDatesInRange({days, totalMembers, siteTimezone}),
            new_today: this.getNewMembersToday({siteTimezone})
        });

        return results;
    }

    async getTotalMembersByStatus() {
        const [rows] = await this._db.knex.raw('SELECT status, COUNT(id) AS total FROM members GROUP BY status');
        const paidEvent = rows.find(c => c.status === 'paid');
        const freeEvent = rows.find(c => c.status === 'free');
        const compedEvent = rows.find(c => c.status === 'comped');

        return {
            paid: paidEvent ? paidEvent.total : 0,
            free: freeEvent ? freeEvent.total : 0,
            comped: compedEvent ? compedEvent.total : 0
        };
    }

    async getTotalMembersByStatusHistory() {
        const knex = this._db.knex;
        const rows = await knex('members_status_events')
            .select(knex.raw('DATE(created_at) as date'))
            .select(knex.raw(`SUM(
                CASE WHEN to_status='paid' THEN 1
                ELSE 0 END
            ) as paid_subscribed`))
            .select(knex.raw(`SUM(
                CASE WHEN from_status='paid' THEN 1
                ELSE 0 END
            ) as paid_canceled`))
            .select(knex.raw(`SUM(
                CASE WHEN to_status='comped' THEN 1
                WHEN from_status='comped' THEN -1
                ELSE 0 END
            ) as comped_delta`))
            .select(knex.raw(`SUM(
                CASE WHEN to_status='free' THEN 1
                WHEN from_status='free' THEN -1
                ELSE 0 END
            ) as free_delta`))
            .groupByRaw('DATE(created_at)')
            .orderByRaw('DATE(created_at) DESC');

        // Fetch current total amounts and start counting from there
        let {paid, free, comped} = await this.getTotalMembersByStatus();

        const today = moment.utc().format('YYYY-MM-DD');

        const cumulativeResults = [];
        for (const row of rows) {
            const date = moment(row.date).format('YYYY-MM-DD');
            if (date > today) {
                // Skip results that are in the future (fix for invalid events)
                continue;
            }
            cumulativeResults.unshift({
                date,
                paid,
                free,
                comped,

                // Deltas
                paid_subscribed: row.paid_subscribed,
                paid_canceled: row.paid_canceled
            });

            // Update current counts
            paid = Math.max(0, paid - row.paid_subscribed + row.paid_canceled);
            free = Math.max(0, free - row.free_delta);
            comped = Math.max(0, comped - row.comped_delta);
        }

        // Always make sure we have at least one result
        if (cumulativeResults.length === 0) {
            cumulativeResults.push({
                date: today,
                paid,
                free,
                comped,

                // Deltas
                paid_subscribed: 0,
                paid_canceled: 0
            });
        }

        return cumulativeResults;
    }
}

module.exports = MembersStats;
