const {BadRequestError} = require('@tryghost/errors');
const localUtils = require('../../index');
const nql = require('@tryghost/nql-lang');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidNQLFilter: 'The NQL filter you passed was invalid.'
};

const forceActiveFilter = (frame) => {
    if (frame.options.filter) {
        frame.options.filter = {
            $and: [
                {
                    active: true
                },
                frame.options.filter
            ]
        };
    } else {
        frame.options.filter = {
            active: true
        };
    }
};

function convertTierInput(input) {
    const converted = Object.assign({}, input);

    if (Reflect.has(converted, 'active')) {
        converted.status = converted.active ? 'active' : 'archived';
        delete converted.active;
    }

    if (Reflect.has(converted, 'welcome_page_url')) {
        converted.welcomePageURL = converted.welcome_page_url;
        delete converted.welcome_page_url;
    }

    if (Reflect.has(converted, 'trial_days')) {
        converted.trialDays = converted.trial_days;
        delete converted.trial_days;
    }

    if (Reflect.has(converted, 'monthly_price')) {
        converted.monthlyPrice = converted.monthly_price;
        delete converted.monthly_price;
    }

    if (Reflect.has(converted, 'yearly_price')) {
        converted.yearlyPrice = converted.yearly_price;
        delete converted.yearly_price;
    }

    return converted;
}

module.exports = {
    all(_apiConfig, frame) {
        if (frame.options.filter) {
            try {
                frame.options.filter = nql.parse(frame.options.filter);
            } catch (err) {
                throw new BadRequestError({
                    message: tpl(messages.invalidNQLFilter)
                });
            }
        } else {
            frame.options.filter = null;
        }

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
