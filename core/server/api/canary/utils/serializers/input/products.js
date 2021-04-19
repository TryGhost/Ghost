module.exports = {
    all(_apiConfig, frame) {
        if (!frame.options.withRelated) {
            return;
        }

        frame.options.withRelated = frame.options.withRelated.map((relation) => {
            if (relation === 'stripe_prices') {
                return 'stripePrices';
            }
            return relation;
        });
    },

    add(_apiConfig, frame) {
        frame.data = frame.data.products[0];
    },

    edit(_apiConfig, frame) {
        frame.data = frame.data.products[0];
    }
};
