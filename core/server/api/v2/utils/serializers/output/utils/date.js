const moment = require('moment-timezone');
const settingsCache = require('../../../../../../services/settings/cache');

const format = (date) => {
    return moment(date)
        .tz(settingsCache.get('active_timezone'))
        .toISOString(true);
};

module.exports.format = format;
