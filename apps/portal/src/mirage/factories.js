import { Factory, trait } from 'miragejs';

export const siteFactory = Factory.extend({
    title: 'The Blueprint',
    description: 'Thoughts, stories and ideas.',
    logo: 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
    icon: 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
    accent_color: '#45C32E',
    url: 'https://portal.localhost',
    portal_button: true,
    portal_name: true,
    portal_plans: ['free', 'monthly', 'yearly'],
    portal_button_icon: 'icon-1',
    portal_button_signup_text: 'Subscribe now',
    portal_button_style: 'icon-and-text',
    members_signup_access: 'all',
    members_support_address: 'support@example.com',
    free_price_name: 'Free',
    free_price_description: 'Free preview',
    is_stripe_configured: true,
    allow_self_signup: true,
    recommendations_enabled: false,
    recommendations: [],

    // Traits for different configurations
    singleTier: trait({
        // Will be populated with single tier products
    }),

    multipleTiers: trait({
        // Will be populated with multiple tier products
    }),

    withoutName: trait({
        portal_name: false,
    }),

    withoutStripe: trait({
        is_stripe_configured: false,
    }),

    onlyFreePlan: trait({
        portal_plans: ['free'],
    }),

    onlyPaidPlan: trait({
        portal_plans: ['monthly', 'yearly'],
    }),

    membersInviteOnly: trait({
        members_signup_access: 'invite',
    }),

    paidMembersOnly: trait({
        members_signup_access: 'paid',
    }),

    membersDisabled: trait({
        members_signup_access: 'none',
    }),

    withRecommendations: trait({
        recommendations_enabled: true,
        recommendations: [
            { title: 'Recommendation 1', url: 'https://recommendation-1.org' },
            { title: 'Recommendation 2', url: 'https://recommendation-2.org' }
        ],
    }),
});

export const memberFactory = Factory.extend({
    name: 'Jamie Larson',
    email: 'jamie@example.com',
    firstname: 'Jamie',
    paid: false,
    subscribed: true,
    avatar_image: '',
    enable_comment_notifications: true,
    status: 'free',
    newsletters: [],
    subscriptions: [],

    // Member type traits
    free: trait({
        paid: false,
        status: 'free',
        subscriptions: [],
    }),

    paid: trait({
        paid: true,
        status: 'paid',
        // Note: Subscriptions will be created separately and associated
        afterCreate(member, server) {
            const subscription = server.create('subscription', { member });
            member.subscriptions = [subscription];
            member.save();
        },
    }),

    complimentary: trait({
        paid: true,
        status: 'comped',
        subscriptions: [],
    }),

    suppressed: trait({
        email_suppression: {
            suppressed: true,
            info: {
                reason: 'spam',
                timestamp: '2022-11-23T09:54:06.210Z'
            }
        },
    }),

    altFree: trait({
        name: 'Jimmie Larson',
        email: 'jimmie@example.com',
        firstname: 'Jimmie',
    }),
});

export const productFactory = Factory.extend({
    name: 'Bronze',
    description: '',
    type: 'paid',
    active: true,
    visibility: 'public',
    welcome_page_url: null,
    created_at: '2021-10-05T03:18:30.000Z',
    updated_at: '2021-10-05T03:18:30.000Z',
    monthly_price: null, // Will be set via relationships
    yearly_price: null, // Will be set via relationships
    benefits: [
        { name: 'Access to all members articles' },
        { name: 'Weekly newsletter' },
        { name: 'Community access' }
    ],

    // Product type traits
    free: trait({
        name: 'Free',
        type: 'free',
        description: 'Free tier description',
        benefits: [
            { name: 'Access to free articles' },
            { name: 'Community access' }
        ],
    }),

    bronze: trait({
        name: 'Bronze',
        monthly_price: {
            id: 'price_bronze_monthly',
            amount: 700,
            currency: 'USD',
            interval: 'month',
        },
        yearly_price: {
            id: 'price_bronze_yearly',
            amount: 7000,
            currency: 'USD',
            interval: 'year',
        },
    }),

    silver: trait({
        name: 'Silver',
        description: 'Access to all members articles and weekly podcast',
        monthly_price: {
            id: 'price_silver_monthly',
            amount: 1200,
            currency: 'USD',
            interval: 'month',
        },
        yearly_price: {
            id: 'price_silver_yearly',
            amount: 12000,
            currency: 'USD',
            interval: 'year',
        },
        benefits: [
            { name: 'Access to all members articles' },
            { name: 'Weekly newsletter' },
            { name: 'Weekly podcast' },
            { name: 'Community access' }
        ],
    }),

    premium: trait({
        name: 'Friends of the Blueprint',
        description: 'Get access to everything and lock in early adopter pricing for life + listen to my podcast',
        monthly_price: {
            id: 'price_premium_monthly',
            amount: 18000,
            currency: 'USD',
            interval: 'month',
        },
        yearly_price: {
            id: 'price_premium_yearly',
            amount: 17000,
            currency: 'USD',
            interval: 'year',
        },
        benefits: [
            { name: 'Access to all members articles' },
            { name: 'Weekly newsletter' },
            { name: 'Weekly podcast' },
            { name: 'Premium community access' },
            { name: 'Monthly video calls' }
        ],
    }),
});

export const priceFactory = Factory.extend({
    currency: 'USD',
    amount: 500,
    interval: 'month',
    nickname: null,
    active: true,
    type: 'recurring',
});

export const subscriptionFactory = Factory.extend({
    id: 'sub_test123',
    status: 'active',
    currency: 'USD',
    interval: 'year',
    amount: 5000,
    card_last4: '4242',
    start_date: '2021-10-05T03:18:30.000Z',
    current_period_end: '2022-10-05T03:18:30.000Z',
    cancel_at_period_end: false,
    offer: null,
    price_id: null,
});

export const offerFactory = Factory.extend({
    id: '61fa22bd0cbecc7d423d20b3',
    display_title: 'Black Friday Special',
    display_description: 'Get 20% off for the first year',
    type: 'percent',
    amount: 20,
    duration: 'once',
    duration_in_months: null,
    cadence: 'month',
    currency: 'USD',
    status: 'active',
    redemption_count: 0,
    // tier relationship will be set when creating offers
});

export const newsletterFactory = Factory.extend({
    id: 'weekly',
    name: 'Weekly Rundown',
    description: 'Best of last week',
    subscribe_on_signup: true,
    visibility: 'members',
    sort_order: 1,

    daily: trait({
        id: 'daily',
        name: 'Daily Brief',
        description: 'One email every day',
        subscribe_on_signup: false,
        visibility: 'public',
        sort_order: 2,
    }),
});