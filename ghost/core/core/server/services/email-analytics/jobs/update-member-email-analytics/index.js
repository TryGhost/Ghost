const queries = require('../../lib/queries');
 
/**
 * Updates email analytics for a specific member
 * 
 * @param {Object} options - The options object
 * @param {string} options.memberId - The ID of the member to update analytics for
 * @returns {Promise<Object>} The result of the aggregation query (1/0)
 */
module.exports = async function updateMemberEmailAnalytics({memberId}) {
    const result = await queries.aggregateMemberStats(memberId);
    return result;
};