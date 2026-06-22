const models = require('../../models');
const logging = require('@tryghost/logging');

/**
 * Synthesize a minimal "all active paid tiers" member for content gating.
 *
 * This is NOT a real member — it carries only the `status` and `products` that
 * `contentGating.checkPostAccess` / `checkGatedBlockAccess` read, so a caller
 * can render gated content as if served to a paying subscriber without there
 * being a logged-in member. Used by post previews (`member_status=paid`) and by
 * the gift-links reader path (`/g/`), which is why it lives here as the single
 * source of truth for this security-sensitive grant.
 *
 * @returns {Promise<{status: 'paid', products: Array<{slug: string}>}>}
 */
module.exports = async function synthesizePaidMember() {
    let products = [];
    try {
        const paidProducts = await models.Product.findAll({status: 'active', type: 'paid'});
        products = paidProducts.map(product => ({slug: product.get('slug')}));
    } catch (error) {
        // Don't fail the render on a tier lookup error — fall back to no tiers
        // (which still grants `status:paid` / `members` content, just not
        // tier-specific blocks).
        logging.error('Failed to synthesize paid member tiers:', error);
    }

    return {
        status: 'paid',
        products
    };
};
