export const site = {
    title: 'Ghost Site',
    description: 'Thoughts, stories and ideas.',
    logo: 'https://pbs.twimg.com/profile_images/1111773508231667713/mf2N0uqc_400x400.png',
    accent_color: '#AB19E4',
    url: 'http://localhost:2368/',
    plans: {
        monthly: 12,
        yearly: 110,
        currency: 'USD',
        currency_symbol: '$'
    },
    allow_self_signup: true,
    is_stripe_configured: true,
    portal_button: true,
    portal_name: true,
    portal_plans: ['free', 'monthly', 'yearly'],
    portal_button_icon: 'https://raw.githubusercontent.com/TryGhost/members.js/master/src/images/icons/user.svg',
    portal_button_signup_text: 'Subscribe Now for free access to everything',
    portal_button_style: 'icon-and-text'
};

export const member = {
    free: {
        uuid: 'd7d3b1a0-90f4-4b93-a51f-76b56213b535',
        email: 'member@example.com',
        name: 'Example Member',
        firstname: null,
        avatar_image: '',
        subscriptions: [],
        paid: false
    },
    paid: {
        uuid: '7dcc8939-3be0-4ac8-a363-96d19f909de6',
        email: 'paidmember+@example.com',
        name: 'Paid Member',
        firstname: 'Member',
        avatar_image: 'https://gravatar.com/avatar/eb0ef27b5faa9528c900170cba4c11dc?s=250&d=blank',
        subscriptions: [{
            id: 'sub_HCLyRzHcGciDWJ',
            customer: {
                id: 'cus_HCLy4Y3eLt50YJ',
                name: null,
                email: 'paidmember+@example.com'
            },
            plan: {
                id: 'fd43b943666b97640188afb382cca39479de30f799985679dd7a71ad2925ac6c',
                nickname: 'Monthly',
                interval: 'month',
                amount: 1200,
                currency: 'USD',
                currency_symbol: '$'
            },
            status: 'active',
            start_date: '2019-05-01T11:42:40.000Z',
            default_payment_card_last4: '4242',
            cancel_at_period_end: false,
            current_period_end: '2019-06-01T11:42:40.000Z'
        }],
        paid: true
    }
};
