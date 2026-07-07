module.exports = function (ghostBookshelf) {
    const errors = require('@tryghost/errors');
    const tpl = require('@tryghost/tpl');

    const messages = {
        cannotPerformAction: 'Cannot {action} MemberProductEvent'
    };

    const MemberProductEvent = ghostBookshelf.Model.extend({
        tableName: 'members_product_events',

        member() {
            return this.belongsTo('Member', 'member_id', 'id');
        },

        product() {
            return this.belongsTo('Product', 'product_id', 'id');
        }

    }, {
        async edit() {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.cannotPerformAction, 'edit')
            });
        },

        async destroy() {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.cannotPerformAction, 'destroy')
            });
        }
    });

    const MemberProductEvents = ghostBookshelf.Collection.extend({
        model: MemberProductEvent
    });

    return {
        MemberProductEvent: ghostBookshelf.model('MemberProductEvent', MemberProductEvent),
        MemberProductEvents: ghostBookshelf.collection('MemberProductEvents', MemberProductEvents)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
