// {{total_paid_members}} helper

const {SafeString} = require('../services/handlebars');
const {memberCountRounding, getMemberStats} = require('../utils/member-count');

module.exports = async function total_paid_members () { //eslint-disable-line
    let memberStats = await getMemberStats() || {paid: 0};
    const {paid} = memberStats;
    return new SafeString(paid > 0 ? memberCountRounding(paid) : paid);
};

module.exports.async = true;
