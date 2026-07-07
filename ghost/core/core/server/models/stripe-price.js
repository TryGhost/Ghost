module.exports = function (ghostBookshelf) {
    const StripePrice = ghostBookshelf.Model.extend({
        tableName: 'stripe_prices',

        stripeProduct() {
            return this.belongsTo('StripeProduct', 'stripe_product_id', 'stripe_product_id');
        }
    });

    const StripePrices = ghostBookshelf.Collection.extend({
        model: StripePrice
    });

    return {
        StripePrice: ghostBookshelf.model('StripePrice', StripePrice),
        StripePrices: ghostBookshelf.collection('StripePrices', StripePrices)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
