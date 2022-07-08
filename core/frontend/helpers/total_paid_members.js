// {{total_paid_members}} helper

const {SafeString} = require('../services/handlebars');
const {memberCountRounding, getMemberStats} = require('../utils/member-count');

module.exports = async function total_paid_members () { //eslint-disable-line
    let memberStats = await getMemberStats();
    const {paid} = memberStats;
    return new SafeString(paid > 0 ? memberCountRounding(paid) : 0);
};

module.exports.async = true;
