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
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'customer' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, attrs, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
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
