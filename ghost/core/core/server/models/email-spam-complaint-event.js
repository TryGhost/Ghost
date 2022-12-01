const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const EmailSpamComplaintEvent = ghostBookshelf.Model.extend({
    tableName: 'email_spam_complaint_events',

    filterRelations: function filterRelations() {
        return {
            email: {
                // Mongo-knex doesn't support belongsTo relations
                tableName: 'emails',
                tableNameAs: 'email',
                type: 'manyToMany',
                joinTable: 'email_spam_complaint_events',
                joinFrom: 'id',
                joinTo: 'email_id'
            }
        };
    },

    email() {
        return this.belongsTo('Email', 'email_id');
    },

    member() {
        return this.belongsTo('Member', 'member_id');
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({
            message: 'Cannot edit EmailSpamComplaintEvent'
        });
    },

    async destroy() {
        throw new errors.IncorrectUsageError({
            message: 'Cannot destroy EmailSpamComplaintEvent'
        });
    }
});

module.exports = {
    EmailSpamComplaintEvent: ghostBookshelf.model('EmailSpamComplaintEvent', EmailSpamComplaintEvent)
};
