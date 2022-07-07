// {{total_members}} helper
const {api} = require('../services/proxy');
const {SafeString} = require('../services/handlebars');
const {memberCountRounding, getMemberStats} = require('../meta/member-count');

module.exports = async function total_paid_members () { //eslint-disable-line
    let memberStats = await api.stats.memberCountHistory.query();
    const {paid} = memberStats.meta.totals;
    return new SafeString(paid > 0 ? memberCountRounding(paid).toLowerCase() : false);
}

module.exports.async = true;
