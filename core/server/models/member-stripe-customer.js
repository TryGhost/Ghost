const _ = require('lodash');
const ghostBookshelf = require('./base');

const MemberStripeCustomer = ghostBookshelf.Model.extend({
    tableName: 'members_stripe_customers',

    relationships: ['subscriptions'],

    relationshipBelongsTo: {
        subscriptions: 'members_stripe_customers_subscriptions'
    },

    subscriptions() {
        return this.hasMany('StripeCustomerSubscription', 'customer_id', 'customer_id');
    },

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    }
}, {
    async upsert(data, unfilteredOptions) {
        const customerId = data.customer_id;
        const model = await this.findOne({customer_id: customerId}, unfilteredOptions);
        if (model) {
            return this.edit(data, Object.assign({}, unfilteredOptions, {
                id: model.id
            }));
        }
        return this.add(data, unfilteredOptions);
    },

    async bulkAdd(data, unfilteredOptions = {}) {
        if (!unfilteredOptions.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                return this.bulkAdd(data, Object.assign({transacting}, unfilteredOptions));
            });
        }
        const result = {
            successful: 0,
            unsuccessful: 0,
            errors: []
        };

        const CHUNK_SIZE = 100;

        for (const chunk of _.chunk(data, CHUNK_SIZE)) {
            try {
                await ghostBookshelf.knex(this.prototype.tableName).insert(chunk);
                result.successful += chunk.length;
            } catch (err) {
                result.unsuccessful += chunk.length;
                result.errors.push(err);
            }
        }
        return result;
    },

    add(data, unfilteredOptions = {}) {
        if (!unfilteredOptions.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                return this.add(data, Object.assign({transacting}, unfilteredOptions));
            });
        }
        return ghostBookshelf.Model.add.call(this, data, unfilteredOptions);
    },

    edit(data, unfilteredOptions = {}) {
        if (!unfilteredOptions.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                return this.edit(data, Object.assign({transacting}, unfilteredOptions));
            });
        }
        return ghostBookshelf.Model.edit.call(this, data, unfilteredOptions);
    },

    destroy(unfilteredOptions = {}) {
        if (!unfilteredOptions.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                return this.destroy(Object.assign({transacting}, unfilteredOptions));
            });
        }
        return ghostBookshelf.Model.destroy.call(this, unfilteredOptions);
    }
});

module.exports = {
    MemberStripeCustomer: ghostBookshelf.model('MemberStripeCustomer', MemberStripeCustomer)
};
