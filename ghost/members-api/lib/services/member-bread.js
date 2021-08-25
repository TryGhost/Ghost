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
            'stripeSubscriptions.stripePrice.stripeProduct'
        ];

        const withRelated = new Set((options.withRelated || []).concat(defaultWithRelated));

        if (withRelated.has('email_recipients')) {
            withRelated.add('email_recipients.email');
        }

        const model = await this._memberRepository.get(data, {
            ...options,
            withRelated: Array.from(withRelated)
        });

        const member = model.toJSON(options);

        return member;
    }
};
