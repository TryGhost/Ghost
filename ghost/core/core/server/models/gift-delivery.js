const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const GiftDelivery = ghostBookshelf.Model.extend({
    tableName: 'gift_deliveries',
    hasTimestamps: false,

    defaults: {
        status: 'pending',
        attempts: 0,
        outcome: 'unknown',
        outcome_at_ms: 0
    },

    gift() {
        return this.belongsTo('Gift', 'gift_id', 'id');
    }
}, {
    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy GiftDelivery'});
    }
});

module.exports = {
    GiftDelivery: ghostBookshelf.model('GiftDelivery', GiftDelivery)
};
