/* eslint-disable no-unused-vars*/
import {getFreeProduct, getMemberData, getOfferData, getPriceData, getProductData, getSiteData, getSubscriptionData, getTestSite} from './fixtures-generator';

export const transformTierFixture = [
    getFreeProduct({
        name: 'Free',
        description: 'Free tier description',
        numOfBenefits: 2
    })
    ,
    getProductData({
        name: 'Bronze',
        // description: 'Access to all members articles',
        description: '',
        monthlyPrice: getPriceData({
            interval: 'month',
            amount: 700
        }),
        yearlyPrice: getPriceData({
            interval: 'year',
            amount: 7000
        }),
        numOfBenefits: 3
    })
];

export const singleSiteTier = [
    getFreeProduct({
        name: 'Free',
        description: 'Free tier description',
        numOfBenefits: 0
    })
    ,
    getProductData({
        name: 'Bronze',
        // description: 'Access to all members articles',
        description: '',
        monthlyPrice: getPriceData({
            interval: 'month',
            amount: 700
        }),
        yearlyPrice: getPriceData({
            interval: 'year',
            amount: 7000
        }),
        numOfBenefits: 2
    })
];

const multipleSiteTiers = [
    ...singleSiteTier,
    getProductData({
        name: 'Silver',
        description: 'Access to all members articles and weekly podcast',
        monthlyPrice: getPriceData({
            interval: 'month',
            amount: 1200
        }),
        yearlyPrice: getPriceData({
            interval: 'year',
            amount: 12000
        }),
        numOfBenefits: 3
    }),
    getProductData({
        name: 'Friends of the Blueprint',
        description: 'Get access to everything and lock in early adopter pricing for life + listen to my podcast',
        monthlyPrice: getPriceData({
            interval: 'month',
            amount: 18000
        }),
        yearlyPrice: getPriceData({
            interval: 'year',
            amount: 17000
        }),
        numOfBenefits: 4
    })
];

const baseSingleTierSite = getSiteData({
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
    products: singleSiteTier,
    portalProducts: singleSiteTier.filter(p => p.type === 'paid').map(p => p.id),
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
    membersSupportAddress: 'support@example.com'
});

const baseMultiTierSite = getSiteData({
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
    products: multipleSiteTiers,
    portalProducts: multipleSiteTiers.filter(p => p.type === 'paid').map(p => p.id),
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
    membersSupportAddress: 'support@example.com'
});

export const site = {
    singleTier: {
        basic: baseSingleTierSite,
        inviteOnly: {
            ...baseSingleTierSite,
            portal_plans: []
        },
        onlyFreePlan: {
            ...baseSingleTierSite,
            portal_plans: ['free']
        },
        onlyPaidPlan: {
            ...baseSingleTierSite,
            portal_plans: ['monthly', 'yearly']
        },
        withoutName: {
            ...baseSingleTierSite,
            portal_name: false
        }
    },
    multipleTiers: {
        basic: baseMultiTierSite,
        onlyFreePlan: {
            ...baseMultiTierSite,
            portal_plans: ['free']
        },
        withoutName: {
            ...baseMultiTierSite,
            portal_name: false
        }
    }
};

export const offer = getOfferData({
    tierId: singleSiteTier.find(p => p.type === 'paid')?.id
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
    altFree: getMemberData({
        name: 'Jimmie Larson',
        email: 'jimmie@example.com',
        firstname: 'Jimmie',
        subscriptions: [],
        paid: false,
        avatarImage: '',
        subscribed: true
    }),
    suppressed: getMemberData({
        name: 'Jamie Larson',
        email: 'jamie@example.com',
        firstname: 'Jamie',
        subscriptions: [],
        paid: false,
        avatarImage: '',
        subscribed: true,
        email_suppression: {
            suppressed: true,
            info: {
                reason: 'spam',
                timestamp: '2022-11-23T09:54:06.210Z'
            }
        }
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
    paidWithCanceledSubscription: getMemberData({
        paid: true,
        subscriptions: [
            getSubscriptionData({
                status: 'canceled',
                currency: 'USD',
                interval: 'year',
                amount: 5000,
                cardLast4: '4242',
                startDate: '2021-10-05T03:18:30.000Z',
                currentPeriodEnd: '2022-10-05T03:18:30.000Z',
                cancelAtPeriodEnd: false
            }),
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
/* eslint-enable no-unused-vars*/

