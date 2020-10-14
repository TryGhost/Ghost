const ghostBookshelf = require('./base');

const EmailBatch = ghostBookshelf.Model.extend({
    tableName: 'email_batches',

    defaults() {
        return {
            status: 'pending'
        };
    },

    email() {
        return this.belongsTo('Email', 'email_id');
    },
    recipients() {
        return this.hasMany('EmailRecipient', 'batch_id');
    },
    members() {
        return this.belongsToMany('Member', 'email_recipients', 'batch_id', 'member_id');
    }
});

const EmailBatches = ghostBookshelf.Collection.extend({
    model: EmailBatch
});

module.exports = {
    EmailBatch: ghostBookshelf.model('EmailBatch', EmailBatch),
    EmailBatches: ghostBookshelf.collection('EmailBatches', EmailBatches)
};
