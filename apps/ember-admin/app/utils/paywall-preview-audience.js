/**
 * Names who will land on the paywall rather than the full post, across
 * whichever surfaces the post is going out on. The caller composes the
 * sentence, so "paywall" can carry a preview of the author's own card.
 *
 * Returns null when nobody does - a send that only reaches members who can read
 * the whole thing has no preview to explain, and saying so anyway reads as a
 * warning about a problem that isn't there.
 *
 * @param {object} post - the post being published
 * @param {string} recipientFilter - the NQL filter for who's receiving the email
 * @param {object} surfaces
 * @param {boolean} [surfaces.willPublish] - going out on the site
 * @param {boolean} [surfaces.willEmail] - going out as a newsletter
 * @returns {string|null} lowercase, e.g. 'free members and public visitors'
 */
export default function paywallPreviewAudience(post, recipientFilter, {willPublish = false, willEmail = false} = {}) {
    const visibility = post?.visibility;

    if (visibility !== 'paid' && visibility !== 'tiers') {
        return null;
    }

    const filter = recipientFilter || '';
    // 'status:-free' doesn't contain 'status:free', so these don't collide
    const includesFree = filter.includes('status:free');
    const includesPaid = filter.includes('status:-free');

    // lowercase because these now sit mid-sentence more often than they start
    // one - callers that need a capital use the `capitalize-first-letter`
    // helper, which is safer than every caller lowercasing a tier name by
    // accident
    let memberGroup = 'free members';

    if (visibility === 'tiers') {
        const tierNames = (post.tiers || []).map(tier => tier.name).filter(Boolean);
        memberGroup = tierNames.length
            ? `members outside ${tierNames.join(', ')}`
            : 'members outside the selected tiers';
    }

    // Over email a paywall only exists where a card puts one: without one there
    // is nowhere to cut the post, so everyone the publisher picked receives the
    // whole thing whatever the post's access says. The site is the opposite -
    // access alone withholds the post, card or no card.
    const emailSplitsAtCard = willEmail && !!post.hasPaywallCard;
    const emailReaches = emailSplitsAtCard && (visibility === 'paid' ? includesFree : includesFree || includesPaid);

    const groups = [];

    if (willPublish || emailReaches) {
        groups.push(memberGroup);
    }

    if (willPublish) {
        groups.push('public visitors');
    }

    if (!groups.length) {
        return null;
    }

    return groups.join(' and ');
}
