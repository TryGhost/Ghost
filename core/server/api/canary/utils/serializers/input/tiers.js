const localUtils = require('../../index');

const forceActiveFilter = (frame) => {
    if (frame.options.filter) {
        frame.options.filter = `(${frame.options.filter})+active:true`;
    } else {
        frame.options.filter = 'active:true';
    }
};

function convertTierInput(input) {
    const converted = {
        id: input.id,
        name: input.name,
        description: input.description,
        slug: input.slug,
        active: input.active,
        type: input.type,
        welcome_page_url: input.welcome_page_url,
        created_at: input.created_at,
        updated_at: input.updated_at,
        visibility: input.visibility
    };

    if (input.monthly_price && input.currency) {
        converted.monthly_price = {
            amount: input.monthly_price,
            currency: input.currency
        };
    }

    if (input.yearly_price && input.currency) {
        converted.yearly_price = {
            amount: input.yearly_price,
            currency: input.currency
        };
    }

    if (input.benefits) {
        converted.benefits = input.benefits.map(name => ({name}));
    }

    return converted;
}

module.exports = {
    all(_apiConfig, frame) {
        if (localUtils.isContentAPI(frame)) {
            // CASE: content api can only have active tiers
            forceActiveFilter(frame);

            // CASE: content api includes these by default
            const defaultRelations = ['monthly_price', 'yearly_price', 'benefits'];
            if (!frame.options.withRelated) {
                frame.options.withRelated = defaultRelations;
            } else {
                for (const relation of defaultRelations) {
                    if (!frame.options.withRelated.includes(relation)) {
                        frame.options.withRelated.push(relation);
                    }
                }
            }
        }

        if (!frame.options.withRelated) {
            return;
        }
        frame.options.withRelated = frame.options.withRelated.map((relation) => {
            if (relation === 'stripe_prices') {
                return 'stripePrices';
            }
            if (relation === 'monthly_price') {
                return 'monthlyPrice';
            }
            if (relation === 'yearly_price') {
                return 'yearlyPrice';
            }
            return relation;
        });
    },

    add(_apiConfig, frame) {
        if (frame.data.products) {
            frame.data = convertTierInput(frame.data.products[0]);
            return;
        }
        frame.data = convertTierInput(frame.data.tiers[0]);
    },

    edit(_apiConfig, frame) {
        if (frame.data.products) {
            frame.data = convertTierInput(frame.data.products[0]);
            return;
        }
        frame.data = convertTierInput(frame.data.tiers[0]);
    }
};
