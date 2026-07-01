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
 * Builds the NQL member filter describing which members have access to a post's
 * gated content, based purely on its `visibility`. This is the single source of
 * truth for "who can read this post" — shared between the web content gating
 * (checkPostAccess) and the email sending pipeline (segmentation), so the two
 * can never drift apart.
 *
 * Note: `public` and `members` are handled by the callers (they don't reduce to
 * a member-status filter); this only produces the filter for the gated cases.
 *
 * @param {object} post - A post object
 * @returns {string|null} An NQL member filter, or null when the post's tiers are
 *   misconfigured so that no member should have access.
 */
function getPostAccessFilter(post) {
    if (post.visibility === 'paid') {
        return 'status:-free';
    }

    if (post.visibility === 'tiers') {
        if (!post.tiers) {
            return null;
        }
        return post.tiers.map((product) => {
            return `product:'${product.slug}'`;
        }).join(',') || null;
    }

    return post.visibility;
}

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

    const visibility = getPostAccessFilter(post);

    if (visibility && member.status && nql(visibility, {expansions: MEMBER_NQL_EXPANSIONS, transformer: rejectUnknownKeys}).queryJSON(member)) {
        return PERMIT_ACCESS;
    }

    return BLOCK_ACCESS;
}

function checkGatedBlockAccess(gatedBlockParams, member) {
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
}

module.exports = {
    getPostAccessFilter,
    checkPostAccess,
    checkGatedBlockAccess,
    PERMIT_ACCESS,
    BLOCK_ACCESS
};
