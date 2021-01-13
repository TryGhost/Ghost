const moment = require('moment-timezone');
const Promise = require('bluebird');
const db = require('../../../data/db');

const stats = async ({siteTimezone, days, isSQLite}) => {
    const dateFormat = 'YYYY-MM-DD HH:mm:ss';
    const tzOffsetMins = moment.tz(siteTimezone).utcOffset();

    // get total members before other stats because the figure is used multiple times
    async function getTotalMembers() {
        const result = await db.knex.raw('SELECT COUNT(id) AS total FROM members');
        return isSQLite ? result[0].total : result[0][0].total;
    }
    const totalMembers = await getTotalMembers();

    async function getTotalMembersInRange() {
        if (days === 'all-time') {
            return totalMembers;
        }

        const startOfRange = moment.tz(siteTimezone).subtract(days - 1, 'days').startOf('day').utc().format(dateFormat);
        const result = await db.knex.raw('SELECT COUNT(id) AS total FROM members WHERE created_at >= ?', [startOfRange]);
        return isSQLite ? result[0].total : result[0][0].total;
    }

    async function getTotalMembersOnDatesInRange() {
        const startOfRange = moment.tz(siteTimezone).subtract(days - 1, 'days').startOf('day').utc().format(dateFormat);
        let result;

        if (isSQLite) {
            const dateModifier = `${Math.sign(tzOffsetMins) === -1 ? '' : '+'}${tzOffsetMins} minutes`;

            result = await db.knex('members')
                .select(db.knex.raw('DATE(created_at, ?) AS created_at, COUNT(DATE(created_at, ?)) AS count', [dateModifier, dateModifier]))
                .where((builder) => {
                    if (days !== 'all-time') {
                        builder.whereRaw('created_at >= ?', [startOfRange]);
                    }
                }).groupByRaw('DATE(created_at, ?)', [dateModifier]);
        } else {
            const mins = Math.abs(tzOffsetMins) % 60;
            const hours = (Math.abs(tzOffsetMins) - mins) / 60;
            const utcOffset = `${Math.sign(tzOffsetMins) === -1 ? '-' : '+'}${hours}:${mins < 10 ? '0' : ''}${mins}`;

            result = await db.knex('members')
                .select(db.knex.raw('DATE(CONVERT_TZ(created_at, \'+00:00\', ?)) AS created_at, COUNT(CONVERT_TZ(created_at, \'+00:00\', ?)) AS count', [utcOffset, utcOffset]))
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

    async function getNewMembersToday() {
        const startOfToday = moment.tz(siteTimezone).startOf('day').utc().format(dateFormat);
        const result = await db.knex.raw('SELECT count(id) AS total FROM members WHERE created_at >= ?', [startOfToday]);
        return isSQLite ? result[0].total : result[0][0].total;
    }

    // perform final calculations in parallel
    const results = await Promise.props({
        total: totalMembers,
        total_in_range: getTotalMembersInRange(),
        total_on_date: getTotalMembersOnDatesInRange(),
        new_today: getNewMembersToday()
    });

    return results;
};

module.exports = stats;
