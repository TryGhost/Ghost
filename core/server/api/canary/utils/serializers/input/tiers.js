module.exports = {
    all(_apiConfig, frame) {
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
            frame.data = frame.data.products[0];
            return;
        }
        frame.data = frame.data.tiers[0];
    },

    edit(_apiConfig, frame) {
        if (frame.data.products) {
            frame.data = frame.data.products[0];
            return;
        }
        frame.data = frame.data.tiers[0];
    }
};
