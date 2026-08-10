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

/**
 * The tier slugs a parsed member segment names positively. Negations are
 * skipped — they describe members who lack a tier, which adds nothing to the
 * member shape checkSegmentPostAccess rebuilds.
 * @param {object} query - A parsed NQL query (after member expansions)
 * @returns {string[]}
 */
function collectSegmentProductSlugs(query) {
    const slugs = [];
    for (const [key, value] of Object.entries(query)) {
        if (key === '$and' || key === '$or') {
            for (const subQuery of value) {
                slugs.push(...collectSegmentProductSlugs(subQuery));
            }
        } else if (key === 'products.slug') {
            if (typeof value === 'string') {
                slugs.push(value);
            } else if (value && Array.isArray(value.$in)) {
                slugs.push(...value.$in);
            }
        }
    }
    return slugs;
}

/**
 * Whether the audience matched by a member segment can read a post's gated
 * content. Emails are rendered per audience segment rather than per member,
 * so there is no member to hand to checkPostAccess — instead we rebuild the
 * member the segment describes (status + the tiers it names) and reuse
 * checkPostAccess, keeping email and web gating from drifting apart. Mixed
 * audiences get the least-privileged member's view: a paid segment naming no
 * tiers cannot read a tier-restricted post.
 *
 * @param {object} post - A post object ({visibility, tiers})
 * @param {string} segment - An NQL member filter
 * @returns {AccessFlag}
 */
function checkSegmentPostAccess(post, segment) {
    let nqlQuery;
    let parsedQuery;
    try {
        nqlQuery = nql(segment, {expansions: MEMBER_NQL_EXPANSIONS, transformer: rejectUnknownKeys});
        parsedQuery = nqlQuery.parse();
    } catch (error) {
        // segments arrive free-form from the API — unparseable ones get the
        // paywall, not a 500
        return BLOCK_ACCESS;
    }

    // a segment with only unknown keys parses to an empty query which would
    // match every member — block, matching checkGatedBlockAccess semantics
    if (Object.keys(parsedQuery).length === 0) {
        return BLOCK_ACCESS;
    }

    // a candidate only counts when it matches the segment — 'status:free'
    // must never be evaluated as the paid member
    const slugs = collectSegmentProductSlugs(parsedQuery);
    const candidateMembers = [
        {status: 'free', products: []},
        {status: 'paid', products: slugs.map(slug => ({slug}))}
    ];
    // an OR of tiers matches members holding any one of them, so each named
    // tier must grant access on its own
    for (const slug of slugs) {
        candidateMembers.push({status: 'paid', products: [{slug}]});
    }

    // least privilege: every member the segment matches must have access —
    // a mixed segment like 'status:free,status:-free' gets the free view
    const matchingMembers = candidateMembers.filter(member => nqlQuery.queryJSON(member));
    if (matchingMembers.length === 0) {
        return BLOCK_ACCESS;
    }
    return matchingMembers.every(member => checkPostAccess(post, member));
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
    checkSegmentPostAccess,
    checkGatedBlockAccess,
    PERMIT_ACCESS,
    BLOCK_ACCESS
};
