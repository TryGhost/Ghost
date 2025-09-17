/**
 * Test helper functions for creating common Mirage scenarios
 */

export function createSingleTierSite(server) {
    const freeProduct = server.create('product', 'free');
    const paidProduct = server.create('product', 'bronze');

    const site = server.create('site', 'singleTier', {
        products: [freeProduct, paidProduct],
        portal_products: [paidProduct.id],
    });

    return { site, products: [freeProduct, paidProduct] };
}

export function createMultiTierSite(server) {
    const freeProduct = server.create('product', 'free');
    const bronzeProduct = server.create('product', 'bronze');
    const silverProduct = server.create('product', 'silver');
    const premiumProduct = server.create('product', 'premium');

    const products = [freeProduct, bronzeProduct, silverProduct, premiumProduct];
    const paidProducts = [bronzeProduct, silverProduct, premiumProduct];

    const site = server.create('site', 'multipleTiers', {
        products: products,
        portal_products: paidProducts.map(p => p.id),
    });

    return { site, products };
}

// Scenario builders that encapsulate common test setups
export const scenarios = {
    freeMemberSingleTier: (server) => {
        const { site, products } = createSingleTierSite(server);
        const member = server.create('member', 'free');
        return { site, member, products };
    },

    freeMemberMultiTier: (server) => {
        const { site, products } = createMultiTierSite(server);
        const member = server.create('member', 'free');
        return { site, member, products };
    },

    paidMemberSingleTier: (server) => {
        const { site, products } = createSingleTierSite(server);
        const member = server.create('member', 'paid');
        return { site, member, products };
    },

    paidMemberMultiTier: (server) => {
        const { site, products } = createMultiTierSite(server);
        const member = server.create('member', 'paid');
        return { site, member, products };
    },

    singleTierWithoutName: (server) => {
        const { site, products } = createSingleTierSite(server);
        site.update({ portal_name: false });
        const member = server.create('member', 'free');
        return { site, member, products };
    },

    singleTierOnlyFreePlan: (server) => {
        const { site, products } = createSingleTierSite(server);
        site.update({ portal_plans: ['free'] });
        const member = server.create('member', 'free');
        return { site, member, products };
    },

    singleTierOnlyPaidPlan: (server) => {
        const { site, products } = createSingleTierSite(server);
        site.update({ portal_plans: ['monthly', 'yearly'] });
        const member = server.create('member', 'free');
        return { site, member, products };
    },

    multiTierOnlyFreePlan: (server) => {
        const { site, products } = createMultiTierSite(server);
        site.update({ portal_plans: ['free'] });
        const member = server.create('member', 'free');
        return { site, member, products };
    },

    multiTierOnlyPaidPlans: (server) => {
        const { site, products } = createMultiTierSite(server);
        site.update({ portal_plans: ['monthly', 'yearly'] });
        const member = server.create('member', 'free');
        return { site, member, products };
    },

    paidMembersOnly: (server) => {
        const { site, products } = createSingleTierSite(server);
        site.update({ members_signup_access: 'paid' });
        const member = server.create('member', 'free');
        return { site, member, products };
    },

    stripeNotConfigured: (server) => {
        const { site, products } = createSingleTierSite(server);
        site.update({ is_stripe_configured: false });
        const member = server.create('member', 'free');
        return { site, member, products };
    },

    offerScenario: (server, offerId = '61fa22bd0cbecc7d423d20b3') => {
        const { site, products } = createSingleTierSite(server);
        const offer = server.create('offer', {
            id: offerId,
            tier: products[1] // Link to paid product
        });
        const member = server.create('member', 'free');
        return { site, member, products, offer };
    },

    suppressedMember: (server) => {
        const { site, products } = createSingleTierSite(server);
        const member = server.create('member', 'suppressed');
        return { site, member, products };
    },

    memberWithNewsletter: (server) => {
        const { site, products } = createSingleTierSite(server);
        const newsletter1 = server.create('newsletter');
        const newsletter2 = server.create('newsletter', 'daily');
        const member = server.create('member', 'free', {
            newsletters: [newsletter1, newsletter2]
        });
        return { site, member, products, newsletters: [newsletter1, newsletter2] };
    },
};

/**
 * Helper to setup server state for different test scenarios
 */
export function setupServerState(server, scenario, options = {}) {
    if (typeof scenario === 'string' && scenarios[scenario]) {
        return scenarios[scenario](server, options);
    } else if (typeof scenario === 'function') {
        return scenario(server, options);
    } else {
        throw new Error(`Unknown scenario: ${scenario}`);
    }
}