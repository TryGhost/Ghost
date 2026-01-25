const ghostBookshelf = require('./base');

const AutomatedEmailRecipient = ghostBookshelf.Model.extend({
    tableName: 'automated_email_recipients',
    hasTimestamps: true,

    automatedEmail() {
        return this.belongsTo('AutomatedEmail', 'automated_email_id');
    },
    member() {
        return this.belongsTo('Member', 'member_id');
    }
});

const AutomatedEmailRecipients = ghostBookshelf.Collection.extend({
    model: AutomatedEmailRecipient
});

module.exports = {
    AutomatedEmailRecipient: ghostBookshelf.model('AutomatedEmailRecipient', AutomatedEmailRecipient),
    AutomatedEmailRecipients: ghostBookshelf.collection('AutomatedEmailRecipients', AutomatedEmailRecipients)
};
