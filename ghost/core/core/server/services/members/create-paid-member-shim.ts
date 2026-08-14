import logging from '@tryghost/logging';
const models = require('../../models');

interface PaidMemberShim {
    status: 'paid';
    products: Array<{slug: string}>;
}

/**
 * Build a stand-in "all active paid tiers" member for content gating — NOT a real
 * member. It carries only the `status` and `products` that
 * `contentGating.checkPostAccess` / `checkGatedBlockAccess` read, letting previews
 * (`member_status=paid`) and gift-link reads reveal gated content without a
 * logged-in member. Single source of truth for this security-sensitive grant.
 */
export async function createPaidMemberShim(): Promise<PaidMemberShim> {
    let products: Array<{slug: string}> = [];
    try {
        const paidProducts = await models.Product.findAll({status: 'active', type: 'paid'});
        products = paidProducts.map((product: {get(key: string): string}) => ({slug: product.get('slug')}));
    } catch (error) {
        // Fall back to no tiers rather than failing the render — still grants
        // status:paid/members content, just not tier-specific blocks.
        logging.error('Failed to build paid member shim tiers:', error);
    }

    return {
        status: 'paid',
        products
    };
}
