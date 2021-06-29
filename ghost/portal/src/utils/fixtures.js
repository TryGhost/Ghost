const prices = [
    {
        id: '6086d2c776909b1a2382369a',
        stripe_price_id: '7d6c89c0289ca1731226e86b95b5a162085b8561ca0d10d3a4f03afd3e3e6ba6',
        stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d',
        active: 1,
        nickname: 'Monthly',
        currency: 'usd',
        amount: 500,
        type: 'recurring',
        interval: 'month'
    },
    {
        id: '6086eff0823dd7240afc8083',
        stripe_price_id: 'price_1IkXgCFToJelIqAsTP3V1paQ',
        stripe_product_id: 'prod_JNGGBrrogUXcoM',
        active: 1,
        nickname: 'Yearly',
        currency: 'usd',
        amount: 5000,
        type: 'recurring',
        interval: 'year'
    }
];

const products = [
    {
        id: 'product_1',
        name: 'Gold',
        description: 'A bit longer description',
        monthlyPrice: {
            id: '6085adc776909b1a2382369a',
            stripe_price_id: '7d6c89c0289ca1731226e86b95b5a162085b8561ca0d10d3a4f03afd3e3e6ba6',
            stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d',
            active: 1,
            nickname: 'Monthly',
            currency: 'usd',
            amount: 2000,
            type: 'recurring',
            interval: 'month'
        },
        yearlyPrice: {
            id: '6086eff0823dd7345afc8083',
            stripe_price_id: 'price_1IkXgCFToJelIqAsTP3V1paQ',
            stripe_product_id: 'prod_JNGGBrrogUXcoM',
            active: 1,
            nickname: 'Yearly',
            currency: 'usd',
            amount: 20000,
            type: 'recurring',
            interval: 'year'
        }
        // benefits: [
        //     {
        //         id: 'a1',
        //         name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla nec maximus odio'
        //     },
        //     {
        //         id: 'a2',
        //         name: 'Aliquam nec condimentum libero. In in turpis quis nibh faucibus bibendum mollis et elit'
        //     },
        //     {
        //         id: 'a3',
        //         name: 'Nullam hendrerit accumsan facilisis'
        //     },
        //     {
        //         id: 'a4',
        //         name: 'Vivamus vel elit lectus'
        //     },
        //     {
        //         id: 'a5',
        //         name: 'Maecenas tempus cursus metus'
        //     }
        // ]
    },
    {
        id: 'product_2',
        name: 'Silver',
        description: 'Access to all members articles and weekly podcast',
        monthlyPrice: {
            id: '6086d2c776909b111182369a',
            stripe_price_id: '7d6c89c0289ca1731226e86b95b5a162085b8561ca0d10d3a4f03afd3e3e6ba6',
            stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d',
            active: 1,
            nickname: 'Monthly',
            currency: 'usd',
            amount: 1200,
            type: 'recurring',
            interval: 'month'
        },
        yearlyPrice: {
            id: '6086eff0823dd72402fc8012',
            stripe_price_id: 'price_1IkXgCFToJelIqAsTP3V1paQ',
            stripe_product_id: 'prod_JNGGBrrogUXcoM',
            active: 1,
            nickname: 'Yearly',
            currency: 'usd',
            amount: 12000,
            type: 'recurring',
            interval: 'year'
        },
        benefits: [
            {
                id: 'b1',
                name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla nec maximus odio'
            },
            {
                id: 'b2',
                name: 'Aliquam nec condimentum libero. In in turpis quis nibh faucibus bibendum mollis et elit'
            },
            {
                id: 'b3',
                name: 'Nullam hendrerit accumsan facilisis'
            },
            {
                id: 'b4',
                name: 'Vivamus vel elit lectus'
            }
        ]
    },
    {
        id: 'product_3',
        name: 'Bronze',
        description: 'Access to all members articles',
        monthlyPrice: {
            id: '6086d2c776909b1a23823622',
            stripe_price_id: '7d6c89c0289ca1731226e86b95b5a162085b8561ca0d10d3a4f03afd3e3e6ba6',
            stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d',
            active: 1,
            nickname: 'Monthly',
            currency: 'usd',
            amount: 700,
            type: 'recurring',
            interval: 'month'
        },
        yearlyPrice: {
            id: '6086eff0823dd7240afc8012',
            stripe_price_id: 'price_1IkXgCFToJelIqAsTP3V1paQ',
            stripe_product_id: 'prod_JNGGBrrogUXcoM',
            active: 1,
            nickname: 'Yearly',
            currency: 'usd',
            amount: 7000,
            type: 'recurring',
            interval: 'year'
        },
        benefits: [
            {
                id: 'c1',
                name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla nec maximus odio'
            },
            {
                id: 'c2',
                name: 'Aliquam nec condimentum libero. In in turpis quis nibh faucibus bibendum mollis et elit'
            },
            {
                id: 'c3',
                name: 'Nullam hendrerit accumsan facilisis'
            }
        ]
    }
];

export const site = {
    title: 'A Ghost site',
    description: 'Thoughts, stories and ideas.',
    logo: 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
    icon: 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
    accent_color: '#45C32E',
    url: 'http://localhost:2368/',
    plans: {
        monthly: 5000,
        yearly: 150000,
        currency: 'USD'
    },
    portal_products: ['product_1', 'product_2', 'product_3'],
    // products: [products[0]],
    products: products,
    prices,
    allow_self_signup: true,
    members_signup_access: 'all',
    free_price_name: 'Free',
    free_price_description: 'Free preview',
    is_stripe_configured: true,
    portal_button: true,
    portal_name: true,
    portal_plans: ['free', 'yearly'],
    portal_button_icon: 'icon-1',
    portal_button_signup_text: 'Subscribe now',
    portal_button_style: 'icon-and-text',
    members_support_address: 'support@example.com'
};

export const member = {
    free: {
        uuid: 'd7d3b1a0-90f4-4b93-a51f-76b56213b535',
        email: 'jamie@example.com',
        name: 'Jamie Larson',
        firstname: 'Jamie',
        // avatar_image: 'https://gravatar.com/avatar/eb0ef27b5faa9528c900170cba4c11dc?s=250&',
        avatar_image: '',
        subscriptions: [],
        paid: false
    },
    paid: {
        uuid: '7dcc8939-3be0-4ac8-a363-96d19f909de6',
        email: 'jamie@example.com',
        name: 'Jamie Larson',
        firstname: 'Jamie',
        // avatar_image: 'https://gravatar.com/avatar/eb0ef27b5faa9528c900170cba4c11dc?s=250&',
        avatar_image: '',
        subscriptions: [{
            id: 'sub_HCLyRzHcGciDWJ',
            customer: {
                id: 'cus_HCLy4Y3eLt50YJ',
                name: null,
                email: 'jamie@example.com'
            },
            plan: {
                id: 'fd43b943666b97640188afb382cca39479de30f799985679dd7a71ad2925ac6c',
                nickname: 'Yearly',
                interval: 'year',
                amount: 7000,
                currency: 'USD'
            },
            price: {
                id: 'price_1IkXgCFToJelIqAsTP3V1paQ',
                price_id: '6086eff0823dd7240afc8012',
                nickname: 'Yearly',
                currency: 'usd',
                amount: 7000,
                type: 'recurring',
                interval: 'year',
                product: {
                    id: 'prod_JNGGBrrogUXcoM',
                    name: 'Main Product',
                    product_id: '6086cd1b27c7d417b4a18eaf'
                }
            },
            status: 'active',
            start_date: '2019-05-01T11:42:40.000Z',
            default_payment_card_last4: '4242',
            cancel_at_period_end: false,
            current_period_end: '2021-06-05T11:42:40.000Z'
        }],
        paid: true
    },
    complimentary: {
        uuid: '67906ee2-c80f-4b61-9c9b-6b98c5d3a195',
        email: 'jamie@example.com',
        name: 'Jamie Larson',
        firstname: 'Jamie',
        // avatar_image: 'https://gravatar.com/avatar/76a4c5450dbb6fde8a293a811622aa6f?s=250&d=blank',
        subscribed: true,
        subscriptions: [{
            id: 'sub_HxAis4368CZIuX',
            customer: {
                id: 'cus_HxAiVNQ8C3MdAN',
                name: null,
                email: 'jamie@example.com'
            },
            plan: {
                id: 'd46f4d6de40f9bb47c86b8c9abb8285182f0b10f3ac05b5ba8633417ecac2746',
                nickname: 'Complimentary',
                amount: 0,
                interval: 'year',
                currency: 'USD'
            },
            price: {
                price_id: '6086eff0823dd7240afc8083',
                nickname: 'Complimentary',
                amount: 0,
                interval: 'year',
                type: 'recurring',
                currency: 'USD',
                product: {
                    id: 'prod_JNGGBrrogUXcoM',
                    name: 'Main Product',
                    product_id: '6086cd1b27c7d417b4a18eaf'
                }
            },
            status: 'active',
            start_date: '2020-09-03T11:12:37.000Z',
            default_payment_card_last4: null,
            cancel_at_period_end: false,
            current_period_end: '2021-09-03T11:12:37.000Z'
        }],
        paid: true
    },
    preview: {
        uuid: '7dcc8939-3be0-4ac8-a363-96d19f909de6',
        email: 'jamie@example.com',
        name: 'Jamie Larson',
        firstname: 'Jamie',
        // avatar_image: 'https://gravatar.com/avatar/eb0ef27b5faa9528c900170cba4c11dc?s=250&',
        avatar_image: '',
        subscriptions: [{
            id: 'sub_HCLyRzHcGciDWJ',
            customer: {
                id: 'cus_HCLy4Y3eLt50YJ',
                name: null,
                email: 'jamie@example.com'
            },
            plan: {
                id: 'fd43b943666b97640188afb382cca39479de30f799985679dd7a71ad2925ac6c',
                nickname: 'Yearly',
                interval: 'year',
                amount: 500,
                currency: 'USD'
            },
            price: {
                price_id: '6086ead8070218227791fe4f',
                id: 'price_1IkXLAFToJelIqAseQdK4WSU',
                nickname: 'Yearly',
                currency: 'usd',
                amount: 1500,
                type: 'recurring',
                interval: 'month',
                product: {
                    id: 'prod_JNGGBrrogUXcoM',
                    name: 'Main Product',
                    product_id: '6086cd1b27c7d417b4a18eaf'
                }
            },
            status: 'active',
            start_date: '2019-05-01T11:42:40.000Z',
            default_payment_card_last4: '4242',
            cancel_at_period_end: false,
            current_period_end: '2021-06-05T11:42:40.000Z'
        }],
        paid: true
    }
};

export const testSite = {
    ...site,
    products: products?.[0] ? [products[0]] : [],
    allow_self_signup: true,
    portal_plans: ['free', 'monthly', 'yearly']
};
