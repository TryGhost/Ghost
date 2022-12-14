const ghostBookshelf = require('./base');

const EmailRecipient = ghostBookshelf.Model.extend({
    tableName: 'email_recipients',
    hasTimestamps: false,
    
    filterRelations: function filterRelations() {
        return {
            email: {
                // Mongo-knex doesn't support belongsTo relations
                tableName: 'emails',
                tableNameAs: 'email',
                type: 'manyToMany',
                joinTable: 'email_recipients',
                joinFrom: 'id',
                joinTo: 'email_id'
            }
        };
    },

    email() {
        return this.belongsTo('Email', 'email_id');
    },
    emailBatch() {
        return this.belongsTo('EmailBatch', 'batch_id');
    },
    member() {
        return this.belongsTo('Member', 'member_id');
    }
});

const EmailRecipients = ghostBookshelf.Collection.extend({
    model: EmailRecipient
});

module.exports = {
    EmailRecipient: ghostBookshelf.model('EmailRecipient', EmailRecipient),
    EmailRecipients: ghostBookshelf.collection('EmailRecipients', EmailRecipients)
};
