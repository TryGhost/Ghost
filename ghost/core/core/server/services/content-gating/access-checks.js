const nql = require('@tryghost/nql');
const {PERMIT_ACCESS, BLOCK_ACCESS} = require('./constants');

/**
 * @typedef {import ('./typings').AccessFlag} AccessFlag
 * @typedef {import ('./typings').GatedMember} GatedMember
 * @typedef {import ('./typings').GatedPost} GatedPost
 * @typedef {import ('./typings').GatedBlockParams} GatedBlockParams
 */

const MEMBER_NQL_EXPANSIONS = [{
    key: 'products',
    replacement: 'products.slug'
}, {
    key: 'product',
    replacement: 'products.slug'
}];

/**
 * Filters out keys from the input object that are not used for our content-gating.
 * Avoids unexpected behaviour when using NQL queries with unknown keys.
 *
 * @param {Object} input - The input object to be filtered.
 * @returns {Object} A new object containing only the allowed keys and their values.
 */
const rejectUnknownKeys = input => nql.utils.mapQuery(input, function (value, key) {
    if (!['product', 'products', 'status'].includes(key.toLowerCase())) {
        return;
    }

    return {
        [key]: value
    };
});

/**
 * Checks if a member has access to a post based on the post's visibility and the member's status.
 *
 * @param {GatedPost} post - The post object to check access for.
 * @param {GatedMember} member - The member object to check access against.
 * @returns {AccessFlag} - Returns `rue` if the member has access to the post, otherwise returns `false`
 */
module.exports.checkPostAccess = function checkPostAccess(post, member) {
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
};

/**
 *
 * @param {GatedBlockParams} gatedBlockParams Block-specific gating parameters extracted from source data
 * @param {GatedMember} member The member to check access against
 * @returns {AccessFlag} Returns `true` if the member has access to the block, otherwise returns `false`
 */
module.exports.checkGatedBlockAccess = function checkGatedBlockAccess(gatedBlockParams, member) {
    const {nonMember, memberSegment} = gatedBlockParams;
    const isLoggedIn = !!member;

    if (nonMember && !isLoggedIn) {
        return PERMIT_ACCESS;
    }

    if (!memberSegment && isLoggedIn) {
        return BLOCK_ACCESS;
    }

    if (memberSegment && member) {
        const nqlQuery = nql(memberSegment, {expansions: MEMBER_NQL_EXPANSIONS, transformer: rejectUnknownKeys});

        // if we only have unknown keys the NQL query will be empty and "pass" for all members
        // we should block access in this case to match the memberSegment:"" behaviour
        const parsedQuery = nqlQuery.parse();
        if (Object.keys(parsedQuery).length > 0) {
            return nqlQuery.queryJSON(member) ? PERMIT_ACCESS : BLOCK_ACCESS;
        }
    }

    return BLOCK_ACCESS;
};
