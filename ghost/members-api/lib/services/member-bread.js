const moment = require('moment');

module.exports = class MemberBREADService {
    /**
     * @param {object} deps
     * @param {import('../repositories/member')} deps.memberRepository
     */
    constructor({memberRepository}) {
        this._memberRepository = memberRepository;
    }

    async read(data, options = {}) {
        const defaultWithRelated = [
            'labels',
            'stripeSubscriptions',
            'stripeSubscriptions.customer',
            'stripeSubscriptions.stripePrice',
            'stripeSubscriptions.stripePrice.stripeProduct',
            'products'
        ];

        const withRelated = new Set((options.withRelated || []).concat(defaultWithRelated));

        if (!withRelated.has('productEvents')) {
            withRelated.add('productEvents');
        }

        if (withRelated.has('email_recipients')) {
            withRelated.add('email_recipients.email');
        }

        const model = await this._memberRepository.get(data, {
            ...options,
            withRelated: Array.from(withRelated)
        });

        if (!model) {
            return null;
        }

        const member = model.toJSON(options);

        if (!member.products || !Array.isArray(member.products)) {
            return member;
        }

        const subscriptionProducts = member.subscriptions.map(sub => sub.price.product.product_id);
        for (const product of member.products) {
            if (!subscriptionProducts.includes(product.id)) {
                const productAddEvent = member.productEvents.find(event => event.product_id === product.id);
                let startDate;
                if (!productAddEvent || productAddEvent.action !== 'added') {
                    startDate = moment();
                } else {
                    startDate = moment(productAddEvent.created_at);
                }
                member.subscriptions.push({
                    id: '',
                    customer: {
                        id: '',
                        name: member.name,
                        email: member.email
                    },
                    plan: {
                        id: '',
                        nickname: 'Complimentary',
                        interval: 'year',
                        currency: 'USD',
                        amount: 0
                    },
                    status: 'active',
                    start_date: startDate,
                    default_payment_card_last4: '****',
                    cancel_at_period_end: false,
                    cancellation_reason: null,
                    current_period_end: moment(startDate).add(1, 'year'),
                    price: {
                        id: '',
                        price_id: '',
                        nickname: 'Complimentary',
                        amount: 0,
                        interval: 'year',
                        type: 'recurring',
                        currency: 'USD',
                        product: {
                            id: '',
                            product_id: product.id
                        }
                    }
                });
            }
        }

        return member;
    }
};
