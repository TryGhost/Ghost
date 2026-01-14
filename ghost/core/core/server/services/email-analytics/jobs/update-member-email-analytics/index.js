const queries = require('../../lib/queries');

/**
 * Updates email analytics for a specific member
 *
 * @param {Object} options - The options object
 * @param {string} options.memberId - The ID of the member to update analytics for
 * @returns {Promise<Object>} The result of the aggregation query (1/0)
 */
module.exports = async function updateMemberEmailAnalytics({memberId}) {
    // Use the batch method with a single member for consistency
    const result = await queries.aggregateMemberStatsBatch([memberId]);
    return result;
};