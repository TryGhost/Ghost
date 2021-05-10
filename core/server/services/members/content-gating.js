const nql = require('@nexes/nql');

// @ts-check
/** @typedef { boolean } AccessFlag */

const PERMIT_ACCESS = true;
const BLOCK_ACCESS = false;

// TODO: better place to store this?
const MEMBER_NQL_EXPANSIONS = [{
    key: 'labels',
    replacement: 'labels.slug'
}, {
    key: 'label',
    replacement: 'labels.slug'
}, {
    key: 'products',
    replacement: 'products.slug'
}, {
    key: 'product',
    replacement: 'products.slug'
}];

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

    const visibility = post.visibility === 'paid' ? 'status:-free' : post.visibility;

    if (visibility && member.status && nql(visibility, {expansions: MEMBER_NQL_EXPANSIONS}).queryJSON(member)) {
        return PERMIT_ACCESS;
    }

    return BLOCK_ACCESS;
}

module.exports = {
    checkPostAccess,
    PERMIT_ACCESS,
    BLOCK_ACCESS
};
