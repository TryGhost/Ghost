/* eslint-disable camelcase */

export const sites = {
    singleProduct: getSiteData({
        products: getProductsData({numOfProducts: 1})
    })
};

export function objectId() {
    const timestamp = (new Date().getTime() / 1000 | 0).toString(16);
    return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
        return (Math.random() * 16 | 0).toString(16);
    }).toLowerCase();
}

export function getSiteData({
    title = 'The Blueprint',
    description = 'Thoughts, stories and ideas.',
    logo = 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
    icon = 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
    url = 'https://portal.localhost',
    plans = {
        monthly: 5000,
        yearly: 150000,
        currency: 'USD'
    },
    products = getProductsData({numOfProducts: 1}),
    portalProducts = products.map(p => p.id),
    accentColor: accent_color = '#45C32E',
    portalPlans: portal_plans = ['free', 'monthly', 'yearly'],
    allowSelfSignup: allow_self_signup = true,
    membersSignupAccess: members_signup_access = 'all',
    freePriceName: free_price_name = 'Free',
    freePriceDescription: free_price_description = 'Free preview',
    isStripeConfigured: is_stripe_configured = true,
    portalButton: portal_button = true,
    portalName: portal_name = true,
    portalButtonIcon: portal_button_icon = 'icon-1',
    portalButtonSignupText: portal_button_signup_text = 'Subscribe now',
    portalButtonStyle: portal_button_style = 'icon-and-text',
    membersSupportAddress: members_support_address = 'support@example.com',
    editorDefaultEmailRecipients: editor_default_email_recipients = 'visibility',
    newsletters = [],
    posts = getPostsData(),
    commentsEnabled,
    recommendations = [],
    recommendationsEnabled
} = {}) {
    return {
        title,
        description,
        logo,
        icon,
        accent_color,
        url,
        plans,
        products,
        portal_products: portalProducts,
        allow_self_signup,
        members_signup_access,
        free_price_name,
        free_price_description,
        is_stripe_configured,
        portal_button,
        portal_name,
        portal_plans,
        portal_button_icon,
        portal_button_signup_text,
        portal_button_style,
        members_support_address,
        comments_enabled: commentsEnabled !== 'off',
        newsletters,
        recommendations,
        recommendations_enabled: !!recommendationsEnabled,
        editor_default_email_recipients,
        posts
    };
}

export function getOfferData({
    name = 'Black Friday',
    code = 'black-friday',
    displayTitle = 'Black Friday Sale!',
    displayDescription = 'Special deal for Black Friday. Subscribe now for only $15 per month and get additional benefits like accessing our podcast.',
    type = 'percent',
    cadence = 'month',
    amount = 50,
    duration = 'repeating',
    durationInMonths = null,
    currencyRestriction = false,
    currency = null,
    status = 'active',
    tierId = '',
    tierName = 'Basic'
} = {}) {
    return {
        id: `offer_${objectId()}`,
        name,
        code,
        display_title: displayTitle,
        display_description: displayDescription,
        type,
        cadence,
        amount,
        duration,
        duration_in_months: durationInMonths,
        currency_restriction: currencyRestriction,
        currency,
        status,
        tier: {
            id: `${tierId}`,
            name: tierName
        }
    };
}

export function getMemberData({
    name = 'Jamie Larson',
    email = 'jamie@example.com',
    firstname = 'Jamie',
    subscriptions = [],
    paid = false,
    avatarImage: avatar_image = '',
    subscribed = true,
    email_suppression = {
        suppressed: false,
        info: null
    },
    newsletters = []
} = {}) {
    return {
        uuid: `member_${objectId()}`,
        email,
        name,
        firstname,
        paid,
        subscribed,
        avatar_image,
        subscriptions,
        email_suppression,
        newsletters
    };
}

export function getNewsletterData({
    id = `${objectId()}`,
    uuid = `${objectId()}`,
    name = 'Newsletter',
    description = 'Newsletter description',
    slug = 'newsletter',
    sender_email = null,
    subscribe_on_signup = true,
    visibility = 'members',
    sort_order = 0
}) {
    return {
        id,
        uuid,
        name,
        description,
        slug,
        sender_email,
        subscribe_on_signup,
        visibility,
        sort_order
    };
}

export function getNewslettersData({numOfNewsletters = 3} = {}) {
    const newsletters = [];
    for (let i = 0; i < numOfNewsletters; i++) {
        newsletters.push(getNewsletterData({
            name: `Newsletter ${i + 1}`,
            description: `Newsletter ${i + 1} description`
        }));
    }
    return newsletters.slice(0, numOfNewsletters);
}

export function getPostsData({numOfPosts = 3} = {}) {
    const posts = [];
    for (let i = 0; i < numOfPosts; i++) {
        posts.push(getPostData({
            title: `Post ${i + 1}`,
            slug: `post-${i + 1}`
        }));
    }
    return posts.slice(0, numOfPosts);
}

export function getPostData({
    id = `post_${objectId()}`,
    title = 'Post',
    excerpt = 'Post excerpt',
    slug = 'post',
    featured = false
} = {}) {
    return {
        id,
        title,
        excerpt,
        slug,
        featured
    };
}

export function getProductsData({numOfProducts = 3} = {}) {
    const products = [
        getProductData({
            name: 'Bronze',
            description: 'Access to all members articles',
            monthlyPrice: getPriceData({
                interval: 'month',
                amount: 700
            }),
            yearlyPrice: getPriceData({
                interval: 'year',
                amount: 7000
            }),
            numOfBenefits: 2
        }),
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
    const paidProducts = products.slice(0, numOfProducts);
    const freeProduct = getFreeProduct({});
    return [
        ...paidProducts,
        freeProduct
    ];
}

export function getProductData({
    type = 'paid',
    name = 'Basic',
    description = '',
    id = `product_${objectId()}`,
    monthlyPrice = getPriceData(),
    yearlyPrice = getPriceData({interval: 'year'}),
    numOfBenefits = 2,
    trialDays = null
}) {
    return {
        id: id,
        name: name,
        description,
        monthlyPrice: type === 'free' ? null : monthlyPrice,
        yearlyPrice: type === 'free' ? null : yearlyPrice,
        type: type,
        benefits: getBenefits({numOfBenefits}),
        trial_days: trialDays
    };
}

export function getFreeProduct({
    name = 'Free tier',
    description = 'Free tier description',
    id = `product_${objectId()}`,
    numOfBenefits = 2
}) {
    return {
        id,
        name: name,
        type: 'free',
        description,
        benefits: getBenefits({numOfBenefits})
    };
}

export function getBenefits({numOfBenefits}) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100);

    const beenfits = [
        getBenefitData({name: `Limited early adopter pricing #${random}-${timestamp}`}),
        getBenefitData({name: `Latest gear reviews #${random}-${timestamp}`}),
        getBenefitData({name: `Weekly email newsletter #${random}-${timestamp}`}),
        getBenefitData({name: `Listen to my podcast #$${random}-${timestamp}`})
    ];
    return beenfits.slice(0, numOfBenefits);
}

export function getBenefitData({
    id = `benefit_${objectId()}`,
    name = 'Benefit'
}) {
    return {
        id,
        name
    };
}

export function getPriceData({
    interval = 'month',
    amount = (interval === 'month' ? 500 : 5000),
    nickname = interval === 'month' ? 'Monthly' : 'Yearly',
    description = null,
    currency = 'usd',
    active = true,
    id = `price_${objectId()}`
} = {}) {
    return {
        id: id,
        active,
        nickname,
        currency,
        amount,
        interval,
        description,
        stripe_price_id: `price_${objectId()}`,
        stripe_product_id: `prod_${objectId()}`,
        type: 'recurring'
    };
}

export function getSubscriptionData({
    id = `sub_${objectId()}`,
    status = 'active',
    currency = 'USD',
    interval = 'year',
    amount = (interval === 'month' ? 500 : 5000),
    nickname = (interval === 'month' ? 'Monthly' : 'Yearly'),
    cardLast4 = '4242',
    offer: localOffer = offer,
    priceId: price_id = `price_${objectId()}`,
    startDate: start_date = '2021-10-05T03:18:30.000Z',
    currentPeriodEnd: current_period_end = '2022-10-05T03:18:30.000Z',
    cancelAtPeriodEnd: cancel_at_period_end = false
} = {}) {
    return {
        id,
        customer: {
            id: `cus_${objectId()}`,
            name: 'Jamie',
            email: 'jamie@example.com'
        },
        plan: {
            id: `price_${objectId()}`,
            nickname,
            amount,
            interval,
            currency
        },
        offer: localOffer,
        status,
        start_date,
        default_payment_card_last4: cardLast4,
        cancel_at_period_end,
        cancellation_reason: null,
        current_period_end,
        price: {
            id: `stripe_price_${objectId()}`,
            price_id,
            nickname,
            amount,
            interval,
            type: 'recurring',
            currency,
            product: {
                id: `stripe_prod_${objectId()}`,
                product_id: `prod_${objectId()}`
            }
        }
    };
}

export function getTestSite() {
    const products = getProductsData({numOfProducts: 1});
    const portalProducts = products.map(p => p.id);
    const portalPlans = ['free', 'monthly', 'yearly'];
    return getSiteData({
        products,
        portalPlans,
        portalProducts
    });
}

export const testSite = getTestSite();

export const site = getSiteData({
    products: [getProductData({numOfBenefits: 2, type: 'free'})]
});

export const offer = getOfferData({
    tierId: site.products[0]?.id
});

export const member = {
    free: getMemberData(),
    paid: getMemberData({
        paid: true,
        subscriptions: [
            getSubscriptionData()
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
export function generateAccountPlanFixture() {
    const products = getProductsData({numOfProducts: 3});
    return {
        site: getSiteData({
            portalProducts: [products[1]]
        }),
        member: member.paid
    };
}

export function basic() {
    const products = getProductsData();
    const siteData = getSiteData({
        products
    });
    const defaultMemberPrice = products?.[0].monthlyPrice;
    const memberData = getMemberData({
        paid: true,
        subscriptions: [
            getSubscriptionData({
                priceId: defaultMemberPrice.id,
                amount: defaultMemberPrice.amount,
                currency: defaultMemberPrice.currency
            })
        ]
    });
    return {
        site: siteData,
        member: memberData
    };
}
