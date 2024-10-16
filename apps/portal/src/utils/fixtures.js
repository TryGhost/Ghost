/* eslint-disable no-unused-vars*/
import {getFreeProduct, getMemberData, getOfferData, getPriceData, getProductData, getSiteData, getSubscriptionData, getTestSite} from './fixtures-generator';

export const testSite = getTestSite();

const products = [
    getFreeProduct({
        name: 'Free',
        description: 'Free tier description which is actually a pretty long description',
        // description: '',
        numOfBenefits: 2
    })
    ,
    getProductData({
        name: 'The Blueprint',
        // description: 'Access to all members articles',
        description: '',
        monthlyPrice: getPriceData({
            interval: 'month',
            amount: 500
        }),
        yearlyPrice: getPriceData({
            interval: 'year',
            amount: 5000
        }),
        numOfBenefits: 3
    })
    ,
    getProductData({
        name: 'Friends of the Blueprint Silver',
        description: 'Access to all members articles and weekly podcast',
        monthlyPrice: getPriceData({
            interval: 'month',
            amount: 1200
        }),
        yearlyPrice: getPriceData({
            interval: 'year',
            amount: 11000
        }),
        numOfBenefits: 4
    })

    // ,
    // getProductData({
    //     name: 'Silver',
    //     description: 'Access to all members articles and weekly podcast',
    //     monthlyPrice: getPriceData({
    //         interval: 'month',
    //         amount: 1200
    //     }),
    //     yearlyPrice: getPriceData({
    //         interval: 'year',
    //         amount: 12000
    //     }),
    //     numOfBenefits: 3
    // })
    //
    // ,
    // getProductData({
    //     name: 'Friends of the Blueprint',
    //     description: 'Get access to everything and lock in early adopter pricing for life + listen to my podcast',
    //     monthlyPrice: getPriceData({
    //         interval: 'month',
    //         amount: 18000
    //     }),
    //     yearlyPrice: getPriceData({
    //         interval: 'year',
    //         amount: 17000
    //     }),
    //     numOfBenefits: 4
    // })
];

export const site = getSiteData({
    title: 'The Blueprint',
    description: 'Thoughts, stories and ideas.',
    logo: 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
    icon: 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
    accentColor: '#45C32E',
    url: 'https://portal.localhost',
    plans: {
        monthly: 5000,
        yearly: 150000,
        currency: 'USD'
    },

    // Simulate pre-multiple-tiers state:
    // products: [products.find(d => d.type === 'paid')],
    // portalProducts: null,

    // Simulate multiple-tiers state:
    products,
    portalProducts: products.map(p => p.id),

    //
    allowSelfSignup: true,
    membersSignupAccess: 'all',
    freePriceName: 'Free',
    freePriceDescription: 'Free preview',
    isStripeConfigured: true,
    portalButton: true,
    portalName: true,
    portalPlans: ['free', 'monthly', 'yearly'],
    portalButtonIcon: 'icon-1',
    portalButtonSignupText: 'Subscribe now',
    portalButtonStyle: 'icon-and-text',
    membersSupportAddress: 'support@example.com',
    commentsEnabled: true,
    newsletters: [
        {
            id: 'weekly',
            name: 'Weekly Rundown',
            description: 'Best of last week',
            subscribe_on_signup: true,
            paid: true
        },
        {
            id: 'daily',
            name: 'Daily Brief',
            description: 'One email every day',
            subscribe_on_signup: false,
            paid: false
        }
    ],
    posts: [
        {
            id: 'post_66aacfe061c94e10eb6e4fc1',
            title: 'Post 1',
            excerpt: 'Post excerpt',
            slug: 'post-1',
            featured: false
        },
        {
            id: 'post_66aacfe04f14b8dbb56c5721',
            title: 'Post 2',
            excerpt: 'Post excerpt',
            slug: 'post-2',
            featured: false
        },
        {
            id: 'post_66aacfe03d609460819af18c',
            title: 'Post 3',
            excerpt: 'Post excerpt',
            slug: 'post-3',
            featured: false
        }
    ]
});

export const offer = getOfferData({
    tierId: site.products[1]?.id
});

export const member = {
    free: getMemberData({
        name: 'Jamie Larson',
        email: 'jamie@example.com',
        firstname: 'Jamie',
        subscriptions: [],
        paid: false,
        avatarImage: '',
        subscribed: true
    }),
    paid: getMemberData({
        paid: true,
        subscriptions: [
            getSubscriptionData({
                status: 'active',
                currency: 'USD',
                interval: 'year',
                amount: 5000,
                cardLast4: '4242',
                startDate: '2021-10-05T03:18:30.000Z',
                currentPeriodEnd: '2022-10-05T03:18:30.000Z',
                cancelAtPeriodEnd: false
            })
        ]
    }),
    complimentary: getMemberData({
        paid: true,
        subscriptions: []
    }),
    complimentaryWithSubscription: getMemberData({
        paid: true,
        subscriptions: [
            getSubscriptionData({
                amount: 0
            })
        ]
    }),
    preview: getMemberData({
        paid: true,
        subscriptions: [
            getSubscriptionData({
                amount: 1500,
                startDate: '2019-05-01T11:42:40.000Z',
                currentPeriodEnd: '2021-06-05T11:42:40.000Z'
            })
        ]
    })
};

export function paidMemberOnTier() {
    if (!products || !products[1]) {
        return null;
    }
    let price = site?.products?.[1].monthlyPrice;
    let updatedMember = getMemberData({
        paid: true,
        subscriptions: [
            getSubscriptionData({
                offer: null,
                priceId: price?.id,
                status: 'active',
                currency: price?.currency,
                interval: price?.interval,
                amount: price?.amount,
                cardLast4: '4242',
                startDate: '2021-10-05T03:18:30.000Z',
                currentPeriodEnd: '2022-10-05T03:18:30.000Z',
                cancelAtPeriodEnd: false
            })
        ]
    });
    return {
        site,
        member: updatedMember
    };
}
/* eslint-enable no-unused-vars*/
