// {{total_paid_members}} helper

const { SafeString } = require('../services/handlebars');
const { memberCountRounding, getMemberStats } = require('../utils/member-count');

// eslint-disable-next-line
module.exports = async function total_paid_members() {
  if (this.paid) {
    return new SafeString(memberCountRounding(this.paid));
  } else {
    let memberStats = await getMemberStats();
    const { paid } = memberStats;
    return new SafeString(paid > 0 ? memberCountRounding(paid) : 0);
  }
};

module.exports.async = true;
