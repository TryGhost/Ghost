// # Total Members Helper
// Usage: `{{total_members}}`

const {SafeString} = require('../services/handlebars');
const {memberCountRounding, getMemberStats} = require('../utils/member-count');

module.exports = async function total_members () { //eslint-disable-line
    if (this.total) {
        return new SafeString(memberCountRounding(this.total));
    } else {
        let memberStats = await getMemberStats();
        const {total} = memberStats;
        return new SafeString(total > 0 ? memberCountRounding(total) : 0);
    }
};

module.exports.async = true;
