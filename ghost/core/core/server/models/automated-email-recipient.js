const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const AutomatedEmailRecipient = ghostBookshelf.Model.extend({
    tableName: 'automated_email_recipients',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    automatedEmail() {
        return this.belongsTo('AutomatedEmail', 'automated_email_id', 'id');
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit AutomatedEmailRecipient'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy AutomatedEmailRecipient'});
    }
});

module.exports = {
    AutomatedEmailRecipient: ghostBookshelf.model('AutomatedEmailRecipient', AutomatedEmailRecipient)
};
