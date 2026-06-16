interface GiftLinkModel {
    toJSON?: () => Record<string, unknown>;
    [key: string]: unknown;
}

interface SerializedGiftLink {
    id: unknown;
    post_id: unknown;
    token: unknown;
    status: unknown;
    redeemed_count: unknown;
    last_redeemed_at: unknown;
    created_at: unknown;
    updated_at: unknown;
}

interface Frame {
    response?: unknown;
}

/**
 * Serializes a GiftLink for the admin API. The shareable URL is intentionally
 * NOT built here: the admin already holds the site URL (config) and each post's
 * slug, so surfaces compose `${siteUrl}/g/${slug}/?key=${token}&utm_campaign=gift-link`
 * client-side. That keeps this serializer free of the URL-service (and avoids a
 * dependency on the in-memory URL map, which isn't populated in admin-only contexts).
 *
 * @param {object|null} model - a GiftLink bookshelf model, or null
 * @returns {object|null}
 */
function serialize(model: GiftLinkModel | null): SerializedGiftLink | null {
    if (!model) {
        return null;
    }

    const json = typeof model.toJSON === 'function' ? model.toJSON() : model;

    return {
        id: json.id,
        post_id: json.post_id,
        token: json.token,
        status: json.status,
        redeemed_count: json.redeemed_count,
        last_redeemed_at: json.last_redeemed_at,
        created_at: json.created_at,
        updated_at: json.updated_at
    };
}

// module.exports required - using `export` causes the module to fail to register
// with the web framework as it's loaded via require()
module.exports = {
    read(model: GiftLinkModel | null, apiConfig: unknown, frame: Frame) {
        const link = serialize(model);
        frame.response = {gift_links: link ? [link] : []};
    },
    ensure(model: GiftLinkModel | null, apiConfig: unknown, frame: Frame) {
        frame.response = {gift_links: [serialize(model)]};
    },
    reset(model: GiftLinkModel | null, apiConfig: unknown, frame: Frame) {
        frame.response = {gift_links: [serialize(model)]};
    },
    resetAll(data: {count: number}, apiConfig: unknown, frame: Frame) {
        frame.response = {gift_links: {reset: data.count}};
    }
};
