// # Total Members Helper
// Usage: `{{total_members}}`

const {SafeString} = require('../services/handlebars');
const {memberCountRounding, getMemberStats} = require('../utils/member-count');

module.exports = async function total_members () { //eslint-disable-line
    let memberStats = await getMemberStats() || {total: 0};
    const {total} = memberStats;
    return new SafeString(total > 0 ? memberCountRounding(total) : total);
};

module.exports.async = true;
