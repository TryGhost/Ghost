const ghostBookshelf = require('./base');

const Product = ghostBookshelf.Model.extend({
    tableName: 'products',

    async onSaving(model, _attr, options) {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (model.get('name')) {
            model.set('name', model.get('name').trim());
        }

        if (model.hasChanged('slug') || !model.get('slug')) {
            const slug = model.get('slug') || model.get('name');

            if (!slug) {
                return;
            }

            const cleanSlug = await ghostBookshelf.Model.generateSlug(Product, slug, {
                transacting: options.transacting
            });

            return model.set({slug: cleanSlug});
        }
    },

    monthlyPrice() {
        return this.belongsTo('StripePrice', 'monthly_price_id', 'id');
    },

    yearlyPrice() {
        return this.belongsTo('StripePrice', 'yearly_price_id', 'id');
    },

    stripeProducts() {
        return this.hasMany('StripeProduct', 'product_id', 'id');
    },

    stripePrices() {
        return this.belongsToMany(
            'StripePrice',
            'stripe_products',
            'product_id',
            'stripe_product_id',
            'id',
            'stripe_product_id'
        );
    },

    members() {
        return this.belongsToMany('Member', 'members_products', 'product_id', 'member_id');
    }
});

const Products = ghostBookshelf.Collection.extend({
    model: Product
});

module.exports = {
    Product: ghostBookshelf.model('Product', Product),
    Products: ghostBookshelf.collection('Products', Products)
};
