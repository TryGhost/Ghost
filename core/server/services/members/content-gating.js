// @ts-check
/** @typedef { boolean } AccessFlag */

const PERMIT_ACCESS = true;
const BLOCK_ACCESS = false;

/**
 * @param {object} post - A post object to check access to
 * @param {object} member - The member whos access should be checked
 *
 * @returns {AccessFlag}
 */
function checkPostAccess(post, member) {
    if (post.visibility === 'public') {
        return PERMIT_ACCESS;
    }

    if (!member) {
        return BLOCK_ACCESS;
    }

    if (post.visibility === 'members') {
        return PERMIT_ACCESS;
    }

    const memberHasPlan = member.stripe && member.stripe.subscriptions && member.stripe.subscriptions.length;

    if (post.visibility === 'paid' && memberHasPlan) {
        return PERMIT_ACCESS;
    }

    return BLOCK_ACCESS;
}

module.exports = {
    checkPostAccess,
    PERMIT_ACCESS,
    BLOCK_ACCESS
};
