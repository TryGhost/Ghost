import errors from '@tryghost/errors';

const ghostBookshelf = require('./base');

const GiftDeliveryModel = ghostBookshelf.Model.extend({
    tableName: 'gift_deliveries',
    hasTimestamps: false,

    defaults: {
        status: 'pending'
    },

    gift() {
        return this.belongsTo('Gift', 'gift_id', 'id');
    }
}, {
    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy GiftDelivery'});
    }
});

export const GiftDelivery = ghostBookshelf.model('GiftDelivery', GiftDeliveryModel);
