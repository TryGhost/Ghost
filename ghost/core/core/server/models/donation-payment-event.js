module.exports = function (ghostBookshelf) {
    const errors = require('@tryghost/errors');

    const DonationPaymentEvent = ghostBookshelf.Model.extend({
        tableName: 'donation_payment_events',

        member() {
            return this.belongsTo('Member', 'member_id', 'id');
        },

        postAttribution() {
            return this.belongsTo('Post', 'attribution_id', 'id');
        },

        userAttribution() {
            return this.belongsTo('User', 'attribution_id', 'id');
        },

        tagAttribution() {
            return this.belongsTo('Tag', 'attribution_id', 'id');
        }
    }, {
        async edit() {
            throw new errors.IncorrectUsageError({message: 'Cannot edit DonationPaymentEvent'});
        },

        async destroy() {
            throw new errors.IncorrectUsageError({message: 'Cannot destroy DonationPaymentEvent'});
        }
    });

    return {
        DonationPaymentEvent: ghostBookshelf.model('DonationPaymentEvent', DonationPaymentEvent)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
