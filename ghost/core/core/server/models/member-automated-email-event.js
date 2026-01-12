const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberAutomatedEmailEvent = ghostBookshelf.Model.extend({
    tableName: 'members_automated_emails_events',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    automatedEmail() {
        return this.belongsTo('AutomatedEmail', 'automated_email_id', 'id');
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit MemberAutomatedEmailEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberAutomatedEmailEvent'});
    }
});

module.exports = {
    MemberAutomatedEmailEvent: ghostBookshelf.model('MemberAutomatedEmailEvent', MemberAutomatedEmailEvent)
};

