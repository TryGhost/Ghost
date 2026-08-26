const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const Gift = ghostBookshelf.Model.extend({
    tableName: 'gifts',
    hasTimestamps: false,
    defaults() {
        return {
            checkout_started_at: new Date()
        };
    },

    buyer() {
        return this.belongsTo('Member', 'buyer_member_id', 'id');
    },

    redeemer() {
        return this.belongsTo('Member', 'redeemer_member_id', 'id');
    },

    tier() {
        return this.belongsTo('Product', 'tier_id', 'id');
    },

    delivery() {
        return this.hasOne('GiftDelivery', 'gift_id', 'id');
    }
}, {
    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy Gift'});
    }
});

module.exports = {
    Gift: ghostBookshelf.model('Gift', Gift)
};
