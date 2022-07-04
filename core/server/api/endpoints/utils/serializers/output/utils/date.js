const moment = require('moment-timezone');
const settingsCache = require('../../../../../../../shared/settings-cache');

const format = (date) => {
    return moment(date)
        .tz(settingsCache.get('timezone'))
        .toISOString(true);
};

const forPost = (attrs) => {
    ['created_at', 'updated_at', 'published_at'].forEach((field) => {
        if (attrs[field]) {
            attrs[field] = format(attrs[field]);
        }
    });

    return attrs;
};

module.exports.format = format;
module.exports.forPost = forPost;
