const ghostBookshelf = require('./base');
const _ = require('lodash');

const Product = ghostBookshelf.Model.extend({
    tableName: 'products',

    defaults: {
        active: true,
        visibility: 'none'
    },

    relationships: ['benefits'],

    relationshipBelongsTo: {
        benefits: 'benefits'
    },

    applyCustomQuery() {
        this.query((qb) => {
            qb.leftJoin('stripe_prices', 'products.monthly_price_id', 'stripe_prices.id');
        });
    },

    async onSaving(model, _attr, options) {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (model.get('name')) {
            model.set('name', model.get('name').trim());
        }

        if (model.hasChanged('slug') || !model.get('slug')) {
            const slug = model.get('slug') || model.get('name');

            if (slug) {
                const cleanSlug = await ghostBookshelf.Model.generateSlug(Product, slug, {
                    transacting: options.transacting
                });

                model.set({slug: cleanSlug});
            }
        }

        let benefitsToSave = [];

        if (_.isUndefined(this.get('benefits'))) {
            this.unset('benefits');
            return;
        }

        // CASE: detect lowercase/uppercase label slugs
        if (!_.isUndefined(this.get('benefits')) && !_.isNull(this.get('benefits'))) {
            benefitsToSave = [];

            //  and deduplicate upper/lowercase tags
            _.each(this.get('benefits'), function each(item) {
                item.name = item.name && item.name.trim();
                for (let i = 0; i < benefitsToSave.length; i = i + 1) {
                    if (benefitsToSave[i].name && item.name && benefitsToSave[i].name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) {
                        return;
                    }
                }

                benefitsToSave.push(item);
            });
        }

        const existingBenefits = await ghostBookshelf.model('Benefit').findAll(Object.assign({
            columns: ['id', 'name']
        }, _.pick(options, 'transacting')));

        benefitsToSave.forEach((benefitToSave) => {
            const existingBenefitModel = existingBenefits.find((existingBenefit) => {
                return benefitToSave.name.toLowerCase() === existingBenefit.get('name').toLowerCase();
            });
            if (existingBenefitModel) {
                benefitToSave.name = existingBenefitModel.get('name');
            }
        });

        model.set('benefits', benefitsToSave);
    },

    /**
     * The base model keeps only the columns, which are defined in the schema.
     * We have to add the relations on top, otherwise bookshelf-relations
     * has no access to the nested relations, which should be updated.
     */
    permittedAttributes: function permittedAttributes() {
        let filteredKeys = ghostBookshelf.Model.prototype.permittedAttributes.apply(this, arguments);

        this.relationships.forEach((key) => {
            filteredKeys.push(key);
        });

        return filteredKeys;
    },

    benefits() {
        return this.belongsToMany('Benefit', 'products_benefits', 'product_id', 'benefit_id')
            .withPivot('sort_order')
            .query('orderBy', 'sort_order', 'ASC')
            .query((qb) => {
                // avoids bookshelf adding a `DISTINCT` to the query
                // we know the result set will already be unique and DISTINCT hurts query performance
                qb.columns('benefits.*');
            });
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
}, {
    orderDefaultRaw() {
        return 'stripe_prices.amount asc';
    }
});

const Products = ghostBookshelf.Collection.extend({
    model: Product
});

module.exports = {
    Product: ghostBookshelf.model('Product', Product),
    Products: ghostBookshelf.collection('Products', Products)
};
