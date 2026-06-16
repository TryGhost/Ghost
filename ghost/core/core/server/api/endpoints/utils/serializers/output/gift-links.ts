import type {GiftLink} from '../../../../../services/gift-links/gift-link';

interface Frame {
    response?: unknown;
}

/**
 * Field allow-list for the admin API. The shareable URL is intentionally not
 * built here: the admin already has the site URL and each post's slug, so
 * surfaces compose `${siteUrl}/g/${slug}/?key=${token}&utm_campaign=gift-link`
 * client-side. That keeps this off the URL service (whose in-memory map isn't
 * populated in admin-only contexts).
 */
function serialize(link: GiftLink | null): GiftLink | null {
    if (!link) {
        return null;
    }

    return {
        id: link.id,
        post_id: link.post_id,
        token: link.token,
        status: link.status,
        redeemed_count: link.redeemed_count,
        last_redeemed_at: link.last_redeemed_at,
        created_at: link.created_at,
        updated_at: link.updated_at
    };
}

// module.exports required - using `export` causes the module to fail to register
// with the web framework as it's loaded via require()
module.exports = {
    read(link: GiftLink | null, apiConfig: unknown, frame: Frame) {
        const serialized = serialize(link);
        frame.response = {gift_links: serialized ? [serialized] : []};
    },
    upsert(link: GiftLink | null, apiConfig: unknown, frame: Frame) {
        frame.response = {gift_links: [serialize(link)]};
    },
    reset(link: GiftLink | null, apiConfig: unknown, frame: Frame) {
        frame.response = {gift_links: [serialize(link)]};
    },
    resetAll(data: {count: number}, apiConfig: unknown, frame: Frame) {
        frame.response = {gift_links: {reset: data.count}};
    }
};
