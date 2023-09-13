const nql = require('@tryghost/nql');

// @ts-check
/** @typedef { boolean } AccessFlag */

const PERMIT_ACCESS = true;
const BLOCK_ACCESS = false;

// TODO: better place to store this?
const MEMBER_NQL_EXPANSIONS = [{
    key: 'products',
    replacement: 'products.slug'
}, {
    key: 'product',
    replacement: 'products.slug'
}];

const rejectUnknownKeys = input => nql.utils.mapQuery(input, function (value, key) {
    if (!['product', 'products', 'status'].includes(key.toLowerCase())) {
        return;
    }

    return {
        [key]: value
    };
});

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

    let visibility = post.visibility === 'paid' ? 'status:-free' : post.visibility;
    if (visibility === 'tiers') {
        if (!post.tiers) {
            return BLOCK_ACCESS;
        }
        visibility = post.tiers.map((product) => {
            return `product:'${product.slug}'`;
        }).join(',');
    }

    if (visibility && member.status && nql(visibility, {expansions: MEMBER_NQL_EXPANSIONS, transformer: rejectUnknownKeys}).queryJSON(member)) {
        return PERMIT_ACCESS;
    }

    return BLOCK_ACCESS;
}

module.exports = {
    checkPostAccess,
    PERMIT_ACCESS,
    BLOCK_ACCESS
};
